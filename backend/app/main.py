"""API do CRM de negociações de sites.

Rodar em desenvolvimento:
    .venv\\Scripts\\python -m uvicorn app.main:app --reload --port 8000
Documentação interativa: http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (garante o registro dos modelos)
from .config import settings
from .database import Base, engine
from .routers import clientes, dashboard, negociacoes, servicos, sistema, tarefas

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CRM de Projetos Web",
    description="CRM pessoal para organizar negociações de sites: funil, clientes, follow-ups e orçamentos.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origem.strip() for origem in settings.cors_origins.split(",") if origem.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for modulo in (negociacoes, clientes, tarefas, servicos, dashboard, sistema):
    app.include_router(modulo.router)


@app.get("/api/health", tags=["Sistema"])
def health() -> dict:
    return {"status": "ok", "ambiente": settings.ambiente}
