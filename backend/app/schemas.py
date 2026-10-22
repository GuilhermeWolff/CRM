"""Schemas (contratos) da API."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- #
# Clientes
# --------------------------------------------------------------------------- #
class ClienteBase(BaseModel):
    nome: str = Field(min_length=1, max_length=160)
    contato: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    segmento: str | None = None
    site: str | None = None
    notas: str | None = None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=160)
    contato: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    segmento: str | None = None
    site: str | None = None
    notas: str | None = None


class ClienteOut(ORMBase, ClienteBase):
    id: int
    criado_em: datetime


class ClienteComTotais(ClienteOut):
    total_negociacoes: int = 0
    total_ganho: float = 0
    total_aberto: float = 0
    ultimo_contato: date | None = None


# --------------------------------------------------------------------------- #
# Atividades (linha do tempo)
# --------------------------------------------------------------------------- #
class AtividadeCreate(BaseModel):
    texto: str = Field(min_length=1)
    tipo: str = "nota"


class AtividadeOut(ORMBase):
    id: int
    texto: str
    tipo: str
    criado_em: datetime


# --------------------------------------------------------------------------- #
# Negociações
# --------------------------------------------------------------------------- #
class NegociacaoBase(BaseModel):
    contato: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    tipo_site: str = "Site Institucional"
    plano: str | None = None
    valor: float = 0
    mensal: float = 0
    paginas: int = 1
    extras: str | None = None
    desconto: float = 0
    entrada: float = 0
    parcelas: int = 1
    forma_pagamento: str | None = None
    estagio: str = "lead"
    probabilidade: int = 10
    fonte: str | None = None
    follow_up: date | None = None
    prazo_entrega: date | None = None
    notas: str | None = None


class NegociacaoCreate(NegociacaoBase):
    titulo: str | None = None
    cliente_id: int | None = None
    cliente_nome: str | None = None
    segmento: str | None = None
    site: str | None = None


class NegociacaoUpdate(BaseModel):
    titulo: str | None = None
    cliente_id: int | None = None
    cliente_nome: str | None = None
    segmento: str | None = None
    site: str | None = None
    contato: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    tipo_site: str | None = None
    plano: str | None = None
    valor: float | None = None
    mensal: float | None = None
    paginas: int | None = None
    extras: str | None = None
    desconto: float | None = None
    entrada: float | None = None
    parcelas: int | None = None
    forma_pagamento: str | None = None
    estagio: str | None = None
    probabilidade: int | None = None
    fonte: str | None = None
    follow_up: date | None = None
    prazo_entrega: date | None = None
    notas: str | None = None
    motivo_perda: str | None = None


class NegociacaoOut(ORMBase, NegociacaoBase):
    id: int
    titulo: str
    cliente_id: int | None = None
    cliente_nome: str | None = None
    motivo_perda: str | None = None
    criado_em: datetime
    atualizado_em: datetime
    fechado_em: date | None = None


class NegociacaoDetalhe(NegociacaoOut):
    atividades: list[AtividadeOut] = []
    tarefas: list[TarefaOut] = []


class MoverEstagio(BaseModel):
    estagio: str
    motivo_perda: str | None = None


# --------------------------------------------------------------------------- #
# Tarefas
# --------------------------------------------------------------------------- #
class TarefaBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    negociacao_id: int | None = None
    vencimento: date | None = None
    prioridade: str = "media"
    concluida: bool = False


class TarefaCreate(TarefaBase):
    pass


class TarefaUpdate(BaseModel):
    titulo: str | None = None
    negociacao_id: int | None = None
    vencimento: date | None = None
    prioridade: str | None = None
    concluida: bool | None = None


class TarefaOut(ORMBase, TarefaBase):
    id: int
    criado_em: datetime
    concluida_em: datetime | None = None
    negociacao_titulo: str | None = None


# --------------------------------------------------------------------------- #
# Serviços (tabela de preços)
# --------------------------------------------------------------------------- #
class ServicoBase(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    preco: float = 0
    preco_minimo: float | None = None
    preco_maximo: float | None = None
    descricao: str | None = None
    ativo: bool = True


class ServicoCreate(ServicoBase):
    pass


class ServicoUpdate(BaseModel):
    nome: str | None = None
    preco: float | None = None
    preco_minimo: float | None = None
    preco_maximo: float | None = None
    descricao: str | None = None
    ativo: bool | None = None


class ServicoOut(ORMBase, ServicoBase):
    id: int


# --------------------------------------------------------------------------- #
# Configurações
# --------------------------------------------------------------------------- #
class ConfiguracaoUpdate(BaseModel):
    empresa: str | None = None
    responsavel: str | None = None
    meta_mensal: float | None = None


class ConfiguracaoOut(ORMBase):
    id: int
    empresa: str
    responsavel: str | None = None
    meta_mensal: float


# --------------------------------------------------------------------------- #
# Orçamento
# --------------------------------------------------------------------------- #
class OrcamentoEntrada(BaseModel):
    tipo_site: str = "Site Institucional"
    paginas: int = 1
    extras: list[str] = []
    desconto: float = 0
    horas: int | None = None
    plano: str = "profissional"


class ItemOrcamento(BaseModel):
    id: str
    nome: str
    tipo: str  # fixo | por_pagina | percentual | mensal
    quantidade: int = 1
    valor: float = 0
    total: float = 0
    minimo: float = 0
    total_minimo: float = 0
    maximo: float = 0
    total_maximo: float = 0


class PlanoOrcamento(BaseModel):
    id: str
    nome: str
    descricao: str = ""
    resumo: str = ""
    preco: float = 0
    preco_escopo: float = 0
    horas: int = 0
    inclui: list[str] = []
    extras_incluidos: list[str] = []
    adicionais: list[ItemOrcamento] = []
    valor_adicionais: float = 0
    paginas_extras: int = 0
    valor_paginas: float = 0
    subtotal: float = 0
    desconto_valor: float = 0
    total: float = 0
    mensal: float = 0
    valor_hora: float = 0
    recomendado: bool = False


class OrcamentoSaida(BaseModel):
    tipo_site: str
    paginas: int
    paginas_incluidas: int
    paginas_extras: int
    pagina_extra: float
    plano_selecionado: str
    planos: list[PlanoOrcamento]
    base: float
    subtotal: float
    desconto: float
    desconto_valor: float
    total: float
    piso: float
    teto: float
    faixa_min: float
    faixa_max: float
    mensal: float
    mensal_minimo: float
    mensal_maximo: float
    horas_estimadas: int
    valor_hora: float
    valor_hora_piso: float
    valor_hora_teto: float
    valor_hora_minimo: float
    valor_hora_ideal: float
    desconto_maximo: float
