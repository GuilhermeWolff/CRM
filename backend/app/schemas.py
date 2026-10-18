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
    valor: float = 0
    mensal: float = 0
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


class NegociacaoUpdate(BaseModel):
    titulo: str | None = None
    cliente_id: int | None = None
    contato: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    tipo_site: str | None = None
    valor: float | None = None
    mensal: float | None = None
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
    descricao: str | None = None
    ativo: bool = True


class ServicoCreate(ServicoBase):
    pass


class ServicoUpdate(BaseModel):
    nome: str | None = None
    preco: float | None = None
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


class OrcamentoSaida(BaseModel):
    base: float
    paginas_extra: float
    extras: list[dict]
    subtotal: float
    desconto_valor: float
    total: float
    mensal: float
    faixa_min: float
    faixa_max: float
    horas_estimadas: int
