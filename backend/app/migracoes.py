"""Ajustes de esquema para bancos que já existiam.

O projeto usa `Base.metadata.create_all` (sem Alembic). O create_all cria
tabelas novas, mas não adiciona colunas em tabelas existentes — por isso as
colunas novas são incluídas aqui, de forma idempotente, na inicialização.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine

COLUNAS: list[tuple[str, str, str]] = [
    ("negociacoes", "paginas", "INTEGER NOT NULL DEFAULT 1"),
    ("negociacoes", "plano", "VARCHAR(20)"),
    ("negociacoes", "extras", "TEXT"),
    ("negociacoes", "desconto", "NUMERIC(5, 2) NOT NULL DEFAULT 0"),
    ("negociacoes", "entrada", "NUMERIC(12, 2) NOT NULL DEFAULT 0"),
    ("negociacoes", "parcelas", "INTEGER NOT NULL DEFAULT 1"),
    ("negociacoes", "forma_pagamento", "VARCHAR(40)"),
    ("servicos", "preco_minimo", "NUMERIC(12, 2)"),
    ("servicos", "preco_maximo", "NUMERIC(12, 2)"),
]


def aplicar(engine: Engine) -> None:
    """Adiciona as colunas que ainda não existem (seguro para rodar sempre)."""
    with engine.begin() as conexao:
        for tabela, coluna, tipo in COLUNAS:
            conexao.execute(
                text(
                    f"ALTER TABLE IF EXISTS {tabela} "
                    f"ADD COLUMN IF NOT EXISTS {coluna} {tipo}"
                )
            )
