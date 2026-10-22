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
# Todo projeto é vendido em TRÊS PLANOS. A regra comercial é:
#   - Essencial e Profissional com preços próximos (até ~20% de diferença)
#   - Premium bem mais alto (~2x o Profissional), para ancorar a decisão
#
# Cada plano tem preço fechado (`preco`), horas de entrega (`horas`), o que
# inclui (`inclui`, usado na proposta) e quais extras já entram no pacote
# (`extras_incluidos`, usado para não cobrar duas vezes).
#
# `paginas_incluidas` evita vender "Site Institucional" como se fosse 1 página.
PLANOS: list[dict] = [
    {"id": "essencial", "nome": "Essencial", "descricao": "o essencial para começar"},
    {"id": "profissional", "nome": "Profissional", "descricao": "o mais escolhido"},
    {"id": "premium", "nome": "Premium", "descricao": "operação completa"},
]

PLANO_PADRAO = "profissional"

TIPOS_PRECO: dict[str, dict] = {
    "Landing Page": {
        "paginas_incluidas": 1, "pagina_extra": 450.0,
        "pagina_extra_minimo": 350.0, "pagina_extra_maximo": 650.0,
        "planos": {
            "essencial": {
                "preco": 2900.0, "horas": 16,
                "resumo": "1 página responsiva, formulário e WhatsApp, SEO básico",
                "inclui": [
                    "1 página de conversão",
                    "Design responsivo",
                    "Formulário + botão de WhatsApp",
                    "SEO básico e velocidade",
                    "Publicação, domínio e SSL",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 3400.0, "horas": 18,
                "resumo": "1 página + textos, SEO on-page, Analytics e 2 ajustes",
                "inclui": [
                    "Tudo do Essencial",
                    "Textos profissionais (copywriting)",
                    "SEO on-page e Google Analytics",
                    "Google Meu Negócio configurado",
                    "2 rodadas de ajustes",
                ],
                "extras_incluidos": ["copy"],
            },
            "premium": {
                "preco": 6900.0, "horas": 28,
                "resumo": "página premium + identidade visual, SEO avançado e 3 meses de manutenção",
                "inclui": [
                    "Tudo do Profissional",
                    "Identidade visual básica (logo e paleta)",
                    "SEO avançado e integração com CRM",
                    "Testes de velocidade e acessibilidade",
                    "3 meses de manutenção inclusos",
                ],
                "extras_incluidos": ["copy", "seo", "identidade"],
            },
        },
    },
    "Site Institucional": {
        "paginas_incluidas": 5, "pagina_extra": 400.0,
        "pagina_extra_minimo": 320.0, "pagina_extra_maximo": 600.0,
        "planos": {
            "essencial": {
                "preco": 5900.0, "horas": 40,
                "resumo": "5 páginas, design responsivo, formulário e WhatsApp, SEO básico",
                "inclui": [
                    "Até 5 páginas (home, sobre, serviços, portfólio, contato)",
                    "Design responsivo e menu de navegação",
                    "Formulário de contato + WhatsApp",
                    "SEO básico e Google Analytics",
                    "Publicação, domínio e SSL",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 6700.0, "horas": 45,
                "resumo": "5 páginas + textos, SEO on-page, Analytics e 2 ajustes",
                "inclui": [
                    "Tudo do Essencial",
                    "Textos profissionais (copywriting)",
                    "SEO on-page em todas as páginas",
                    "Google Meu Negócio e Analytics",
                    "2 rodadas de ajustes",
                ],
                "extras_incluidos": ["copy", "seo"],
            },
            "premium": {
                "preco": 13900.0, "horas": 70,
                "resumo": "site completo + identidade visual, blog, painel e 3 meses de manutenção",
                "inclui": [
                    "Tudo do Profissional",
                    "Identidade visual básica (logo, paleta e tipografia)",
                    "Blog integrado e painel de conteúdo",
                    "SEO avançado e integração com CRM",
                    "3 meses de manutenção inclusos",
                ],
                "extras_incluidos": ["copy", "seo", "identidade", "blog", "painel"],
            },
        },
    },
    "E-commerce / Loja Virtual": {
        "paginas_incluidas": 8, "pagina_extra": 650.0,
        "pagina_extra_minimo": 500.0, "pagina_extra_maximo": 1000.0,
        "planos": {
            "essencial": {
                "preco": 9900.0, "horas": 80,
                "resumo": "loja com catálogo, carrinho, checkout e painel de pedidos",
                "inclui": [
                    "Catálogo de produtos com categorias",
                    "Carrinho e checkout",
                    "Integração com Pix e cartão",
                    "Cálculo de frete e painel de pedidos",
                    "Publicação, domínio e SSL",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 11500.0, "horas": 90,
                "resumo": "loja completa + textos, SEO on-page, integração e 2 ajustes",
                "inclui": [
                    "Tudo do Essencial",
                    "Textos das páginas principais",
                    "SEO on-page de produtos e categorias",
                    "Recuperação de carrinho e cupons",
                    "Integração com gateway e frete",
                    "2 rodadas de ajustes",
                ],
                "extras_incluidos": ["copy", "seo", "integracoes"],
            },
            "premium": {
                "preco": 23900.0, "horas": 150,
                "resumo": "loja premium + painel avançado, identidade visual, integrações e 3 meses de manutenção",
                "inclui": [
                    "Tudo do Profissional",
                    "Identidade visual e vitrine personalizada",
                    "Painel administrativo avançado",
                    "Integração com ERP e automações",
                    "Otimização de performance e SEO avançado",
                    "3 meses de manutenção inclusos",
                ],
                "extras_incluidos": ["copy", "seo", "integracoes", "painel", "identidade"],
            },
        },
    },
    "Blog / Portal": {
        "paginas_incluidas": 6, "pagina_extra": 400.0,
        "pagina_extra_minimo": 320.0, "pagina_extra_maximo": 600.0,
        "planos": {
            "essencial": {
                "preco": 4900.0, "horas": 35,
                "resumo": "6 páginas com blog, categorias e painel de publicação",
                "inclui": [
                    "Até 6 páginas",
                    "Blog com categorias e busca",
                    "Painel de publicação",
                    "SEO básico e compartilhamento social",
                    "Publicação, domínio e SSL",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 5600.0, "horas": 40,
                "resumo": "portal + textos, SEO on-page e Analytics",
                "inclui": [
                    "Tudo do Essencial",
                    "Textos das páginas principais",
                    "SEO on-page e Analytics",
                    "Newsletter e comentários",
                    "2 rodadas de ajustes",
                ],
                "extras_incluidos": ["copy", "seo"],
            },
            "premium": {
                "preco": 11500.0, "horas": 65,
                "resumo": "portal completo + identidade visual, painel e 3 meses de manutenção",
                "inclui": [
                    "Tudo do Profissional",
                    "Identidade visual básica",
                    "Painel de conteúdo avançado",
                    "SEO avançado e dados estruturados",
                    "3 meses de manutenção inclusos",
                ],
                "extras_incluidos": ["copy", "seo", "identidade", "painel"],
            },
        },
    },
    "Portfólio": {
        "paginas_incluidas": 4, "pagina_extra": 350.0,
        "pagina_extra_minimo": 280.0, "pagina_extra_maximo": 500.0,
        "planos": {
            "essencial": {
                "preco": 2400.0, "horas": 16,
                "resumo": "4 páginas com galeria de projetos e contato",
                "inclui": [
                    "Até 4 páginas",
                    "Galeria de projetos",
                    "Design responsivo",
                    "Formulário de contato",
                    "Publicação, domínio e SSL",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 2800.0, "horas": 18,
                "resumo": "portfólio + textos, SEO on-page e Analytics",
                "inclui": [
                    "Tudo do Essencial",
                    "Textos de apresentação e projetos",
                    "SEO on-page e Analytics",
                    "2 rodadas de ajustes",
                ],
                "extras_incluidos": ["copy", "seo"],
            },
            "premium": {
                "preco": 5900.0, "horas": 30,
                "resumo": "portfólio premium + identidade visual, blog e 3 meses de manutenção",
                "inclui": [
                    "Tudo do Profissional",
                    "Identidade visual básica",
                    "Blog integrado",
                    "Animações e casos de estudo",
                    "3 meses de manutenção inclusos",
                ],
                "extras_incluidos": ["copy", "seo", "identidade", "blog"],
            },
        },
    },
    "Sistema / Web App": {
        "paginas_incluidas": 4, "pagina_extra": 1200.0,
        "pagina_extra_minimo": 900.0, "pagina_extra_maximo": 2000.0,
        "planos": {
            "essencial": {
                "preco": 19000.0, "horas": 140,
                "resumo": "MVP com cadastro, login, banco de dados e painel básico",
                "inclui": [
                    "Até 4 telas",
                    "Cadastro e autenticação de usuários",
                    "Banco de dados e regras de negócio",
                    "Painel administrativo básico",
                    "Deploy e documentação",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 22000.0, "horas": 160,
                "resumo": "sistema + integrações, relatórios e 2 ajustes",
                "inclui": [
                    "Tudo do Essencial",
                    "Integração com 1 serviço externo",
                    "Relatórios e exportação",
                    "Perfis de acesso",
                    "2 rodadas de ajustes",
                ],
                "extras_incluidos": ["integracoes"],
            },
            "premium": {
                "preco": 45000.0, "horas": 280,
                "resumo": "sistema completo + painel avançado, integrações, identidade e 3 meses de manutenção",
                "inclui": [
                    "Tudo do Profissional",
                    "Painel administrativo avançado",
                    "Integrações múltiplas (ERP, pagamento, API)",
                    "Identidade visual e UX",
                    "Testes automatizados e monitoramento",
                    "3 meses de manutenção inclusos",
                ],
                "extras_incluidos": ["integracoes", "painel", "seo", "identidade"],
            },
        },
    },
    "Manutenção / Evolução": {
        "paginas_incluidas": 1, "pagina_extra": 0.0,
        "pagina_extra_minimo": 0.0, "pagina_extra_maximo": 0.0,
        "planos": {
            "essencial": {
                "preco": 1500.0, "horas": 10,
                "resumo": "pacote de 10h para ajustes e correções",
                "inclui": [
                    "10 horas de ajustes",
                    "Correções e atualizações",
                    "Backup e monitoramento",
                    "Relatório do que foi feito",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 1800.0, "horas": 12,
                "resumo": "12h + SEO e melhorias de performance",
                "inclui": [
                    "Tudo do Essencial",
                    "12 horas de ajustes",
                    "Melhorias de performance",
                    "Ajustes de SEO",
                ],
                "extras_incluidos": ["seo"],
            },
            "premium": {
                "preco": 3900.0, "horas": 24,
                "resumo": "24h + SEO, integrações e suporte prioritário",
                "inclui": [
                    "Tudo do Profissional",
                    "24 horas de ajustes",
                    "Integrações e automações",
                    "Suporte prioritário",
                ],
                "extras_incluidos": ["seo", "integracoes"],
            },
        },
    },
    "Outro": {
        "paginas_incluidas": 3, "pagina_extra": 450.0,
        "pagina_extra_minimo": 350.0, "pagina_extra_maximo": 700.0,
        "planos": {
            "essencial": {
                "preco": 3000.0, "horas": 20,
                "resumo": "escopo enxuto para validar a ideia",
                "inclui": [
                    "Escopo enxuto definido com você",
                    "Design responsivo",
                    "Publicação e SSL",
                ],
                "extras_incluidos": [],
            },
            "profissional": {
                "preco": 3500.0, "horas": 24,
                "resumo": "escopo completo + textos e SEO",
                "inclui": [
                    "Tudo do Essencial",
                    "Textos profissionais",
                    "SEO on-page",
                    "2 rodadas de ajustes",
                ],
                "extras_incluidos": ["copy", "seo"],
            },
            "premium": {
                "preco": 7500.0, "horas": 45,
                "resumo": "escopo completo + identidade visual, blog e manutenção",
                "inclui": [
                    "Tudo do Profissional",
                    "Identidade visual básica",
                    "Blog integrado",
                    "3 meses de manutenção inclusos",
                ],
                "extras_incluidos": ["copy", "seo", "identidade", "blog"],
            },
        },
    },
}

TIPOS_SITE: list[str] = list(TIPOS_PRECO)

PAGINAS_INCLUIDAS_POR_TIPO: dict[str, int] = {
    nome: int(dados["paginas_incluidas"]) for nome, dados in TIPOS_PRECO.items()
}

# Preço/horas do plano Profissional: referência rápida e compatibilidade
BASE_POR_TIPO: dict[str, float] = {
    nome: float(dados["planos"]["profissional"]["preco"]) for nome, dados in TIPOS_PRECO.items()
}

HORAS_POR_TIPO: dict[str, int] = {
    nome: int(dados["planos"]["profissional"]["horas"]) for nome, dados in TIPOS_PRECO.items()
}

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
