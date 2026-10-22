"""Configurações da aplicação (lidas do arquivo .env)."""

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://postgres:crm_local_dev@127.0.0.1:5432/crm"
    # O endpoint público de captação de leads é chamado de fora do CRM.
    cors_origins: str = "*"
    ambiente: str = "dev"

    # Proteção opcional do CRM (HTTP Basic). Deixe a senha vazia no uso local;
    # defina CRM_SENHA ao publicar o sistema na internet.
    usuario: str = Field(
        default="admin", validation_alias=AliasChoices("CRM_USUARIO", "USUARIO")
    )
    senha: str = Field(default="", validation_alias=AliasChoices("CRM_SENHA", "SENHA"))

    @field_validator("database_url", mode="after")
    @classmethod
    def _usar_psycopg(cls, valor: str) -> str:
        """Aceita a URL crua do Render/Neon (postgresql://...)."""
        if valor.startswith("postgres://"):
            return valor.replace("postgres://", "postgresql+psycopg://", 1)
        if valor.startswith("postgresql://"):
            return valor.replace("postgresql://", "postgresql+psycopg://", 1)
        return valor


settings = Settings()
