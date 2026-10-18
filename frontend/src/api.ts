// Cliente HTTP da API.
// Em desenvolvimento o Vite faz proxy de /api para http://127.0.0.1:8000.
// Para apontar para outro endereço, defina VITE_API_URL no arquivo .env.

import type {
  Atividade,
  Backup,
  Cliente,
  ClienteComTotais,
  Configuracao,
  EntradaOrcamento,
  Meta,
  Negociacao,
  NegociacaoDetalhe,
  Orcamento,
  Painel,
  Servico,
  Tarefa,
} from './tipos'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export class ErroApi extends Error {
  status: number

  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.status = status
  }
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.headers ?? {}),
    },
  })

  if (!resposta.ok) {
    let detalhe = `Erro ${resposta.status}`
    try {
      const corpo = await resposta.json()
      const msg = corpo?.detail
      if (typeof msg === 'string') detalhe = msg
      else if (Array.isArray(msg) && msg[0]?.msg) detalhe = String(msg[0].msg)
    } catch {
      /* resposta sem JSON */
    }
    throw new ErroApi(detalhe, resposta.status)
  }

  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}

function comCorpo(dados: unknown, metodo = 'POST'): RequestInit {
  return { method: metodo, body: JSON.stringify(dados) }
}

export const api = {
  // --- listas fixas -------------------------------------------------------
  meta: () => requisitar<Meta>('/api/meta'),

  // --- painel -------------------------------------------------------------
  painel: () => requisitar<Painel>('/api/dashboard'),

  // --- negociações --------------------------------------------------------
  negociacoes: (filtros: Record<string, string> = {}) => {
    const query = new URLSearchParams(
      Object.entries(filtros).filter(([, valor]) => valor !== ''),
    ).toString()
    return requisitar<Negociacao[]>(`/api/negociacoes${query ? `?${query}` : ''}`)
  },
  negociacao: (id: number) => requisitar<NegociacaoDetalhe>(`/api/negociacoes/${id}`),
  criarNegociacao: (dados: Partial<Negociacao> & { cliente_nome?: string | null }) =>
    requisitar<Negociacao>('/api/negociacoes', comCorpo(dados)),
  atualizarNegociacao: (id: number, dados: Partial<Negociacao>) =>
    requisitar<Negociacao>(`/api/negociacoes/${id}`, comCorpo(dados, 'PUT')),
  moverNegociacao: (id: number, estagio: string, motivo_perda?: string) =>
    requisitar<Negociacao>(
      `/api/negociacoes/${id}/mover`,
      comCorpo({ estagio, motivo_perda }),
    ),
  excluirNegociacao: (id: number) =>
    requisitar<void>(`/api/negociacoes/${id}`, { method: 'DELETE' }),
  anotar: (id: number, texto: string) =>
    requisitar<Atividade>(`/api/negociacoes/${id}/atividades`, comCorpo({ texto })),
  mensagem: (id: number, tipo: string) =>
    requisitar<{ tipo: string; texto: string }>(`/api/negociacoes/${id}/mensagem?tipo=${tipo}`),

  // --- clientes -----------------------------------------------------------
  clientes: (q = '') =>
    requisitar<ClienteComTotais[]>(`/api/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  criarCliente: (dados: Partial<Cliente>) =>
    requisitar<Cliente>('/api/clientes', comCorpo(dados)),
  atualizarCliente: (id: number, dados: Partial<Cliente>) =>
    requisitar<Cliente>(`/api/clientes/${id}`, comCorpo(dados, 'PUT')),
  excluirCliente: (id: number) => requisitar<void>(`/api/clientes/${id}`, { method: 'DELETE' }),

  // --- tarefas ------------------------------------------------------------
  tarefas: (situacao?: string) =>
    requisitar<Tarefa[]>(`/api/tarefas${situacao ? `?situacao=${situacao}` : ''}`),
  criarTarefa: (dados: Partial<Tarefa>) => requisitar<Tarefa>('/api/tarefas', comCorpo(dados)),
  atualizarTarefa: (id: number, dados: Partial<Tarefa>) =>
    requisitar<Tarefa>(`/api/tarefas/${id}`, comCorpo(dados, 'PUT')),
  concluirTarefa: (id: number) => requisitar<Tarefa>(`/api/tarefas/${id}/concluir`, comCorpo({})),
  excluirTarefa: (id: number) => requisitar<void>(`/api/tarefas/${id}`, { method: 'DELETE' }),

  // --- serviços / preços --------------------------------------------------
  servicos: () => requisitar<Servico[]>('/api/servicos'),
  criarServico: (dados: Partial<Servico>) => requisitar<Servico>('/api/servicos', comCorpo(dados)),
  atualizarServico: (id: number, dados: Partial<Servico>) =>
    requisitar<Servico>(`/api/servicos/${id}`, comCorpo(dados, 'PUT')),
  excluirServico: (id: number) => requisitar<void>(`/api/servicos/${id}`, { method: 'DELETE' }),

  // --- configurações e sistema -------------------------------------------
  config: () => requisitar<Configuracao>('/api/config'),
  salvarConfig: (dados: Partial<Configuracao>) =>
    requisitar<Configuracao>('/api/config', comCorpo(dados, 'PUT')),
  orcamento: (entrada: EntradaOrcamento) =>
    requisitar<Orcamento>('/api/orcamento', comCorpo(entrada)),
  gerarExemplo: (limpar = false) =>
    requisitar<Record<string, unknown>>(`/api/seed?limpar=${limpar}`, comCorpo({})),
  backup: () => requisitar<Backup>('/api/backup'),
  restaurarBackup: (dados: unknown) =>
    requisitar<Record<string, number>>('/api/backup', comCorpo(dados)),
  resetar: () => requisitar<{ ok: boolean }>('/api/reset', comCorpo({})),
}
