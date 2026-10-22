"""Listas fixas usadas pelo CRM (estágios do funil, tipos de site, fontes...)."""

ESTAGIOS: list[dict] = [
    {"id": "lead", "nome": "Lead novo", "prob": 10, "cor": "#64748b",
     "descricao": "Contato chegou, nada conversado ainda"},
    {"id": "contato", "nome": "Contato feito", "prob": 25, "cor": "#0ea5e9",
     "descricao": "Já respondi / conversei sobre o projeto"},
    {"id": "briefing", "nome": "Briefing / Reunião", "prob": 40, "cor": "#8b5cf6",
     "descricao": "Entendi o escopo e o que o cliente precisa"},
    {"id": "proposta", "nome": "Proposta enviada", "prob": 60, "cor": "#f59e0b",
     "descricao": "Orçamento enviado, aguardando retorno"},
    {"id": "negociacao", "nome": "Em negociação", "prob": 80, "cor": "#ec4899",
     "descricao": "Ajustando valor, escopo ou prazo"},
    {"id": "ganho", "nome": "Fechado (ganho)", "prob": 100, "cor": "#22c55e",
     "descricao": "Projeto aprovado"},
    {"id": "perdido", "nome": "Perdido", "prob": 0, "cor": "#ef4444",
     "descricao": "Não vai sair (registre o motivo)"},
]

ESTAGIOS_ABERTOS = [e["id"] for e in ESTAGIOS if e["id"] not in ("ganho", "perdido")]

PROB_POR_ESTAGIO: dict[str, int] = {e["id"]: e["prob"] for e in ESTAGIOS}

NOME_POR_ESTAGIO: dict[str, str] = {e["id"]: e["nome"] for e in ESTAGIOS}

FONTES: list[str] = [
    "Indicação",
    "Instagram",
    "Google / Busca",
    "WhatsApp",
    "Site próprio",
    "Prospecção ativa",
    "Plataforma / Freelancer",
    "Outro",
]

FORMAS_PAGAMENTO: list[str] = [
    "Pix",
    "Transferência",
    "Boleto",
    "Cartão de crédito",
    "Entrada + parcelas",
    "A combinar",
]

# --- Calculadora de orçamento -------------------------------------------------
#
# Cada item tem três referências de preço:
#   minimo = piso  (não descer abaixo, salvo decisão consciente)
#   base   = alvo  (preço normal de venda)
#   maximo = teto  (o máximo que o mercado paga com escopo premium)
#
# `paginas_incluidas` evita o erro de vender "Site Institucional" com 1 página:
# a base já cobre o tamanho típico do projeto.
TIPOS_PRECO: dict[str, dict] = {
    "Landing Page": {
        "base": 1900.0, "minimo": 1500.0, "maximo": 3200.0,
        "paginas_incluidas": 1, "horas": 20,
        "pagina_extra": 450.0, "pagina_extra_minimo": 350.0,
        "pagina_extra_maximo": 650.0,
    },
    "Site Institucional": {
        "base": 4800.0, "minimo": 3900.0, "maximo": 8500.0,
        "paginas_incluidas": 5, "horas": 45,
        "pagina_extra": 400.0, "pagina_extra_minimo": 320.0,
        "pagina_extra_maximo": 600.0,
    },
    "E-commerce / Loja Virtual": {
        "base": 8900.0, "minimo": 7000.0, "maximo": 18000.0,
        "paginas_incluidas": 8, "horas": 90,
        "pagina_extra": 650.0, "pagina_extra_minimo": 500.0,
        "pagina_extra_maximo": 1000.0,
    },
    "Blog / Portal": {
        "base": 4000.0, "minimo": 3200.0, "maximo": 7500.0,
        "paginas_incluidas": 6, "horas": 40,
        "pagina_extra": 400.0, "pagina_extra_minimo": 320.0,
        "pagina_extra_maximo": 600.0,
    },
    "Portfólio": {
        "base": 1800.0, "minimo": 1400.0, "maximo": 3000.0,
        "paginas_incluidas": 4, "horas": 20,
        "pagina_extra": 350.0, "pagina_extra_minimo": 280.0,
        "pagina_extra_maximo": 500.0,
    },
    "Sistema / Web App": {
        "base": 16000.0, "minimo": 12000.0, "maximo": 35000.0,
        "paginas_incluidas": 4, "horas": 160,
        "pagina_extra": 1200.0, "pagina_extra_minimo": 900.0,
        "pagina_extra_maximo": 2000.0,
    },
    "Manutenção / Evolução": {
        "base": 1200.0, "minimo": 800.0, "maximo": 3000.0,
        "paginas_incluidas": 1, "horas": 10,
        "pagina_extra": 0.0, "pagina_extra_minimo": 0.0,
        "pagina_extra_maximo": 0.0,
    },
    "Outro": {
        "base": 2500.0, "minimo": 2000.0, "maximo": 5000.0,
        "paginas_incluidas": 3, "horas": 30,
        "pagina_extra": 450.0, "pagina_extra_minimo": 350.0,
        "pagina_extra_maximo": 700.0,
    },
}

TIPOS_SITE: list[str] = list(TIPOS_PRECO)

BASE_POR_TIPO: dict[str, float] = {nome: dados["base"] for nome, dados in TIPOS_PRECO.items()}

PAGINAS_INCLUIDAS_POR_TIPO: dict[str, int] = {
    nome: int(dados["paginas_incluidas"]) for nome, dados in TIPOS_PRECO.items()
}

HORAS_POR_TIPO: dict[str, int] = {nome: int(dados["horas"]) for nome, dados in TIPOS_PRECO.items()}

# Compatibilidade com versões anteriores da API
PAGINAS_INCLUIDAS = 1
VALOR_POR_PAGINA_EXTRA = 450.0

# Extras do projeto.
#   tipo: fixo | por_pagina | percentual | mensal
#   valor: preço (ou percentual) no nível alvo
EXTRAS_CALCULADORA: list[dict] = [
    {"id": "seo", "nome": "SEO avançado", "tipo": "fixo",
     "valor": 900.0, "minimo": 700.0, "maximo": 1800.0, "horas": 8},
    {"id": "copy", "nome": "Copywriting / textos", "tipo": "por_pagina",
     "valor": 200.0, "minimo": 150.0, "maximo": 350.0, "horas": 2},
    {"id": "identidade", "nome": "Identidade visual básica", "tipo": "fixo",
     "valor": 1200.0, "minimo": 900.0, "maximo": 2500.0, "horas": 10},
    {"id": "integracoes", "nome": "Integrações (pagamento, ERP)", "tipo": "fixo",
     "valor": 1500.0, "minimo": 1000.0, "maximo": 3000.0, "horas": 12},
    {"id": "painel", "nome": "Painel administrativo", "tipo": "fixo",
     "valor": 3500.0, "minimo": 2500.0, "maximo": 7000.0, "horas": 30},
    {"id": "blog", "nome": "Blog integrado", "tipo": "fixo",
     "valor": 800.0, "minimo": 600.0, "maximo": 1600.0, "horas": 10},
    {"id": "urgente", "nome": "Entrega urgente (prazo curto)", "tipo": "percentual",
     "valor": 35.0, "minimo": 25.0, "maximo": 50.0, "horas": 0},
    {"id": "manutencao", "nome": "Manutenção mensal sugerida", "tipo": "mensal",
     "valor": 3.0, "minimo": 300.0, "maximo": 3000.0, "horas": 0},
]

# Limites de negociação
DESCONTO_MAXIMO = 25.0
VALOR_HORA_MINIMO = 90.0  # abaixo disso o projeto não paga o tempo
VALOR_HORA_IDEAL = 120.0  # faixa saudável para trabalho especializado
