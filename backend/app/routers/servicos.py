"""Rotas da tabela de preços / serviços."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..models import Servico

router = APIRouter(prefix="/api/servicos", tags=["Serviços"])


@router.get("", response_model=list[schemas.ServicoOut])
def listar(apenas_ativos: bool = False, db: Session = Depends(get_db)):
    stmt = select(Servico).order_by(Servico.nome)
    if apenas_ativos:
        stmt = stmt.where(Servico.ativo.is_(True))
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.ServicoOut, status_code=201)
def criar(dados: schemas.ServicoCreate, db: Session = Depends(get_db)):
    servico = Servico(**dados.model_dump())
    db.add(servico)
    db.commit()
    db.refresh(servico)
    return servico


@router.put("/{servico_id}", response_model=schemas.ServicoOut)
def atualizar(servico_id: int, dados: schemas.ServicoUpdate, db: Session = Depends(get_db)):
    servico = db.get(Servico, servico_id)
    if servico is None:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(servico, campo, valor)
    db.commit()
    db.refresh(servico)
    return servico


@router.delete("/{servico_id}", status_code=204)
def excluir(servico_id: int, db: Session = Depends(get_db)):
    servico = db.get(Servico, servico_id)
    if servico is None:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    db.delete(servico)
    db.commit()
