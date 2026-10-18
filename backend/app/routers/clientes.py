"""Rotas de clientes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import constantes as C
from .. import schemas
from ..database import get_db
from ..models import Cliente, Negociacao

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])


def _totais_por_cliente(db: Session) -> dict[int, dict]:
    negociacoes = db.scalars(select(Negociacao)).all()
    totais: dict[int, dict] = {}
    for neg in negociacoes:
        if neg.cliente_id is None:
            continue
        item = totais.setdefault(
            neg.cliente_id,
            {"total_negociacoes": 0, "total_ganho": 0.0, "total_aberto": 0.0, "ultimo_contato": None},
        )
        item["total_negociacoes"] += 1
        valor = float(neg.valor or 0)
        if neg.estagio == "ganho":
            item["total_ganho"] += valor
        elif neg.estagio != "perdido":
            item["total_aberto"] += valor

        referencia = neg.follow_up or (neg.criado_em.date() if neg.criado_em else None)
        if referencia and (item["ultimo_contato"] is None or referencia > item["ultimo_contato"]):
            item["ultimo_contato"] = referencia
    return totais


@router.get("", response_model=list[schemas.ClienteComTotais])
def listar(q: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Cliente).order_by(Cliente.nome)
    if q:
        stmt = stmt.where(func.lower(Cliente.nome).like(f"%{q.lower()}%"))

    clientes = db.scalars(stmt).all()
    totais = _totais_por_cliente(db)

    return [
        schemas.ClienteComTotais(
            **schemas.ClienteOut.model_validate(cliente).model_dump(),
            **totais.get(
                cliente.id,
                {"total_negociacoes": 0, "total_ganho": 0.0, "total_aberto": 0.0, "ultimo_contato": None},
            ),
        )
        for cliente in clientes
    ]


@router.get("/{cliente_id}", response_model=schemas.ClienteComTotais)
def detalhar(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    totais = _totais_por_cliente(db).get(
        cliente_id,
        {"total_negociacoes": 0, "total_ganho": 0.0, "total_aberto": 0.0, "ultimo_contato": None},
    )
    return schemas.ClienteComTotais(
        **schemas.ClienteOut.model_validate(cliente).model_dump(), **totais
    )


@router.post("", response_model=schemas.ClienteOut, status_code=201)
def criar(dados: schemas.ClienteCreate, db: Session = Depends(get_db)):
    cliente = Cliente(**dados.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=schemas.ClienteOut)
def atualizar(cliente_id: int, dados: schemas.ClienteUpdate, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)

    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", status_code=204)
def excluir(cliente_id: int, db: Session = Depends(get_db)):
    """Remove o cliente. As negociações continuam no funil, apenas sem vínculo."""
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    db.delete(cliente)
    db.commit()


@router.get("/{cliente_id}/negociacoes", response_model=list[schemas.NegociacaoOut])
def negociacoes_do_cliente(cliente_id: int, db: Session = Depends(get_db)):
    if db.get(Cliente, cliente_id) is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return db.scalars(
        select(Negociacao).where(Negociacao.cliente_id == cliente_id)
    ).all()


__all__ = ["router", "C"]
