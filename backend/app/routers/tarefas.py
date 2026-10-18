"""Rotas de tarefas e follow-ups."""

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import schemas
from ..database import get_db
from ..models import Negociacao, Tarefa
from ..services import registrar_atividade

router = APIRouter(prefix="/api/tarefas", tags=["Tarefas"])


def _buscar(db: Session, tarefa_id: int) -> Tarefa:
    tarefa = db.scalar(
        select(Tarefa).options(selectinload(Tarefa.negociacao)).where(Tarefa.id == tarefa_id)
    )
    if tarefa is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return tarefa


@router.get("", response_model=list[schemas.TarefaOut])
def listar(
    situacao: str | None = None,
    negociacao_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Tarefa).options(selectinload(Tarefa.negociacao))
    if negociacao_id:
        stmt = stmt.where(Tarefa.negociacao_id == negociacao_id)
    if situacao == "pendentes":
        stmt = stmt.where(Tarefa.concluida.is_(False))
    elif situacao == "concluidas":
        stmt = stmt.where(Tarefa.concluida.is_(True))

    stmt = stmt.order_by(Tarefa.concluida, Tarefa.vencimento.is_(None), Tarefa.vencimento)
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.TarefaOut, status_code=201)
def criar(dados: schemas.TarefaCreate, db: Session = Depends(get_db)):
    if dados.negociacao_id and db.get(Negociacao, dados.negociacao_id) is None:
        raise HTTPException(status_code=404, detail="Negociação não encontrada")

    tarefa = Tarefa(**dados.model_dump())
    db.add(tarefa)
    db.flush()

    if tarefa.negociacao_id:
        venc = tarefa.vencimento.strftime("%d/%m/%Y") if tarefa.vencimento else "sem data"
        registrar_atividade(db, tarefa.negociacao_id, f"Tarefa criada: {tarefa.titulo} ({venc}).", "tarefa")

    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.put("/{tarefa_id}", response_model=schemas.TarefaOut)
def atualizar(tarefa_id: int, dados: schemas.TarefaUpdate, db: Session = Depends(get_db)):
    tarefa = _buscar(db, tarefa_id)
    campos = dados.model_dump(exclude_unset=True)
    concluida_antes = tarefa.concluida

    for campo, valor in campos.items():
        setattr(tarefa, campo, valor)

    if tarefa.concluida and not concluida_antes:
        tarefa.concluida_em = datetime.now(timezone.utc)
    elif not tarefa.concluida:
        tarefa.concluida_em = None

    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.post("/{tarefa_id}/concluir", response_model=schemas.TarefaOut)
def concluir(tarefa_id: int, db: Session = Depends(get_db)):
    tarefa = _buscar(db, tarefa_id)
    tarefa.concluida = not tarefa.concluida
    tarefa.concluida_em = datetime.now(timezone.utc) if tarefa.concluida else None
    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.delete("/{tarefa_id}", status_code=204)
def excluir(tarefa_id: int, db: Session = Depends(get_db)):
    tarefa = _buscar(db, tarefa_id)
    db.delete(tarefa)
    db.commit()


@router.get("/resumo")
def resumo(db: Session = Depends(get_db)) -> dict:
    hoje = date.today()
    tarefas = db.scalars(select(Tarefa)).all()
    pendentes = [t for t in tarefas if not t.concluida]
    return {
        "pendentes": len(pendentes),
        "atrasadas": len([t for t in pendentes if t.vencimento and t.vencimento < hoje]),
        "hoje": len([t for t in pendentes if t.vencimento == hoje]),
        "semana": len(
            [t for t in pendentes if t.vencimento and hoje <= t.vencimento <= hoje.fromordinal(hoje.toordinal() + 7)]
        ),
        "concluidas": len([t for t in tarefas if t.concluida]),
    }
