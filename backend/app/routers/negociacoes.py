"""Rotas de negociações — o coração do funil."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from .. import constantes as C
from .. import schemas
from ..database import get_db
from ..models import Cliente, Negociacao
from ..services import mensagem_negociacao, registrar_atividade, resolver_cliente

router = APIRouter(prefix="/api/negociacoes", tags=["Negociações"])


def _validar_estagio(estagio: str) -> None:
    if estagio not in C.PROB_POR_ESTAGIO:
        raise HTTPException(status_code=422, detail=f"Estágio inválido: {estagio}")


def _buscar(db: Session, negociacao_id: int) -> Negociacao:
    neg = db.scalar(
        select(Negociacao)
        .options(selectinload(Negociacao.cliente))
        .where(Negociacao.id == negociacao_id)
    )
    if neg is None:
        raise HTTPException(status_code=404, detail="Negociação não encontrada")
    return neg


def _aplicar_estagio(neg: Negociacao, estagio: str, sobrescrever_prob: bool = True) -> None:
    neg.estagio = estagio
    if sobrescrever_prob:
        neg.probabilidade = C.PROB_POR_ESTAGIO[estagio]
    if estagio in ("ganho", "perdido"):
        neg.fechado_em = neg.fechado_em or date.today()
    else:
        neg.fechado_em = None


@router.get("", response_model=list[schemas.NegociacaoOut])
def listar(
    q: str | None = None,
    estagio: str | None = None,
    tipo_site: str | None = None,
    fonte: str | None = None,
    cliente_id: int | None = None,
    abertos: bool = False,
    db: Session = Depends(get_db),
):
    stmt = select(Negociacao).options(selectinload(Negociacao.cliente))

    if estagio:
        stmt = stmt.where(Negociacao.estagio == estagio)
    if tipo_site:
        stmt = stmt.where(Negociacao.tipo_site == tipo_site)
    if fonte:
        stmt = stmt.where(Negociacao.fonte == fonte)
    if cliente_id:
        stmt = stmt.where(Negociacao.cliente_id == cliente_id)
    if abertos:
        stmt = stmt.where(Negociacao.estagio.in_(C.ESTAGIOS_ABERTOS))
    if q:
        termo = f"%{q.lower()}%"
        stmt = stmt.outerjoin(Cliente).where(
            or_(
                func.lower(Negociacao.titulo).like(termo),
                func.lower(func.coalesce(Negociacao.contato, "")).like(termo),
                func.lower(func.coalesce(Negociacao.notas, "")).like(termo),
                func.lower(func.coalesce(Cliente.nome, "")).like(termo),
            )
        )

    stmt = stmt.order_by(Negociacao.atualizado_em.desc())
    return db.scalars(stmt).unique().all()


@router.get("/{negociacao_id}", response_model=schemas.NegociacaoDetalhe)
def detalhar(negociacao_id: int, db: Session = Depends(get_db)):
    neg = db.scalar(
        select(Negociacao)
        .options(
            selectinload(Negociacao.cliente),
            selectinload(Negociacao.atividades),
            selectinload(Negociacao.tarefas),
        )
        .where(Negociacao.id == negociacao_id)
    )
    if neg is None:
        raise HTTPException(status_code=404, detail="Negociação não encontrada")
    return neg


@router.post("", response_model=schemas.NegociacaoOut, status_code=201)
def criar(dados: schemas.NegociacaoCreate, db: Session = Depends(get_db)):
    _validar_estagio(dados.estagio)

    try:
        cliente = resolver_cliente(db, dados.cliente_id, dados.cliente_nome)
    except ValueError as erro:
        raise HTTPException(status_code=404, detail=str(erro)) from erro

    titulo = (dados.titulo or "").strip() or (cliente.nome if cliente else "Nova negociação")
    valores = dados.model_dump(
        exclude={"titulo", "cliente_id", "cliente_nome", "segmento", "site"}
    )

    if cliente is not None:
        if dados.segmento:
            cliente.segmento = dados.segmento
        if dados.site:
            cliente.site = dados.site

    neg = Negociacao(titulo=titulo, cliente_id=cliente.id if cliente else None, **valores)
    if dados.probabilidade in (None, 0, 10) and dados.estagio != "lead":
        neg.probabilidade = C.PROB_POR_ESTAGIO[dados.estagio]
    db.add(neg)
    db.flush()

    registrar_atividade(
        db,
        neg.id,
        f"Negociação criada em “{C.NOME_POR_ESTAGIO[dados.estagio]}”.",
        "criacao",
    )

    db.commit()
    db.refresh(neg)
    return neg


@router.put("/{negociacao_id}", response_model=schemas.NegociacaoOut)
def atualizar(
    negociacao_id: int, dados: schemas.NegociacaoUpdate, db: Session = Depends(get_db)
):
    neg = _buscar(db, negociacao_id)
    campos = dados.model_dump(exclude_unset=True)

    # Campos do cadastro do cliente (não são colunas da negociação)
    segmento = campos.pop("segmento", None)
    site = campos.pop("site", None)

    if "cliente_nome" in campos:
        nome = (campos.pop("cliente_nome") or "").strip()
        atual = neg.cliente
        if not nome:
            campos["cliente_id"] = None
        elif atual is not None and atual.nome.strip().lower() == nome.lower():
            campos["cliente_id"] = atual.id
        else:
            existente = db.scalar(
                select(Cliente).where(func.lower(Cliente.nome) == nome.lower())
            )
            if existente is not None:
                campos["cliente_id"] = existente.id
            elif atual is not None:
                # Renomeou o cliente dentro do cadastro da negociação
                atual.nome = nome
                campos["cliente_id"] = atual.id
            else:
                campos["cliente_id"] = resolver_cliente(db, None, nome).id

    if "estagio" in campos:
        _validar_estagio(campos["estagio"])

    if "cliente_id" in campos and campos["cliente_id"]:
        cliente = db.get(Cliente, campos["cliente_id"])
        if cliente is None:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")

    estagio_anterior = neg.estagio

    for campo, valor in campos.items():
        setattr(neg, campo, valor)

    id_cliente = campos.get("cliente_id", neg.cliente_id)
    cliente_final = db.get(Cliente, id_cliente) if id_cliente else None
    if cliente_final is not None:
        if segmento:
            cliente_final.segmento = segmento
        if site:
            cliente_final.site = site

    if "estagio" in campos and campos["estagio"] != estagio_anterior:
        _aplicar_estagio(neg, campos["estagio"], sobrescrever_prob="probabilidade" not in campos)
        registrar_atividade(
            db,
            neg.id,
            f"Estágio: {C.NOME_POR_ESTAGIO[estagio_anterior]} → {C.NOME_POR_ESTAGIO[neg.estagio]}.",
            "estagio",
        )

    db.commit()
    db.refresh(neg)
    return neg


@router.post("/{negociacao_id}/mover", response_model=schemas.NegociacaoOut)
def mover(negociacao_id: int, dados: schemas.MoverEstagio, db: Session = Depends(get_db)):
    neg = _buscar(db, negociacao_id)
    _validar_estagio(dados.estagio)

    if neg.estagio == dados.estagio:
        return neg

    anterior = neg.estagio
    _aplicar_estagio(neg, dados.estagio)

    if dados.estagio == "perdido" and dados.motivo_perda:
        neg.motivo_perda = dados.motivo_perda

    registrar_atividade(
        db,
        neg.id,
        f"Estágio: {C.NOME_POR_ESTAGIO[anterior]} → {C.NOME_POR_ESTAGIO[dados.estagio]}.",
        "estagio",
    )

    db.commit()
    db.refresh(neg)
    return neg


@router.post("/{negociacao_id}/atividades", response_model=schemas.AtividadeOut, status_code=201)
def criar_atividade(
    negociacao_id: int, dados: schemas.AtividadeCreate, db: Session = Depends(get_db)
):
    neg = _buscar(db, negociacao_id)
    atividade = registrar_atividade(db, neg.id, dados.texto.strip(), dados.tipo)
    neg.atualizado_em = func.now()
    db.commit()
    db.refresh(atividade)
    return atividade


@router.get("/{negociacao_id}/mensagem")
def gerar_mensagem(
    negociacao_id: int, tipo: str = "proposta", db: Session = Depends(get_db)
):
    neg = _buscar(db, negociacao_id)
    return {"tipo": tipo, "texto": mensagem_negociacao(neg, tipo)}


@router.delete("/{negociacao_id}", status_code=204)
def excluir(negociacao_id: int, db: Session = Depends(get_db)):
    neg = _buscar(db, negociacao_id)
    db.delete(neg)
    db.commit()
