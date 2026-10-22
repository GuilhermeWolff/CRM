"""Rotas de sistema: listas fixas, orçamento, configurações, backup e reset."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import constantes as C
from .. import schemas
from ..database import get_db
from ..models import Atividade, Cliente, Negociacao, Servico, Tarefa
from ..seed import popular_dados
from ..services import calcular_orcamento, obter_config
from ..services import resolver_cliente

router = APIRouter(prefix="/api", tags=["Sistema"])


@router.get("/meta")
def listas_fixas() -> dict:
    """Listas usadas pelos formulários do frontend."""
    return {
        "estagios": C.ESTAGIOS,
        "tipos_site": C.TIPOS_SITE,
        "fontes": C.FONTES,
        "formas_pagamento": C.FORMAS_PAGAMENTO,
        "base_por_tipo": C.BASE_POR_TIPO,
        "precos": C.TIPOS_PRECO,
        "paginas_incluidas_por_tipo": C.PAGINAS_INCLUIDAS_POR_TIPO,
        "horas_por_tipo": C.HORAS_POR_TIPO,
        "extras_calculadora": C.EXTRAS_CALCULADORA,
        "valor_por_pagina_extra": C.VALOR_POR_PAGINA_EXTRA,
        "paginas_incluidas": C.PAGINAS_INCLUIDAS,
        "desconto_maximo": C.DESCONTO_MAXIMO,
        "valor_hora_minimo": C.VALOR_HORA_MINIMO,
        "valor_hora_ideal": C.VALOR_HORA_IDEAL,
    }


@router.post("/orcamento", response_model=schemas.OrcamentoSaida)
def orcamento(entrada: schemas.OrcamentoEntrada):
    return calcular_orcamento(entrada)


# --------------------------------------------------------------------------- #
# Configurações
# --------------------------------------------------------------------------- #
@router.get("/config", response_model=schemas.ConfiguracaoOut)
def ler_config(db: Session = Depends(get_db)):
    return obter_config(db)


@router.put("/config", response_model=schemas.ConfiguracaoOut)
def salvar_config(dados: schemas.ConfiguracaoUpdate, db: Session = Depends(get_db)):
    config = obter_config(db)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(config, campo, valor)
    db.commit()
    db.refresh(config)
    return config


# --------------------------------------------------------------------------- #
# Dados de exemplo
# --------------------------------------------------------------------------- #
@router.post("/seed")
def gerar_exemplo(limpar: bool = False, db: Session = Depends(get_db)) -> dict:
    return popular_dados(db, limpar=limpar)


# --------------------------------------------------------------------------- #
# Backup / restauração
# --------------------------------------------------------------------------- #
@router.get("/backup")
def exportar(db: Session = Depends(get_db)) -> dict:
    clientes = db.scalars(select(Cliente)).all()
    negociacoes = db.scalars(select(Negociacao)).all()
    tarefas = db.scalars(select(Tarefa)).all()
    servicos = db.scalars(select(Servico)).all()
    config = obter_config(db)

    return {
        "versao": 1,
        "config": {
            "empresa": config.empresa,
            "responsavel": config.responsavel,
            "meta_mensal": float(config.meta_mensal or 0),
        },
        "clientes": [
            {
                "nome": c.nome,
                "contato": c.contato,
                "whatsapp": c.whatsapp,
                "email": c.email,
                "segmento": c.segmento,
                "site": c.site,
                "notas": c.notas,
            }
            for c in clientes
        ],
        "negociacoes": [
            {
                "titulo": n.titulo,
                "cliente_nome": n.cliente_nome,
                "contato": n.contato,
                "whatsapp": n.whatsapp,
                "email": n.email,
                "tipo_site": n.tipo_site,
                "valor": float(n.valor or 0),
                "mensal": float(n.mensal or 0),
                "paginas": n.paginas,
                "extras": n.extras,
                "desconto": float(n.desconto or 0),
                "entrada": float(n.entrada or 0),
                "parcelas": n.parcelas,
                "forma_pagamento": n.forma_pagamento,
                "estagio": n.estagio,
                "probabilidade": n.probabilidade,
                "fonte": n.fonte,
                "follow_up": n.follow_up.isoformat() if n.follow_up else None,
                "prazo_entrega": n.prazo_entrega.isoformat() if n.prazo_entrega else None,
                "notas": n.notas,
                "motivo_perda": n.motivo_perda,
                "fechado_em": n.fechado_em.isoformat() if n.fechado_em else None,
                "atividades": [
                    {"texto": a.texto, "tipo": a.tipo} for a in n.atividades
                ],
            }
            for n in negociacoes
        ],
        "tarefas": [
            {
                "titulo": t.titulo,
                "negociacao_titulo": t.negociacao_titulo,
                "vencimento": t.vencimento.isoformat() if t.vencimento else None,
                "prioridade": t.prioridade,
                "concluida": t.concluida,
            }
            for t in tarefas
        ],
        "servicos": [
            {
                "nome": s.nome,
                "preco": float(s.preco or 0),
                "preco_minimo": float(s.preco_minimo) if s.preco_minimo is not None else None,
                "preco_maximo": float(s.preco_maximo) if s.preco_maximo is not None else None,
                "descricao": s.descricao,
                "ativo": s.ativo,
            }
            for s in servicos
        ],
    }


@router.post("/backup")
def importar(dados: dict, db: Session = Depends(get_db)) -> dict:
    """Restaura um backup gerado por GET /api/backup (substitui os dados atuais)."""
    _limpar_tudo(db)

    config = obter_config(db)
    dados_config = dados.get("config") or {}
    config.empresa = dados_config.get("empresa", config.empresa)
    config.responsavel = dados_config.get("responsavel", config.responsavel)
    config.meta_mensal = dados_config.get("meta_mensal", config.meta_mensal)

    for item in dados.get("servicos") or []:
        db.add(Servico(**item))
    db.flush()

    for item in dados.get("negociacoes") or []:
        atividades = item.pop("atividades", [])
        cliente = resolver_cliente(db, None, item.pop("cliente_nome", None))
        for campo in ("follow_up", "prazo_entrega", "fechado_em"):
            item[campo] = _para_data(item.get(campo))
        neg = Negociacao(cliente_id=cliente.id if cliente else None, **item)
        db.add(neg)
        db.flush()
        for atividade in atividades:
            db.add(Atividade(negociacao_id=neg.id, **atividade))

    titulos = {
        n.titulo: n.id for n in db.scalars(select(Negociacao)).all()
    }
    for item in dados.get("tarefas") or []:
        titulo_neg = item.pop("negociacao_titulo", None)
        item["vencimento"] = _para_data(item.get("vencimento"))
        db.add(Tarefa(negociacao_id=titulos.get(titulo_neg or ""), **item))

    db.commit()
    return {
        "clientes": db.scalar(select(func.count(Cliente.id))),
        "negociacoes": db.scalar(select(func.count(Negociacao.id))),
        "tarefas": db.scalar(select(func.count(Tarefa.id))),
    }


def _para_data(valor):
    """Converte texto ISO (vindo do backup em JSON) para data."""
    if isinstance(valor, str) and valor:
        return date.fromisoformat(valor[:10])
    return valor or None


def _limpar_tudo(db: Session) -> None:
    for modelo in (Atividade, Tarefa, Negociacao, Cliente, Servico):
        db.query(modelo).delete()
    db.commit()


@router.post("/reset")
def resetar(recriar_config: bool = True, db: Session = Depends(get_db)) -> dict:
    """Apaga todos os dados. Depois pode rodar POST /api/seed para começar de novo."""
    _limpar_tudo(db)
    if recriar_config:
        obter_config(db)
    return {"ok": True}
