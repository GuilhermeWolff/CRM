"""Configurações da aplicação (lidas do arquivo .env)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://postgres:crm_local_dev@127.0.0.1:5432/crm"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    ambiente: str = "dev"


settings = Settings()
