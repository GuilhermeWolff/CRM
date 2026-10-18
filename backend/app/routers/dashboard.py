"""Indicadores do painel inicial."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import constantes as C
from ..database import get_db
from ..models import Negociacao, Tarefa
from ..services import obter_config

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _f(valor) -> float:
    return float(valor or 0)


def _cor_estagio(estagio: str) -> str:
    for item in C.ESTAGIOS:
        if item["id"] == estagio:
            return item["cor"]
    return "#64748b"


def _resumo(neg: Negociacao) -> dict:
    return {
        "id": neg.id,
        "titulo": neg.titulo,
        "cliente_id": neg.cliente_id,
        "cliente_nome": neg.cliente_nome,
        "contato": neg.contato,
        "whatsapp": neg.whatsapp,
        "tipo_site": neg.tipo_site,
        "valor": _f(neg.valor),
        "mensal": _f(neg.mensal),
        "estagio": neg.estagio,
        "estagio_nome": C.NOME_POR_ESTAGIO.get(neg.estagio, neg.estagio),
        "cor": _cor_estagio(neg.estagio),
        "probabilidade": neg.probabilidade,
        "follow_up": neg.follow_up,
        "fechado_em": neg.fechado_em,
    }


@router.get("")
def painel(dias: int = 7, db: Session = Depends(get_db)) -> dict:
    hoje = date.today()
    limite = hoje + timedelta(days=dias)
    inicio_mes = hoje.replace(day=1)

    negociacoes = db.scalars(
        select(Negociacao)
        .options(selectinload(Negociacao.cliente))
        .order_by(Negociacao.atualizado_em.desc())
    ).all()
    tarefas = db.scalars(
        select(Tarefa).options(selectinload(Tarefa.negociacao)).where(Tarefa.concluida.is_(False))
    ).all()
    config = obter_config(db)

    abertos = [n for n in negociacoes if n.estagio in C.ESTAGIOS_ABERTOS]
    ganhos = [n for n in negociacoes if n.estagio == "ganho"]
    perdidos = [n for n in negociacoes if n.estagio == "perdido"]

    ganhos_mes = [n for n in ganhos if n.fechado_em and n.fechado_em >= inicio_mes]
    perdidos_mes = [n for n in perdidos if n.fechado_em and n.fechado_em >= inicio_mes]

    valor_pipeline = sum(_f(n.valor) for n in abertos)
    previsao = sum(_f(n.valor) * (n.probabilidade or 0) / 100 for n in abertos)
    valor_ganho_mes = sum(_f(n.valor) for n in ganhos_mes)
    valor_ganho_total = sum(_f(n.valor) for n in ganhos)
    meta = _f(config.meta_mensal)

    followups = sorted(
        [n for n in abertos if n.follow_up and n.follow_up <= limite],
        key=lambda n: n.follow_up,
    )
    atrasados = [n for n in abertos if n.follow_up and n.follow_up < hoje]

    # Funil por estágio
    funil = []
    for estagio in C.ESTAGIOS:
        itens = [n for n in negociacoes if n.estagio == estagio["id"]]
        funil.append(
            {
                "id": estagio["id"],
                "nome": estagio["nome"],
                "cor": estagio["cor"],
                "qtd": len(itens),
                "valor": sum(_f(n.valor) for n in itens),
                "prob": estagio["prob"],
            }
        )

    # Ranking por tipo de site (negócios abertos)
    tipos: dict[str, dict] = {}
    for neg in abertos:
        item = tipos.setdefault(neg.tipo_site, {"tipo": neg.tipo_site, "qtd": 0, "valor": 0.0})
        item["qtd"] += 1
        item["valor"] += _f(neg.valor)

    # Origem dos leads (todos os negócios)
    fontes: dict[str, dict] = {}
    for neg in negociacoes:
        chave = neg.fonte or "Não informada"
        item = fontes.setdefault(chave, {"fonte": chave, "qtd": 0, "ganhos": 0})
        item["qtd"] += 1
        if neg.estagio == "ganho":
            item["ganhos"] += 1

    # Ganhos dos últimos 6 meses
    meses: list[tuple[int, int]] = []
    ano, mes = hoje.year, hoje.month
    for _ in range(6):
        meses.append((ano, mes))
        mes -= 1
        if mes == 0:
            mes = 12
            ano -= 1
    meses.reverse()

    ganhos_por_mes = []
    for ano_m, mes_m in meses:
        itens = [
            n for n in ganhos
            if n.fechado_em and n.fechado_em.year == ano_m and n.fechado_em.month == mes_m
        ]
        ganhos_por_mes.append(
            {
                "mes": f"{ano_m:04d}-{mes_m:02d}",
                "valor": sum(_f(n.valor) for n in itens),
                "qtd": len(itens),
            }
        )

    tarefas_ordenadas = sorted(
        [t for t in tarefas if t.vencimento and t.vencimento <= limite],
        key=lambda t: t.vencimento,
    )

    fechados = len(ganhos) + len(perdidos)

    return {
        "resumo": {
            "abertos": len(abertos),
            "valor_pipeline": valor_pipeline,
            "previsao_ponderada": round(previsao, 2),
            "ticket_medio": round(valor_ganho_total / len(ganhos), 2) if ganhos else 0.0,
            "ganhos_mes_qtd": len(ganhos_mes),
            "ganhos_mes_valor": valor_ganho_mes,
            "ganhos_total": valor_ganho_total,
            "ganhos_total_qtd": len(ganhos),
            "perdidos_mes": len(perdidos_mes),
            "mrr": sum(_f(n.mensal) for n in ganhos),
            "taxa_conversao": round(len(ganhos) / fechados * 100, 1) if fechados else 0.0,
            "meta_mensal": meta,
            "atingimento_meta": round(valor_ganho_mes / meta * 100, 1) if meta else 0.0,
            "falta_meta": max(0.0, meta - valor_ganho_mes),
            "atrasados": len(atrasados),
            "followups_semana": len(followups),
            "tarefas_pendentes": len(tarefas),
        },
        "funil": funil,
        "followups": [
            {**_resumo(n), "dias": (n.follow_up - hoje).days} for n in followups[:12]
        ],
        "tarefas": [
            {
                "id": t.id,
                "titulo": t.titulo,
                "vencimento": t.vencimento,
                "prioridade": t.prioridade,
                "negociacao_id": t.negociacao_id,
                "negociacao_titulo": t.negociacao_titulo,
                "dias": (t.vencimento - hoje).days if t.vencimento else None,
            }
            for t in tarefas_ordenadas[:12]
        ],
        "ultimos_ganhos": [_resumo(n) for n in ganhos[:6]],
        "por_tipo": sorted(tipos.values(), key=lambda i: i["valor"], reverse=True),
        "por_fonte": sorted(fontes.values(), key=lambda i: i["qtd"], reverse=True),
        "ganhos_por_mes": ganhos_por_mes,
        "empresa": config.empresa,
        "responsavel": config.responsavel,
    }
