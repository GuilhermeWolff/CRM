// Tipos que espelham os contratos da API (backend/app/schemas.py)

export interface Estagio {
  id: string
  nome: string
  prob: number
  cor: string
  descricao?: string
}

export interface Negociacao {
  id: number
  titulo: string
  cliente_id: number | null
  cliente_nome: string | null
  contato: string | null
  whatsapp: string | null
  email: string | null
  tipo_site: string
  valor: number
  mensal: number
  estagio: string
  probabilidade: number
  fonte: string | null
  follow_up: string | null
  prazo_entrega: string | null
  notas: string | null
  motivo_perda: string | null
  criado_em: string
  atualizado_em: string
  fechado_em: string | null
}

export interface Atividade {
  id: number
  texto: string
  tipo: string
  criado_em: string
}

export interface Tarefa {
  id: number
  titulo: string
  negociacao_id: number | null
  vencimento: string | null
  prioridade: string
  concluida: boolean
  criado_em: string
  concluida_em: string | null
  negociacao_titulo: string | null
}

export interface NegociacaoDetalhe extends Negociacao {
  atividades: Atividade[]
  tarefas: Tarefa[]
}

export interface Cliente {
  id: number
  nome: string
  contato: string | null
  whatsapp: string | null
  email: string | null
  segmento: string | null
  site: string | null
  notas: string | null
  criado_em: string
}

export interface ClienteComTotais extends Cliente {
  total_negociacoes: number
  total_ganho: number
  total_aberto: number
  ultimo_contato: string | null
}

export interface Servico {
  id: number
  nome: string
  preco: number
  descricao: string | null
  ativo: boolean
}

export interface Configuracao {
  id: number
  empresa: string
  responsavel: string | null
  meta_mensal: number
}

export interface ExtraCalculadora {
  id: string
  nome: string
  tipo: string
  valor: number
}

export interface Meta {
  estagios: Estagio[]
  tipos_site: string[]
  fontes: string[]
  base_por_tipo: Record<string, number>
  extras_calculadora: ExtraCalculadora[]
  valor_por_pagina_extra: number
  paginas_incluidas: number
}

export interface ResumoPainel {
  abertos: number
  valor_pipeline: number
  previsao_ponderada: number
  ticket_medio: number
  ganhos_mes_qtd: number
  ganhos_mes_valor: number
  ganhos_total: number
  ganhos_total_qtd: number
  perdidos_mes: number
  mrr: number
  taxa_conversao: number
  meta_mensal: number
  atingimento_meta: number
  falta_meta: number
  atrasados: number
  followups_semana: number
  tarefas_pendentes: number
}

export interface ItemFunil {
  id: string
  nome: string
  cor: string
  qtd: number
  valor: number
  prob: number
}

export interface NegociacaoResumo {
  id: number
  titulo: string
  cliente_id: number | null
  cliente_nome: string | null
  contato: string | null
  whatsapp: string | null
  tipo_site: string
  valor: number
  mensal: number
  estagio: string
  estagio_nome: string
  cor: string
  probabilidade: number
  follow_up: string | null
  fechado_em: string | null
}

export interface FollowUpResumo extends NegociacaoResumo {
  dias: number
}

export interface TarefaResumo {
  id: number
  titulo: string
  vencimento: string | null
  prioridade: string
  negociacao_id: number | null
  negociacao_titulo: string | null
  dias: number | null
}

export interface Painel {
  resumo: ResumoPainel
  funil: ItemFunil[]
  followups: FollowUpResumo[]
  tarefas: TarefaResumo[]
  ultimos_ganhos: NegociacaoResumo[]
  por_tipo: { tipo: string; qtd: number; valor: number }[]
  por_fonte: { fonte: string; qtd: number; ganhos: number }[]
  ganhos_por_mes: { mes: string; valor: number; qtd: number }[]
  empresa: string
  responsavel: string | null
}

export interface Orcamento {
  base: number
  paginas_extra: number
  extras: { id: string; nome: string; valor: number; tipo: string }[]
  subtotal: number
  desconto_valor: number
  total: number
  mensal: number
  faixa_min: number
  faixa_max: number
  horas_estimadas: number
}

export interface EntradaOrcamento {
  tipo_site: string
  paginas: number
  extras: string[]
  desconto: number
}

export interface Backup {
  versao: number
  config: { empresa: string; responsavel: string | null; meta_mensal: number }
  clientes: unknown[]
  negociacoes: unknown[]
  tarefas: unknown[]
  servicos: unknown[]
}
