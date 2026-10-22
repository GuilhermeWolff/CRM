"""API do CRM de negociações de sites.

Rodar em desenvolvimento:
    .venv\\Scripts\\python -m uvicorn app.main:app --reload --port 8000
Documentação interativa: http://127.0.0.1:8000/docs

Em produção o mesmo processo serve a interface compilada (frontend/dist).
"""

import base64
import secrets
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (garante o registro dos modelos)
from .config import settings
from .database import Base, engine
from .migracoes import aplicar as aplicar_migracoes
from .routers import clientes, dashboard, leads, negociacoes, servicos, sistema, tarefas

Base.metadata.create_all(bind=engine)
aplicar_migracoes(engine)

app = FastAPI(
    title="CRM de Projetos Web",
    description="CRM pessoal para organizar negociações de sites: funil, clientes, follow-ups e orçamentos.",
    version="0.1.0",
)

origens = [origem.strip() for origem in settings.cors_origins.split(",") if origem.strip()]
app.add_middleware(
    CORSMiddleware,
    # O endpoint público de leads recebe chamadas de qualquer site.
    allow_origins=["*"] if "*" in origens else origens,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def proteger_crm(request: Request, call_next):
    """Login opcional (HTTP Basic) quando o CRM está publicado na internet.

    Fica desligado enquanto ``CRM_SENHA`` não estiver definida. O envio de
    leads (POST /api/leads) e o health check continuam públicos.
    """
    caminho = request.url.path
    publico = caminho == "/api/health" or (
        caminho == "/api/leads" and request.method in ("POST", "OPTIONS")
    )
    if not settings.senha or publico:
        return await call_next(request)

    autorizacao = request.headers.get("authorization", "")
    if autorizacao.lower().startswith("basic "):
        try:
            usuario, _, senha = (
                base64.b64decode(autorizacao[6:]).decode("utf-8").partition(":")
            )
        except Exception:  # cabeçalho malformado
            usuario = senha = ""
        if secrets.compare_digest(usuario, settings.usuario) and secrets.compare_digest(
            senha, settings.senha
        ):
            return await call_next(request)

    return Response(
        status_code=401,
        content="Acesso restrito",
        headers={"WWW-Authenticate": 'Basic realm="CRM GW Consultoria"'},
    )


for modulo in (negociacoes, clientes, tarefas, servicos, dashboard, sistema, leads):
    app.include_router(modulo.router)


@app.get("/api/health", tags=["Sistema"])
def health() -> dict:
    return {"status": "ok", "ambiente": settings.ambiente}


# --------------------------------------------------------------------------- #
# Interface compilada (produção)
# --------------------------------------------------------------------------- #
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if DIST.is_dir():
    if (DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{caminho:path}", include_in_schema=False)
    def servir_frontend(caminho: str):
        if caminho == "api" or caminho.startswith("api/"):
            raise HTTPException(status_code=404, detail="Rota não encontrada")

        raiz = DIST.resolve()
        arquivo = (DIST / caminho).resolve()
        try:
            arquivo.relative_to(raiz)
        except ValueError:
            return FileResponse(DIST / "index.html")

        if caminho and arquivo.is_file():
            return FileResponse(arquivo)
        # Rotas do React (ex.: /cadastro/14) caem no index.
        return FileResponse(DIST / "index.html")
