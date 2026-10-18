"""Dados de exemplo para você começar a usar o CRM já com o funil populado."""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Atividade, Cliente, Configuracao, Negociacao, Servico, Tarefa

HOJE = date.today()


def _d(dias: int) -> date:
    """Data relativa a hoje (negativo = passado)."""
    return HOJE + timedelta(days=dias)


SERVICOS_EXEMPLO = [
    ("Landing Page (1 página)", 1800, "Página única de conversão, formulário e WhatsApp."),
    ("Site Institucional (até 5 páginas)", 3500, "Home, sobre, serviços, portfólio e contato."),
    ("E-commerce / Loja Virtual", 7500, "Catálogo, carrinho, checkout e painel de pedidos."),
    ("Sistema / Web App sob medida", 12000, "Área logada, banco de dados e regras de negócio."),
    ("Manutenção mensal", 200, "Atualizações, backups e pequenos ajustes."),
    ("SEO mensal", 450, "Otimização de conteúdo e acompanhamento de posições."),
    ("Identidade visual básica", 700, "Logo, paleta e tipografia."),
    ("Migração / evolução de site antigo", 1200, "Redesign e migração de conteúdo."),
]

NEGOCIOS_EXEMPLO = [
    dict(
        titulo="Padaria Pão Quente", cliente="Padaria Pão Quente", contato="Marina",
        whatsapp="(41) 99900-1122", tipo_site="E-commerce / Loja Virtual", valor=7800,
        mensal=300, estagio="negociacao", probabilidade=80, fonte="Instagram",
        follow_up=_d(1), prazo_entrega=_d(45), segmento="Alimentação",
        notas="Quer vender bolos e cestas para retirada. Pediu parcelamento em 3x.",
    ),
    dict(
        titulo="Studio Bella Pilates", cliente="Studio Bella Pilates", contato="Bella",
        whatsapp="(41) 98877-4433", tipo_site="Site Institucional", valor=4200,
        mensal=250, estagio="proposta", probabilidade=60, fonte="Indicação",
        follow_up=_d(3), prazo_entrega=_d(30), segmento="Saúde / Bem-estar",
        notas="Proposta enviada com 5 páginas + agendamento online.",
    ),
    dict(
        titulo="Advocacia Ferraz & Lima", cliente="Advocacia Ferraz & Lima", contato="Dr. Ferraz",
        whatsapp="(41) 99700-8899", tipo_site="Site Institucional", valor=5500,
        mensal=0, estagio="briefing", probabilidade=40, fonte="Google / Busca",
        follow_up=_d(2), prazo_entrega=_d(40), segmento="Jurídico",
        notas="Reunião marcada para quinta. Precisa de blog e área de artigos.",
    ),
    dict(
        titulo="Doceria Amora", cliente="Doceria Amora", contato="Júlia",
        whatsapp="(41) 99655-2211", tipo_site="Landing Page", valor=1900,
        mensal=150, estagio="contato", probabilidade=25, fonte="Instagram",
        follow_up=_d(0), prazo_entrega=_d(20), segmento="Alimentação",
        notas="Respondeu no direct pedindo valores. Ainda não vi escopo.",
    ),
    dict(
        titulo="TechParts Suprimentos", cliente="TechParts Suprimentos", contato="Rogério",
        whatsapp="(41) 99322-7788", email="rogerio@techparts.com.br",
        tipo_site="Sistema / Web App", valor=18000, mensal=900, estagio="negociacao",
        probabilidade=80, fonte="Prospecção ativa", follow_up=_d(4),
        prazo_entrega=_d(90), segmento="Indústria / B2B",
        notas="Precisa de painel de estoque integrado ao ERP. Pediu contrato de manutenção.",
    ),
    dict(
        titulo="Clínica Vida Odonto", cliente="Clínica Vida Odonto", contato="Dra. Renata",
        whatsapp="(41) 99888-1010", tipo_site="Site Institucional", valor=6200,
        mensal=350, estagio="ganho", probabilidade=100, fonte="Indicação",
        prazo_entrega=_d(25), segmento="Saúde",
        notas="Fechado! Entrada de 50% paga no PIX.",
    ),
    dict(
        titulo="Boutique Vermelho", cliente="Boutique Vermelho", contato="Camila",
        whatsapp="(41) 99123-4567", tipo_site="E-commerce / Loja Virtual", valor=8500,
        mensal=400, estagio="ganho", probabilidade=100, fonte="Instagram",
        segmento="Moda", notas="Integração com Correios e Mercado Pago.",
    ),
    dict(
        titulo="Pet Shop Amigo Fiel", cliente="Pet Shop Amigo Fiel", contato="Sérgio",
        tipo_site="Landing Page", valor=1600, estagio="perdido", probabilidade=0,
        fonte="Google / Busca", segmento="Pets",
        motivo_perda="Fechou com freelancer por metade do valor.",
    ),
    dict(
        titulo="Barbearia Navalha de Ouro", cliente="Barbearia Navalha de Ouro", contato="Léo",
        whatsapp="(41) 99500-3322", tipo_site="Portfólio", valor=1400, mensal=120,
        estagio="lead", probabilidade=10, fonte="WhatsApp", follow_up=_d(5),
        segmento="Beleza", notas="Chegou pelo WhatsApp pedindo site com agendamento.",
    ),
    dict(
        titulo="Escola de Idiomas Fluent", cliente="Escola de Idiomas Fluent", contato="Patrícia",
        whatsapp="(41) 99677-8899", tipo_site="Blog / Portal", valor=3900, mensal=280,
        estagio="proposta", probabilidade=60, fonte="Indicação", follow_up=_d(-3),
        prazo_entrega=_d(35), segmento="Educação",
        notas="Proposta enviada semana passada, ainda não respondeu. Cobrar retorno!",
    ),
    dict(
        titulo="Construtora Horizonte", cliente="Construtora Horizonte", contato="Eng. Marcos",
        whatsapp="(41) 99011-2233", tipo_site="Site Institucional", valor=7400,
        mensal=0, estagio="lead", probabilidade=10, fonte="WhatsApp", follow_up=_d(6),
        segmento="Construção civil", notas="Indicação do contador. Ligar na segunda.",
    ),
    dict(
        titulo="Restaurante Sabor da Serra", cliente="Restaurante Sabor da Serra", contato="Toninho",
        whatsapp="(41) 99444-5566", tipo_site="Landing Page", valor=2200, mensal=150,
        estagio="ganho", probabilidade=100, fonte="Indicação", segmento="Alimentação",
        notas="Site no ar, cliente pagando manutenção.",
    ),
    dict(
        titulo="Consultoria RTB", cliente="Consultoria RTB", contato="Ricardo",
        email="ricardo@consultoriartb.com.br", tipo_site="Manutenção / Evolução", valor=900,
        mensal=260, estagio="contato", probabilidade=25, fonte="Site próprio",
        follow_up=_d(7), segmento="Consultoria",
        notas="Quer assumir a manutenção do site atual (feito por outra pessoa).",
    ),
]

ATIVIDADES_EXEMPLO = {
    "Padaria Pão Quente": [
        "Proposta enviada: R$ 7.800 + R$ 300/mês de manutenção.",
        "Cliente pediu para incluir agendamento de retirada. Ajustei o escopo.",
    ],
    "Studio Bella Pilates": [
        "Proposta enviada por WhatsApp com prazo de 30 dias.",
    ],
    "TechParts Suprimentos": [
        "Reunião de 1h para levantar requisitos do painel de estoque.",
        "Enviei a proposta com contrato de manutenção mensal.",
    ],
    "Clínica Vida Odonto": [
        "Proposta aprovada! Entrada de 50% paga no PIX.",
    ],
    "Escola de Idiomas Fluent": [
        "Proposta enviada por e-mail.",
        "Follow-up feito por WhatsApp, pediu até sexta para responder.",
    ],
    "Boutique Vermelho": [
        "Projeto aprovado e iniciado. Wireframe enviado para aprovação.",
    ],
}

TAREFAS_EXEMPLO = [
    ("Ligar para Padaria Pão Quente", "Padaria Pão Quente", _d(0), "alta"),
    ("Enviar contrato da Clínica Vida Odonto", "Clínica Vida Odonto", _d(1), "alta"),
    ("Cobrar retorno da Escola Fluent", "Escola de Idiomas Fluent", _d(-1), "alta"),
    ("Preparar apresentação para TechParts", "TechParts Suprimentos", _d(2), "media"),
    ("Comprar domínio do Studio Bella Pilates", "Studio Bella Pilates", _d(4), "media"),
    ("Estudar integração Mercado Pago", None, _d(9), "baixa"),
    ("Emitir nota fiscal da Boutique Vermelho", "Boutique Vermelho", _d(-4), "media"),
]


def popular_dados(db: Session, limpar: bool = False) -> dict:
    if not limpar and db.scalar(select(func.count(Negociacao.id))):
        return {
            "criado": 0,
            "mensagem": "Já existem negociações cadastradas. Use limpar=true para substituir.",
        }

    if limpar:
        for modelo in (Atividade, Tarefa, Negociacao, Cliente, Servico):
            db.query(modelo).delete()
        db.commit()

    if db.get(Configuracao, 1) is None:
        db.add(
            Configuracao(
                id=1,
                empresa="GW Consultoria",
                responsavel="Guilherme Wolff",
                meta_mensal=Decimal(10000),
            )
        )

    if not db.scalar(select(func.count(Servico.id))):
        for nome, preco, descricao in SERVICOS_EXEMPLO:
            db.add(Servico(nome=nome, preco=Decimal(preco), descricao=descricao))
    db.flush()

    clientes: dict[str, Cliente] = {}
    negociacoes: dict[str, Negociacao] = {}

    for exemplo in NEGOCIOS_EXEMPLO:
        item = dict(exemplo)  # cópia: evita alterar a lista do módulo
        nome_cliente = item.pop("cliente")
        cliente = clientes.get(nome_cliente)
        if cliente is None:
            cliente = Cliente(
                nome=nome_cliente,
                contato=item.get("contato"),
                whatsapp=item.get("whatsapp"),
                email=item.get("email"),
                segmento=item.get("segmento"),
            )
            db.add(cliente)
            db.flush()
            clientes[nome_cliente] = cliente

        estagio = item["estagio"]
        dados = {**item}
        dados.pop("segmento", None)
        if estagio in ("ganho", "perdido"):
            dados["fechado_em"] = _d(-30) if estagio == "ganho" else _d(-12)
        if estagio == "ganho" and item["titulo"] == "Boutique Vermelho":
            dados["fechado_em"] = _d(-5)
        if estagio == "ganho" and item["titulo"] == "Restaurante Sabor da Serra":
            dados["fechado_em"] = _d(-70)

        neg = Negociacao(cliente_id=cliente.id, **dados)
        db.add(neg)
        db.flush()
        negociacoes[item["titulo"]] = neg

        db.add(
            Atividade(
                negociacao_id=neg.id,
                texto=f"Negociação criada em “{estagio}”.",
                tipo="criacao",
            )
        )
        for texto in ATIVIDADES_EXEMPLO.get(item["titulo"], []):
            db.add(Atividade(negociacao_id=neg.id, texto=texto, tipo="nota"))

    for titulo, neg_titulo, vencimento, prioridade in TAREFAS_EXEMPLO:
        neg = negociacoes.get(neg_titulo) if neg_titulo else None
        db.add(
            Tarefa(
                titulo=titulo,
                negociacao_id=neg.id if neg else None,
                vencimento=vencimento,
                prioridade=prioridade,
            )
        )

    db.commit()

    return {
        "criado": len(negociacoes),
        "clientes": db.scalar(select(func.count(Cliente.id))),
        "negociacoes": db.scalar(select(func.count(Negociacao.id))),
        "tarefas": db.scalar(select(func.count(Tarefa.id))),
        "servicos": db.scalar(select(func.count(Servico.id))),
    }


if __name__ == "__main__":  # python -m app.seed
    from .database import Base, SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as sessao:
        print(popular_dados(sessao, limpar="--limpar" in __import__("sys").argv))
