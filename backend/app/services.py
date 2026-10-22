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
def _mensal(total: float, regra: dict) -> float:
    """Manutenção mensal: percentual do projeto, respeitando piso e teto."""
    valor = total * float(regra["valor"]) / 100
    return min(float(regra["maximo"]), max(float(regra["minimo"]), valor))


def calcular_orcamento(entrada: schemas.OrcamentoEntrada) -> schemas.OrcamentoSaida:
    tipo = entrada.tipo_site if entrada.tipo_site in C.TIPOS_PRECO else "Outro"
    preco = C.TIPOS_PRECO[tipo]

    incluidas = int(preco["paginas_incluidas"])
    paginas = max(1, int(entrada.paginas))
    paginas_extras = max(0, paginas - incluidas)

    base = float(preco["base"])
    base_minimo = float(preco["minimo"])
    base_maximo = float(preco["maximo"])

    paginas_extra = paginas_extras * float(preco["pagina_extra"])
    paginas_extra_minimo = paginas_extras * float(preco["pagina_extra_minimo"])
    paginas_extra_maximo = paginas_extras * float(preco["pagina_extra_maximo"])

    subtotal = base + paginas_extra
    subtotal_minimo = base_minimo + paginas_extra_minimo
    subtotal_maximo = base_maximo + paginas_extra_maximo

    percentual = 0.0
    percentual_minimo = 0.0
    percentual_maximo = 0.0
    regra_mensal: dict | None = None
    itens: list[schemas.ItemOrcamento] = []
    horas_extras = 0

    for extra in C.EXTRAS_CALCULADORA:
        if extra["id"] not in entrada.extras:
            continue

        tipo_extra = extra["tipo"]
        horas = int(extra.get("horas", 0))

        if tipo_extra == "mensal":
            regra_mensal = extra
            itens.append(
                schemas.ItemOrcamento(
                    id=extra["id"], nome=extra["nome"], tipo=tipo_extra,
                    quantidade=1,
                    valor=float(extra["valor"]),
                    minimo=float(extra["minimo"]),
                    maximo=float(extra["maximo"]),
                )
            )
            continue

        if tipo_extra == "percentual":
            percentual += float(extra["valor"])
            percentual_minimo += float(extra["minimo"])
            percentual_maximo += float(extra["maximo"])
            itens.append(
                schemas.ItemOrcamento(
                    id=extra["id"], nome=extra["nome"], tipo=tipo_extra,
                    quantidade=1,
                    valor=float(extra["valor"]),
                    minimo=float(extra["minimo"]),
                    maximo=float(extra["maximo"]),
                )
            )
            continue

        quantidade = paginas if tipo_extra == "por_pagina" else 1
        horas_extras += horas * quantidade

        valor = float(extra["valor"]) * quantidade
        minimo = float(extra["minimo"]) * quantidade
        maximo = float(extra["maximo"]) * quantidade

        subtotal += valor
        subtotal_minimo += minimo
        subtotal_maximo += maximo

        itens.append(
            schemas.ItemOrcamento(
                id=extra["id"], nome=extra["nome"], tipo=tipo_extra,
                quantidade=quantidade,
                valor=float(extra["valor"]), total=valor,
                minimo=float(extra["minimo"]), total_minimo=minimo,
                maximo=float(extra["maximo"]), total_maximo=maximo,
            )
        )

    # Percentuais incidem sobre o subtotal (base + páginas + extras fixos)
    parcial = subtotal
    for item in itens:
        if item.tipo == "percentual":
            item.total = parcial * item.valor / 100
            item.total_minimo = parcial * item.minimo / 100
            item.total_maximo = parcial * item.maximo / 100

    subtotal *= 1 + percentual / 100
    subtotal_minimo *= 1 + percentual_minimo / 100
    subtotal_maximo *= 1 + percentual_maximo / 100

    desconto = max(0.0, min(C.DESCONTO_MAXIMO, float(entrada.desconto or 0)))
    fator = 1 - desconto / 100

    total = subtotal * fator
    piso = subtotal_minimo * fator
    teto = subtotal_maximo * fator

    mensal = mensal_minimo = mensal_maximo = 0.0
    if regra_mensal:
        mensal = _mensal(total, regra_mensal)
        mensal_minimo = _mensal(piso, regra_mensal)
        mensal_maximo = _mensal(teto, regra_mensal)
        for item in itens:
            if item.tipo == "mensal":
                item.total = mensal
                item.total_minimo = mensal_minimo
                item.total_maximo = mensal_maximo

    # Horas: padrão do tipo + extras; o usuário pode informar a própria estimativa
    horas = int(entrada.horas) if entrada.horas and entrada.horas > 0 else (
        int(preco["horas"]) + horas_extras + paginas_extras * 2
    )
    horas = max(1, horas)

    return schemas.OrcamentoSaida(
        tipo_site=tipo,
        base=round(base, 2),
        base_minimo=round(base_minimo, 2),
        base_maximo=round(base_maximo, 2),
        paginas_incluidas=incluidas,
        paginas_extras=paginas_extras,
        pagina_extra=float(preco["pagina_extra"]),
        pagina_extra_minimo=float(preco["pagina_extra_minimo"]),
        pagina_extra_maximo=float(preco["pagina_extra_maximo"]),
        paginas_extra=round(paginas_extra, 2),
        paginas_extra_minimo=round(paginas_extra_minimo, 2),
        paginas_extra_maximo=round(paginas_extra_maximo, 2),
        extras=itens,
        subtotal=round(subtotal, 2),
        subtotal_minimo=round(subtotal_minimo, 2),
        subtotal_maximo=round(subtotal_maximo, 2),
        desconto=desconto,
        desconto_valor=round(subtotal - total, 2),
        total=round(total, 2),
        piso=round(piso, 2),
        teto=round(teto, 2),
        faixa_min=round(piso, 2),
        faixa_max=round(teto, 2),
        mensal=round(mensal, 2),
        mensal_minimo=round(mensal_minimo, 2),
        mensal_maximo=round(mensal_maximo, 2),
        horas_estimadas=horas,
        valor_hora=round(total / horas, 2),
        valor_hora_piso=round(piso / horas, 2),
        valor_hora_teto=round(teto / horas, 2),
        valor_hora_minimo=C.VALOR_HORA_MINIMO,
        valor_hora_ideal=C.VALOR_HORA_IDEAL,
        desconto_maximo=C.DESCONTO_MAXIMO,
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


def _escopo_proposta(neg: Negociacao) -> str:
    """Escopo escrito a partir dos campos estruturados (não usa as notas internas)."""
    paginas = int(neg.paginas or 1)
    partes = [
        f"{neg.tipo_site} com {paginas} página(s)" if paginas > 1 else neg.tipo_site
    ]
    nomes = {extra["id"]: extra["nome"] for extra in C.EXTRAS_CALCULADORA}
    for identificador in (neg.extras or "").split(","):
        identificador = identificador.strip()
        if not identificador:
            continue
        nome = nomes.get(identificador)
        if nome:
            partes.append(nome.split(" (")[0].strip().lower())
    return ", ".join(partes)


def _condicoes_pagamento(neg: Negociacao) -> str:
    parcelas = int(neg.parcelas or 1)
    entrada = float(neg.entrada or 0)
    valor = float(neg.valor or 0)
    forma = (neg.forma_pagamento or "").strip()

    if parcelas > 1:
        saldo = max(0.0, valor - entrada)
        prefixo = f"entrada de {_brl(entrada)} + " if entrada > 0 else ""
        texto = f"{prefixo}{parcelas}x de {_brl(saldo / parcelas)}"
        return f"\n• Pagamento: {texto}" + (f" ({forma})" if forma else "")
    if forma:
        return f"\n• Pagamento: {forma}"
    return ""


def mensagem_negociacao(neg: Negociacao, tipo: str = "proposta") -> str:
    contato = neg.contato or "tudo bem"
    nome = neg.cliente_nome or neg.titulo
    prazo = _data(neg.prazo_entrega)
    valor = _brl(neg.valor)
    mensal = (
        f"\n• Manutenção mensal: {_brl(neg.mensal)}" if float(neg.mensal or 0) > 0 else ""
    )
    escopo = _escopo_proposta(neg)
    pagamento = _condicoes_pagamento(neg)

    if tipo == "followup":
        return (
            f"Oi {contato}! Passando para saber se você conseguiu dar uma olhada na "
            f"proposta do projeto ({neg.tipo_site}) da {nome}. Qualquer dúvida sobre "
            f"escopo, prazo ou valor, me fala que eu ajusto."
        )

    if tipo == "fechamento":
        return (
            f"Oi {contato}! Fico feliz que o projeto da {nome} foi aprovado.\n"
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
        f"• Investimento: {valor}{mensal}{pagamento}\n"
        f"• Prazo de entrega: {prazo}\n\n"
        f"Inclui design responsivo, otimização para Google e treinamento de uso. "
        f"Válido por 15 dias. Qualquer ajuste, me fala!"
    )
