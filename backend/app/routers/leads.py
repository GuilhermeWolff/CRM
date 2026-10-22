"""Captação de leads por formulários externos (sites e lojas virtuais).

O endpoint ``POST /api/leads`` é público: qualquer site pode enviar contatos
usando a chave de captação do CRM. O restante das rotas (listar, atualizar,
converter e excluir) é interno e fica atrás da autenticação do sistema.
"""

from __future__ import annotations

import html
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import ValidationError
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import constantes as C
from .. import schemas
from ..database import get_db
from ..models import Lead, Negociacao
from ..services import obter_config, registrar_atividade, resolver_cliente

router = APIRouter(prefix="/api", tags=["Leads"])

# Limite simples por IP (em memória) para evitar formulários inundados de spam.
JANELA_SEGUNDOS = 600
LIMITE_ENVIOS = 30
_ENVIOS: dict[str, list[float]] = {}


def _limitar(identificador: str) -> None:
    agora = time.monotonic()
    marcas = [m for m in _ENVIOS.get(identificador, []) if agora - m < JANELA_SEGUNDOS]
    if len(marcas) >= LIMITE_ENVIOS:
        raise HTTPException(
            status_code=429,
            detail="Muitos envios em pouco tempo. Tente novamente em alguns minutos.",
        )
    marcas.append(agora)
    _ENVIOS[identificador] = marcas


def _autorizar(token: str | None, db: Session) -> None:
    config = obter_config(db)
    if not config.token_captura:
        raise HTTPException(status_code=503, detail="Captação de leads não configurada")
    if not token or not secrets.compare_digest(str(token), str(config.token_captura)):
        raise HTTPException(status_code=401, detail="Chave de captação inválida")


def _valor_numerico(valor) -> float | None:
    if valor in (None, ""):
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).replace("R$", "").replace(" ", "").strip()
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        return float(texto)
    except ValueError:
        return None


def _pagina_resposta(titulo: str, mensagem: str, sucesso: bool = True) -> HTMLResponse:
    cor = "#22c55e" if sucesso else "#f87171"
    corpo = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(titulo)}</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: #09090b; color: #fafafa;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; }}
    .caixa {{ max-width: 460px; width: 100%; background: #121215;
      border: 1px solid #27272c; border-radius: 16px; padding: 32px;
      box-shadow: 0 24px 60px -30px rgba(0,0,0,.9); }}
    .marca {{ display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }}
    .logo {{ width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center;
      background: linear-gradient(135deg, #dc2626, #7f1017); font-weight: 800; font-size: 14px; }}
    h1 {{ font-size: 20px; margin: 0 0 10px; }}
    p {{ color: #a1a1aa; line-height: 1.6; margin: 0; }}
    .barra {{ height: 3px; width: 44px; background: {cor}; border-radius: 999px; margin-bottom: 20px; }}
  </style>
</head>
<body>
  <div class="caixa">
    <div class="marca">
      <div class="logo">GW</div>
      <div><strong>GW Consultoria</strong></div>
    </div>
    <div class="barra"></div>
    <h1>{html.escape(titulo)}</h1>
    <p>{html.escape(mensagem)}</p>
  </div>
</body>
</html>"""
    return HTMLResponse(corpo)


def _resposta_lead(
    request: Request,
    entrada: schemas.LeadEntrada | None,
    lead: Lead | None,
    mensagem_erro: str | None = None,
) -> JSONResponse | HTMLResponse:
    quer_html = "application/json" not in (request.headers.get("content-type") or "").lower()
    if quer_html:
        if mensagem_erro:
            return _pagina_resposta("Não foi possível enviar", mensagem_erro, sucesso=False)
        nome = f", {entrada.nome.strip()}" if entrada and entrada.nome.strip() else ""
        return _pagina_resposta(
            "Contato recebido",
            f"Obrigado{nome}! Recebemos seus dados e vamos falar com você em breve.",
        )
    if mensagem_erro:
        return JSONResponse({"ok": False, "erro": mensagem_erro}, status_code=422)
    return JSONResponse(
        {"ok": True, "id": lead.id if lead else None}, status_code=201
    )


@router.post("/leads")
async def capturar_lead(request: Request, db: Session = Depends(get_db)):
    """Endpoint público chamado pelos formulários dos sites.

    Aceita JSON (recomendado) ou formulário HTML tradicional. A chave pode vir
    no cabeçalho ``X-Api-Key``, na query string (``?token=``) ou no corpo.
    """
    _limitar(request.client.host if request.client else "desconhecido")

    conteudo = (request.headers.get("content-type") or "").lower()
    quer_html = "application/json" not in conteudo

    if "application/json" in conteudo:
        try:
            dados = await request.json()
        except Exception:
            return JSONResponse({"ok": False, "erro": "JSON inválido"}, status_code=400)
        if not isinstance(dados, dict):
            return JSONResponse({"ok": False, "erro": "Envie um objeto JSON"}, status_code=400)
    else:
        formulario = await request.form()
        dados = dict(formulario)

    token = (
        request.headers.get("x-api-key")
        or request.query_params.get("token")
        or dados.pop("token", None)
    )
    _autorizar(token, db)

    # Campo escondido: se preenchido, é robô. Respondemos "ok" sem gravar.
    if dados.get("website") or dados.get("_hp"):
        return _resposta_lead(request, None, None)

    dados["valor"] = _valor_numerico(dados.get("valor"))

    try:
        entrada = schemas.LeadEntrada.model_validate(dados)
    except ValidationError as erro:
        primeiro = erro.errors()[0]
        campo = ".".join(str(p) for p in primeiro.get("loc", [])) or "dados"
        mensagem = f"Confira o campo {campo}: {primeiro.get('msg', 'valor inválido')}"
        if quer_html:
            return _pagina_resposta("Não foi possível enviar", mensagem, sucesso=False)
        return JSONResponse({"ok": False, "erro": mensagem}, status_code=422)

    lead = Lead(
        nome=entrada.nome.strip(),
        empresa=(entrada.empresa or "").strip() or None,
        email=(entrada.email or "").strip() or None,
        whatsapp=(entrada.whatsapp or "").strip() or None,
        produto=(entrada.produto or "").strip() or None,
        valor=entrada.valor,
        mensagem=(entrada.mensagem or "").strip() or None,
        origem=(entrada.origem or "Site").strip()[:80],
        pagina=(entrada.pagina or "").strip() or None,
        utm_source=(entrada.utm_source or "").strip() or None,
        utm_medium=(entrada.utm_medium or "").strip() or None,
        utm_campaign=(entrada.utm_campaign or "").strip() or None,
        status="novo",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return _resposta_lead(request, entrada, lead)


@router.get("/leads", response_model=list[schemas.LeadOut])
def listar(
    status: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Lead)
    if status:
        stmt = stmt.where(Lead.status == status)
    if q:
        termo = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Lead.nome).like(termo),
                func.lower(func.coalesce(Lead.empresa, "")).like(termo),
                func.lower(func.coalesce(Lead.email, "")).like(termo),
                func.lower(func.coalesce(Lead.whatsapp, "")).like(termo),
                func.lower(func.coalesce(Lead.produto, "")).like(termo),
                func.lower(func.coalesce(Lead.mensagem, "")).like(termo),
            )
        )
    return db.scalars(stmt.order_by(Lead.criado_em.desc())).all()


@router.put("/leads/{lead_id}", response_model=schemas.LeadOut)
def atualizar(lead_id: int, dados: schemas.LeadUpdate, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    campos = dados.model_dump(exclude_unset=True)
    if "status" in campos:
        if campos["status"] not in C.STATUS_LEAD_IDS:
            raise HTTPException(status_code=422, detail="Situação inválida")
        lead.status = campos["status"]

    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/converter", response_model=schemas.ConversaoLead)
def converter(lead_id: int, db: Session = Depends(get_db)):
    """Cria cliente + negociação a partir do lead (sem duplicar se repetir)."""
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    if lead.negociacao_id:
        negociacao = db.get(Negociacao, lead.negociacao_id)
        if negociacao is not None:
            return schemas.ConversaoLead(
                lead=schemas.LeadOut.model_validate(lead),
                negociacao_id=negociacao.id,
            )

    cliente = resolver_cliente(db, None, lead.empresa or lead.nome)
    if cliente is not None:
        cliente.contato = cliente.contato or lead.nome
        cliente.whatsapp = cliente.whatsapp or lead.whatsapp
        cliente.email = cliente.email or lead.email
        if lead.pagina:
            cliente.site = cliente.site or lead.pagina

    base = lead.empresa or lead.nome
    titulo = f"{base} — {lead.produto}" if lead.produto else f"Contato pelo site — {base}"
    notas = [f"Lead capturado em {lead.criado_em:%d/%m/%Y} via {lead.origem or 'site'}."]
    if lead.empresa and lead.empresa != lead.nome:
        notas.append(f"Empresa: {lead.empresa}")
    if lead.produto:
        notas.append(f"Produto de interesse: {lead.produto}")
    if lead.valor is not None:
        notas.append(f"Valor informado: R$ {float(lead.valor):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
    if lead.mensagem:
        notas.append(f"Mensagem: {lead.mensagem}")
    utms = [
        f"{rotulo}={valor}"
        for rotulo, valor in (
            ("utm_source", lead.utm_source),
            ("utm_medium", lead.utm_medium),
            ("utm_campaign", lead.utm_campaign),
        )
        if valor
    ]
    if utms:
        notas.append("Origem da campanha: " + ", ".join(utms))
    if lead.pagina:
        notas.append(f"Página: {lead.pagina}")

    negociacao = Negociacao(
        titulo=titulo,
        cliente_id=cliente.id if cliente else None,
        contato=lead.nome,
        whatsapp=lead.whatsapp,
        email=lead.email,
        tipo_site="Site Institucional",
        estagio="lead",
        probabilidade=C.PROB_POR_ESTAGIO["lead"],
        fonte="Site próprio",
        notas="\n".join(notas),
    )
    db.add(negociacao)
    db.flush()

    registrar_atividade(
        db,
        negociacao.id,
        f"Negociação criada a partir de um lead capturado pelo site ({lead.origem or 'site'}).",
        "criacao",
    )

    lead.status = "convertido"
    lead.negociacao_id = negociacao.id

    db.commit()
    db.refresh(lead)
    db.refresh(negociacao)

    return schemas.ConversaoLead(
        lead=schemas.LeadOut.model_validate(lead),
        negociacao_id=negociacao.id,
    )


@router.delete("/leads/{lead_id}", status_code=204)
def excluir(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    db.delete(lead)
    db.commit()
