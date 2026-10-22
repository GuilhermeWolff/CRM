"""Modelos do banco de dados."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(160), index=True)
    contato: Mapped[str | None] = mapped_column(String(120))
    whatsapp: Mapped[str | None] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(160))
    segmento: Mapped[str | None] = mapped_column(String(80))
    site: Mapped[str | None] = mapped_column(String(200))
    notas: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Sem cascade de exclusão: apagar um cliente não apaga as negociações dele,
    # apenas desvincula (o histórico financeiro continua no funil).
    negociacoes: Mapped[list[Negociacao]] = relationship(back_populates="cliente")


class Negociacao(Base):
    __tablename__ = "negociacoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(160))
    cliente_id: Mapped[int | None] = mapped_column(
        ForeignKey("clientes.id", ondelete="SET NULL")
    )

    contato: Mapped[str | None] = mapped_column(String(120))
    whatsapp: Mapped[str | None] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(160))

    tipo_site: Mapped[str] = mapped_column(String(60), default="Site Institucional")
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    mensal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Escopo do projeto e condições comerciais
    paginas: Mapped[int] = mapped_column(Integer, default=1)
    extras: Mapped[str | None] = mapped_column(Text)  # ids separados por vírgula
    desconto: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)  # percentual
    entrada: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    parcelas: Mapped[int] = mapped_column(Integer, default=1)
    forma_pagamento: Mapped[str | None] = mapped_column(String(40))

    estagio: Mapped[str] = mapped_column(String(20), default="lead", index=True)
    probabilidade: Mapped[int] = mapped_column(Integer, default=10)
    fonte: Mapped[str | None] = mapped_column(String(60))

    follow_up: Mapped[date | None] = mapped_column(Date)
    prazo_entrega: Mapped[date | None] = mapped_column(Date)

    notas: Mapped[str | None] = mapped_column(Text)
    motivo_perda: Mapped[str | None] = mapped_column(String(200))

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    fechado_em: Mapped[date | None] = mapped_column(Date)

    cliente: Mapped[Cliente | None] = relationship(back_populates="negociacoes")
    atividades: Mapped[list[Atividade]] = relationship(
        back_populates="negociacao",
        cascade="all, delete-orphan",
        order_by="desc(Atividade.criado_em)",
    )
    tarefas: Mapped[list[Tarefa]] = relationship(
        back_populates="negociacao", cascade="all, delete-orphan"
    )

    @property
    def cliente_nome(self) -> str | None:
        return self.cliente.nome if self.cliente else None


class Atividade(Base):
    """Linha do tempo de uma negociação."""

    __tablename__ = "atividades"

    id: Mapped[int] = mapped_column(primary_key=True)
    negociacao_id: Mapped[int] = mapped_column(
        ForeignKey("negociacoes.id", ondelete="CASCADE"), index=True
    )
    texto: Mapped[str] = mapped_column(Text)
    tipo: Mapped[str] = mapped_column(String(30), default="nota")
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    negociacao: Mapped[Negociacao] = relationship(back_populates="atividades")


class Tarefa(Base):
    __tablename__ = "tarefas"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200))
    negociacao_id: Mapped[int | None] = mapped_column(
        ForeignKey("negociacoes.id", ondelete="CASCADE"), index=True
    )
    vencimento: Mapped[date | None] = mapped_column(Date)
    prioridade: Mapped[str] = mapped_column(String(10), default="media")
    concluida: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    concluida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    negociacao: Mapped[Negociacao | None] = relationship(back_populates="tarefas")

    @property
    def negociacao_titulo(self) -> str | None:
        return self.negociacao.titulo if self.negociacao else None


class Servico(Base):
    """Tabela de preços de referência (também usada como atalho no orçamento)."""

    __tablename__ = "servicos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    preco: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    preco_minimo: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    preco_maximo: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    descricao: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


class Configuracao(Base):
    """Configurações do usuário (linha única, id = 1)."""

    __tablename__ = "configuracoes"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    empresa: Mapped[str] = mapped_column(String(120), default="GW Consultoria")
    responsavel: Mapped[str | None] = mapped_column(String(120))
    meta_mensal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=10000)
