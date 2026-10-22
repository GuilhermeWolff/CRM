"""Regras de negócio reutilizáveis (orçamento, mensagens, atividades, clientes)."""

from __future__ import annotations

import secrets
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
    alterou = False
    if cfg is None:
        cfg = Configuracao(id=1)
        db.add(cfg)
        alterou = True
    if not cfg.token_captura:
        # Chave usada pelos formulários externos (gerada uma única vez).
        cfg.token_captura = secrets.token_urlsafe(24)
        alterou = True
    if alterou:
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
    """Calcula os três planos do projeto: Essencial, Profissional e Premium.

    Cada plano tem preço fechado e escopo próprio. Os extras marcados na
    calculadora entram como adicionais apenas nos planos que ainda não os
    incluem, para não cobrar duas vezes pelo mesmo item.
    """
    tipo = entrada.tipo_site if entrada.tipo_site in C.TIPOS_PRECO else "Outro"
    dados = C.TIPOS_PRECO[tipo]

    incluidas = int(dados["paginas_incluidas"])
    paginas = max(1, int(entrada.paginas))
    paginas_extras = max(0, paginas - incluidas)
    pagina_extra = float(dados["pagina_extra"])
    valor_paginas = paginas_extras * pagina_extra

    desconto = max(0.0, min(C.DESCONTO_MAXIMO, float(entrada.desconto or 0)))
    fator = 1 - desconto / 100

    selecionados = [e for e in C.EXTRAS_CALCULADORA if e["id"] in entrada.extras]
    regra_mensal = next((e for e in selecionados if e["tipo"] == "mensal"), None)
    escolhido = entrada.plano if entrada.plano in dados["planos"] else C.PLANO_PADRAO

    planos: list[schemas.PlanoOrcamento] = []

    for referencia in C.PLANOS:
        pacote = dados["planos"].get(referencia["id"])
        if not pacote:
            continue

        inclui = set(pacote.get("extras_incluidos", []))
        preco = float(pacote["preco"])
        percentual = 0.0
        horas_extras = 0
        adicionais: list[schemas.ItemOrcamento] = []

        for extra in selecionados:
            if extra["id"] in inclui:
                continue

            tipo_extra = extra["tipo"]
            horas = int(extra.get("horas", 0))

            if tipo_extra in ("mensal", "percentual"):
                if tipo_extra == "percentual":
                    percentual += float(extra["valor"])
                adicionais.append(
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
            total = float(extra["valor"]) * quantidade
            adicionais.append(
                schemas.ItemOrcamento(
                    id=extra["id"], nome=extra["nome"], tipo=tipo_extra,
                    quantidade=quantidade,
                    valor=float(extra["valor"]), total=total,
                    minimo=float(extra["minimo"]),
                    total_minimo=float(extra["minimo"]) * quantidade,
                    maximo=float(extra["maximo"]),
                    total_maximo=float(extra["maximo"]) * quantidade,
                )
            )

        # Percentuais incidem sobre o pacote + páginas extras + adicionais fixos
        fixos = sum(i.total for i in adicionais if i.tipo not in ("percentual", "mensal"))
        parcial = preco + valor_paginas + fixos
        for item in adicionais:
            if item.tipo == "percentual":
                item.total = parcial * item.valor / 100
                item.total_minimo = parcial * item.minimo / 100
                item.total_maximo = parcial * item.maximo / 100

        subtotal = parcial * (1 + percentual / 100)
        total = subtotal * fator

        horas = int(pacote["horas"]) + horas_extras + paginas_extras * 2
        if referencia["id"] == escolhido and entrada.horas and entrada.horas > 0:
            horas = int(entrada.horas)
        horas = max(1, horas)

        mensal = _mensal(total, regra_mensal) if regra_mensal else 0.0
        for item in adicionais:
            if item.tipo == "mensal":
                item.total = mensal

        planos.append(
            schemas.PlanoOrcamento(
                id=referencia["id"],
                nome=referencia["nome"],
                descricao=referencia.get("descricao", ""),
                resumo=pacote.get("resumo", ""),
                preco=round(preco, 2),
                preco_escopo=round((preco + valor_paginas) * fator, 2),
                horas=horas,
                inclui=list(pacote.get("inclui", [])),
                extras_incluidos=sorted(inclui),
                adicionais=adicionais,
                valor_adicionais=round(subtotal - preco - valor_paginas, 2),
                paginas_extras=paginas_extras,
                valor_paginas=round(valor_paginas, 2),
                subtotal=round(subtotal, 2),
                desconto_valor=round(subtotal - total, 2),
                total=round(total, 2),
                mensal=round(mensal, 2),
                valor_hora=round(total / horas, 2),
                recomendado=referencia["id"] == C.PLANO_PADRAO,
            )
        )

    if not planos:  # pragma: no cover - proteção contra configuração vazia
        raise ValueError(f"Sem planos configurados para o tipo {tipo}")

    por_id = {plano.id: plano for plano in planos}
    selecionado = por_id.get(escolhido) or planos[len(planos) // 2]
    primeiro = planos[0]
    ultimo = planos[-1]

    mensal_minimo = _mensal(primeiro.total, regra_mensal) if regra_mensal else 0.0
    mensal_maximo = _mensal(ultimo.total, regra_mensal) if regra_mensal else 0.0

    return schemas.OrcamentoSaida(
        tipo_site=tipo,
        paginas=paginas,
        paginas_incluidas=incluidas,
        paginas_extras=paginas_extras,
        pagina_extra=pagina_extra,
        plano_selecionado=selecionado.id,
        planos=planos,
        base=selecionado.preco,
        subtotal=selecionado.subtotal,
        desconto=desconto,
        desconto_valor=selecionado.desconto_valor,
        total=selecionado.total,
        piso=primeiro.total,
        teto=ultimo.total,
        faixa_min=primeiro.total,
        faixa_max=ultimo.total,
        mensal=selecionado.mensal,
        mensal_minimo=round(mensal_minimo, 2),
        mensal_maximo=round(mensal_maximo, 2),
        horas_estimadas=selecionado.horas,
        valor_hora=selecionado.valor_hora,
        valor_hora_piso=primeiro.valor_hora,
        valor_hora_teto=ultimo.valor_hora,
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


def _condicoes_pagamento(neg: Negociacao, valor: float) -> str:
    parcelas = int(neg.parcelas or 1)
    entrada = float(neg.entrada or 0)
    forma = (neg.forma_pagamento or "").strip()

    if parcelas > 1:
        saldo = max(0.0, valor - entrada)
        prefixo = f"entrada de {_brl(entrada)} + " if entrada > 0 else ""
        texto = f"{prefixo}{parcelas}x de {_brl(saldo / parcelas)}"
        return f"\n• Pagamento: {texto}" + (f" ({forma})" if forma else "")
    if forma:
        return f"\n• Pagamento: {forma}"
    return ""


def _orcamento_da_negociacao(neg: Negociacao) -> schemas.OrcamentoSaida | None:
    """Recalcula os três planos a partir dos campos da negociação."""
    try:
        return calcular_orcamento(
            schemas.OrcamentoEntrada(
                tipo_site=neg.tipo_site or "Outro",
                paginas=int(neg.paginas or 1),
                extras=[i.strip() for i in (neg.extras or "").split(",") if i.strip()],
                desconto=float(neg.desconto or 0),
                plano=neg.plano or C.PLANO_PADRAO,
            )
        )
    except Exception:  # pragma: no cover - proposta nunca deve quebrar
        return None


def _valor_proposta(neg: Negociacao) -> float:
    """Valor gravado na negociação; se ainda estiver zerado, usa o plano escolhido.

    Assim a proposta nunca sai com "R$ 0,00" quando o projeto só foi montado na
    calculadora e o cadastro ainda não recebeu o investimento.
    """
    valor = float(neg.valor or 0)
    if valor > 0:
        return valor

    orcamento = _orcamento_da_negociacao(neg)
    if orcamento is None:
        return 0.0
    selecionado = next(
        (p for p in orcamento.planos if p.id == orcamento.plano_selecionado), None
    )
    return float(selecionado.total) if selecionado else 0.0


def _planos_proposta(neg: Negociacao) -> str:
    """Lista os três planos do tipo do projeto para a proposta."""
    orcamento = _orcamento_da_negociacao(neg)
    if orcamento is None:
        return ""

    linhas = []
    for plano in orcamento.planos:
        destaque = " (escolhido)" if plano.id == orcamento.plano_selecionado else ""
        linhas.append(f"- {plano.nome} — {_brl(plano.preco_escopo)}: {plano.resumo}{destaque}")
    return "\n".join(linhas)


def _nome_plano(neg: Negociacao) -> str:
    return next(
        (p["nome"] for p in C.PLANOS if p["id"] == (neg.plano or "")), ""
    )


def mensagem_negociacao(neg: Negociacao, tipo: str = "proposta") -> str:
    contato = neg.contato or "tudo bem"
    nome = neg.cliente_nome or neg.titulo
    prazo = _data(neg.prazo_entrega)
    valor_num = _valor_proposta(neg)
    valor = _brl(valor_num)
    mensal = (
        f"\n• Manutenção mensal: {_brl(neg.mensal)}" if float(neg.mensal or 0) > 0 else ""
    )
    escopo = _escopo_proposta(neg)
    pagamento = _condicoes_pagamento(neg, valor_num)

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
    planos = _planos_proposta(neg)
    bloco_planos = f"\nOpções de plano (a partir de):\n{planos}\n" if planos else ""
    nome_plano = _nome_plano(neg)
    rotulo = f" no plano {nome_plano}" if nome_plano else ""

    return (
        f"Olá {contato}! Segue a proposta para o {neg.tipo_site} "
        f"da {nome}:\n"
        f"• Escopo: {escopo}\n"
        f"• Prazo de entrega: {prazo}\n"
        f"{bloco_planos}\n"
        f"• Investimento{rotulo}: {valor}{mensal}{pagamento}\n\n"
        f"Inclui design responsivo, otimização para Google e treinamento de uso. "
        f"Válido por 15 dias. Qualquer ajuste, me fala!"
    )
