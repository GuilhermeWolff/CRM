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
  plano: string | null
  valor: number
  mensal: number
  paginas: number
  extras: string | null
  desconto: number
  entrada: number
  parcelas: number
  forma_pagamento: string | null
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
  preco_minimo: number | null
  preco_maximo: number | null
  descricao: string | null
  ativo: boolean
}

export interface Configuracao {
  id: number
  empresa: string
  responsavel: string | null
  meta_mensal: number
  token_captura: string | null
  url_publica: string | null
}

export interface Lead {
  id: number
  nome: string
  empresa: string | null
  email: string | null
  whatsapp: string | null
  produto: string | null
  valor: number | null
  mensagem: string | null
  origem: string | null
  pagina: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  status: string
  negociacao_id: number | null
  criado_em: string
}

export interface ConversaoLead {
  lead: Lead
  negociacao_id: number
}

export interface ExtraCalculadora {
  id: string
  nome: string
  tipo: string
  valor: number
  minimo: number
  maximo: number
  horas: number
}

export interface PlanoTipo {
  preco: number
  horas: number
  resumo: string
  inclui: string[]
  extras_incluidos: string[]
}

export interface PrecoTipo {
  paginas_incluidas: number
  pagina_extra: number
  pagina_extra_minimo: number
  pagina_extra_maximo: number
  planos: Record<string, PlanoTipo>
}

export interface Meta {
  estagios: Estagio[]
  tipos_site: string[]
  fontes: string[]
  status_lead: { id: string; nome: string }[]
  formas_pagamento: string[]
  base_por_tipo: Record<string, number>
  planos: { id: string; nome: string; descricao: string }[]
  plano_padrao: string
  precos: Record<string, PrecoTipo>
  paginas_incluidas_por_tipo: Record<string, number>
  horas_por_tipo: Record<string, number>
  extras_calculadora: ExtraCalculadora[]
  valor_por_pagina_extra: number
  paginas_incluidas: number
  desconto_maximo: number
  valor_hora_minimo: number
  valor_hora_ideal: number
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

export interface ItemOrcamento {
  id: string
  nome: string
  tipo: string
  quantidade: number
  valor: number
  total: number
  minimo: number
  total_minimo: number
  maximo: number
  total_maximo: number
}

export interface Plano {
  id: string
  nome: string
  descricao: string
  resumo: string
  preco: number
  preco_escopo: number
  horas: number
  inclui: string[]
  extras_incluidos: string[]
  adicionais: ItemOrcamento[]
  valor_adicionais: number
  paginas_extras: number
  valor_paginas: number
  subtotal: number
  desconto_valor: number
  total: number
  mensal: number
  valor_hora: number
  recomendado: boolean
}

export interface Orcamento {
  tipo_site: string
  paginas: number
  paginas_incluidas: number
  paginas_extras: number
  pagina_extra: number
  plano_selecionado: string
  planos: Plano[]
  base: number
  subtotal: number
  desconto: number
  desconto_valor: number
  total: number
  piso: number
  teto: number
  faixa_min: number
  faixa_max: number
  mensal: number
  mensal_minimo: number
  mensal_maximo: number
  horas_estimadas: number
  valor_hora: number
  valor_hora_piso: number
  valor_hora_teto: number
  valor_hora_minimo: number
  valor_hora_ideal: number
  desconto_maximo: number
}

export interface EntradaOrcamento {
  tipo_site: string
  paginas: number
  extras: string[]
  desconto: number
  horas?: number | null
  plano?: string
}

export interface Backup {
  versao: number
  config: { empresa: string; responsavel: string | null; meta_mensal: number }
  clientes: unknown[]
  negociacoes: unknown[]
  tarefas: unknown[]
  servicos: unknown[]
  leads: unknown[]
}
