"""Regras de negócio reutilizáveis (orçamento, mensagens, atividades, clientes)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import constantes as C
from . import schemas
from .models import Atividade, Cliente, Configuracao, Negociacao

# --------------------------------------------------------------------------- #
# Configuração
# --------------------------------------------------------------------------- #
def obter_config(db: Session) -> Configuracao:
    cfg = db.get(Configuracao, 1)
    if cfg is None:
        cfg = Configuracao(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


# --------------------------------------------------------------------------- #
# Atividades
# --------------------------------------------------------------------------- #
def registrar_atividade(
    db: Session, negociacao_id: int, texto: str, tipo: str = "nota"
) -> Atividade:
    atividade = Atividade(negociacao_id=negociacao_id, texto=texto, tipo=tipo)
    db.add(atividade)
    return atividade


# --------------------------------------------------------------------------- #
# Clientes
# --------------------------------------------------------------------------- #
def resolver_cliente(
    db: Session, cliente_id: int | None, cliente_nome: str | None
) -> Cliente | None:
    """Retorna o cliente informado; cria um novo se veio apenas o nome."""
    if cliente_id:
        cliente = db.get(Cliente, cliente_id)
        if cliente is None:
            raise ValueError("Cliente não encontrado")
        return cliente

    nome = (cliente_nome or "").strip()
    if not nome:
        return None

    existente = db.scalar(select(Cliente).where(func.lower(Cliente.nome) == nome.lower()))
    if existente:
        return existente

    cliente = Cliente(nome=nome)
    db.add(cliente)
    db.flush()
    return cliente


# --------------------------------------------------------------------------- #
# Orçamento
# --------------------------------------------------------------------------- #
def calcular_orcamento(entrada: schemas.OrcamentoEntrada) -> schemas.OrcamentoSaida:
    base = C.BASE_POR_TIPO.get(entrada.tipo_site, C.BASE_POR_TIPO["Outro"])

    paginas_extras = max(0, int(entrada.paginas) - C.PAGINAS_INCLUIDAS)
    valor_paginas = paginas_extras * C.VALOR_POR_PAGINA_EXTRA

    subtotal = base + valor_paginas
    mensal = 0.0
    percentual = 0.0
    escolhidos: list[dict] = []

    for extra in C.EXTRAS_CALCULADORA:
        if extra["id"] not in entrada.extras:
            continue
        if extra["tipo"] == "mensal":
            mensal += float(extra["valor"])
            continue
        if extra["tipo"] == "percentual":
            percentual += float(extra["valor"])
            escolhidos.append(
                {"id": extra["id"], "nome": extra["nome"], "valor": float(extra["valor"]),
                 "tipo": "percentual"}
            )
            continue
        subtotal += float(extra["valor"])
        escolhidos.append(
            {"id": extra["id"], "nome": extra["nome"], "valor": float(extra["valor"]),
             "tipo": "fixo"}
        )

    subtotal = subtotal * (1 + percentual / 100)
    desconto_valor = subtotal * (max(0.0, min(100.0, entrada.desconto)) / 100)
    total = subtotal - desconto_valor

    # Horas: estimativa grosseira de 250 reais por hora de trabalho
    horas = round(total / 250)

    return schemas.OrcamentoSaida(
        base=round(base, 2),
        paginas_extra=round(valor_paginas, 2),
        extras=escolhidos,
        subtotal=round(subtotal, 2),
        desconto_valor=round(desconto_valor, 2),
        total=round(total, 2),
        mensal=round(mensal, 2),
        faixa_min=round(total * 0.85, 2),
        faixa_max=round(total * 1.2, 2),
        horas_estimadas=int(horas),
    )


# --------------------------------------------------------------------------- #
# Mensagens prontas (WhatsApp / e-mail)
# --------------------------------------------------------------------------- #
def _brl(valor: Decimal | float | None) -> str:
    numero = float(valor or 0)
    inteiro = f"{numero:,.2f}"
    return "R$ " + inteiro.replace(",", "@").replace(".", ",").replace("@", ".")


def _data(d: date | None) -> str:
    return d.strftime("%d/%m/%Y") if d else "a combinar"


def mensagem_negociacao(neg: Negociacao, tipo: str = "proposta") -> str:
    contato = neg.contato or "tudo bem"
    nome = neg.cliente_nome or neg.titulo
    prazo = _data(neg.prazo_entrega)
    valor = _brl(neg.valor)
    mensal = (
        f"\n• Manutenção mensal: {_brl(neg.mensal)}" if float(neg.mensal or 0) > 0 else ""
    )
    escopo = neg.notas.strip() if neg.notas else "conforme conversamos"

    if tipo == "followup":
        return (
            f"Oi {contato}! Passando para saber se você conseguiu dar uma olhada na "
            f"proposta do projeto ({neg.tipo_site}) da {nome}. Qualquer dúvida sobre "
            f"escopo, prazo ou valor, me fala que eu ajusto. 😉"
        )

    if tipo == "fechamento":
        return (
            f"Oi {contato}! Fico feliz que o projeto da {nome} foi aprovado. 🎉\n"
            f"Vamos começar o {neg.tipo_site}: prazo combinado {prazo}.\n"
            f"Próximos passos: envio do contrato e do briefing inicial. "
            f"Vou te passando o progresso por aqui."
        )

    if tipo == "cobranca":
        return (
            f"Oi {contato}! Tudo bem? Passando para lembrar do pagamento do "
            f"{neg.tipo_site} da {nome} ({valor}). "
            f"Assim que cair eu já libero a próxima etapa do projeto. Obrigado!"
        )

    # proposta (padrão)
    return (
        f"Olá {contato}! Segue o resumo da proposta para o {neg.tipo_site} "
        f"da {nome}:\n"
        f"• Escopo: {escopo}\n"
        f"• Investimento: {valor}{mensal}\n"
        f"• Prazo de entrega: {prazo}\n\n"
        f"Inclui design responsivo, otimização para Google e treinamento de uso. "
        f"Válido por 15 dias. Qualquer ajuste, me fala!"
    )
