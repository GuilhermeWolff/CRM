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

TIPOS_SITE: list[str] = [
    "Landing Page",
    "Site Institucional",
    "E-commerce / Loja Virtual",
    "Blog / Portal",
    "Portfólio",
    "Sistema / Web App",
    "Manutenção / Evolução",
    "Outro",
]

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

# --- Calculadora de orçamento -------------------------------------------------

BASE_POR_TIPO: dict[str, float] = {
    "Landing Page": 1800.0,
    "Site Institucional": 3500.0,
    "E-commerce / Loja Virtual": 7500.0,
    "Blog / Portal": 3000.0,
    "Portfólio": 1500.0,
    "Sistema / Web App": 12000.0,
    "Manutenção / Evolução": 800.0,
    "Outro": 2000.0,
}

VALOR_POR_PAGINA_EXTRA = 350.0
PAGINAS_INCLUIDAS = 1

EXTRAS_CALCULADORA: list[dict] = [
    {"id": "seo", "nome": "SEO avançado", "tipo": "fixo", "valor": 600.0},
    {"id": "copy", "nome": "Copywriting / textos", "tipo": "fixo", "valor": 500.0},
    {"id": "identidade", "nome": "Identidade visual básica", "tipo": "fixo", "valor": 700.0},
    {"id": "integracoes", "nome": "Integrações (pagamento, ERP)", "tipo": "fixo", "valor": 900.0},
    {"id": "painel", "nome": "Painel administrativo", "tipo": "fixo", "valor": 1200.0},
    {"id": "blog", "nome": "Blog integrado", "tipo": "fixo", "valor": 450.0},
    {"id": "urgente", "nome": "Entrega urgente (prazo curto)", "tipo": "percentual", "valor": 25.0},
    {"id": "manutencao", "nome": "Manutenção mensal sugerida", "tipo": "mensal", "valor": 200.0},
]
