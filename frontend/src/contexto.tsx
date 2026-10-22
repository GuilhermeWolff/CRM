import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import { DetalheNegociacao } from './componentes/DetalheNegociacao'
import { FormNegociacao, type DadosNegociacao } from './componentes/FormNegociacao'
import { Icone } from './componentes/Icone'
import { useToast } from './toast'
import type { ClienteComTotais, Configuracao, Meta, Negociacao } from './tipos'

interface ContextoCRM {
  meta: Meta
  config: Configuracao
  clientes: ClienteComTotais[]
  /** Muda sempre que algo é salvo — use como dependência nos useEffect das páginas. */
  versao: number
  recarregar: (opcoes?: { clientes?: boolean }) => void
  abrirFormNegociacao: (negociacao?: Partial<Negociacao> | null) => void
  abrirDetalhe: (id: number) => void
  salvarConfig: (dados: Partial<Configuracao>) => Promise<void>
  recarregarConfig: () => Promise<void>
}

const Contexto = createContext<ContextoCRM | null>(null)

export function useCRM() {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useCRM precisa estar dentro de <CRMProvider>')
  return contexto
}

export function CRMProvider({ children }: { children: ReactNode }) {
  const { avisar } = useToast()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [clientes, setClientes] = useState<ClienteComTotais[]>([])
  const [versao, setVersao] = useState(0)
  const [erro, setErro] = useState<string | null>(null)

  const [formAberto, setFormAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Partial<Negociacao> | null>(null)
  const [detalheId, setDetalheId] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const [dadosMeta, dadosConfig, listaClientes] = await Promise.all([
          api.meta(),
          api.config(),
          api.clientes(),
        ])
        if (!ativo) return
        setMeta(dadosMeta)
        setConfig(dadosConfig)
        setClientes(listaClientes)
      } catch (falha) {
        if (ativo) setErro((falha as Error).message)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  const recarregar = useCallback((opcoes?: { clientes?: boolean }) => {
    setVersao((atual) => atual + 1)
    if (opcoes?.clientes !== false) {
      api.clientes().then(setClientes).catch(() => undefined)
    }
  }, [])

  const abrirFormNegociacao = useCallback((negociacao?: Partial<Negociacao> | null) => {
    setEmEdicao(negociacao ?? null)
    setFormAberto(true)
  }, [])

  const salvarNegociacao = async (dados: DadosNegociacao) => {
    setSalvando(true)
    try {
      if (emEdicao?.id) {
        await api.atualizarNegociacao(emEdicao.id, dados)
        avisar('Negociação atualizada.')
      } else {
        await api.criarNegociacao(dados)
        avisar('Negociação criada.')
      }
      setFormAberto(false)
      setEmEdicao(null)
      recarregar()
    } catch (falha) {
      avisar((falha as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const recarregarConfig = useCallback(async () => {
    try {
      setConfig(await api.config())
    } catch (falha) {
      avisar((falha as Error).message, 'erro')
    }
  }, [avisar])

  const salvarConfig = useCallback(
    async (dados: Partial<Configuracao>) => {
      try {
        const atualizada = await api.salvarConfig(dados)
        setConfig(atualizada)
        avisar('Configurações salvas.')
        recarregar({ clientes: false })
      } catch (falha) {
        avisar((falha as Error).message, 'erro')
      }
    },
    [avisar, recarregar],
  )

  const valor = useMemo<ContextoCRM | null>(() => {
    if (!meta || !config) return null
    return {
      meta,
      config,
      clientes,
      versao,
      recarregar,
      abrirFormNegociacao,
      abrirDetalhe: setDetalheId,
      salvarConfig,
      recarregarConfig,
    }
  }, [
    meta,
    config,
    clientes,
    versao,
    recarregar,
    abrirFormNegociacao,
    salvarConfig,
    recarregarConfig,
  ])

  if (erro) {
    return (
      <div className="carregando">
        <div className="vazio-icone">
          <Icone nome="alerta" tamanho={22} />
        </div>
        <h3>Não consegui falar com a API</h3>
        <p className="texto-suave">{erro}</p>
        <p className="texto-suave">
          Confira se o backend está rodando: <code>backend\dev.bat</code> (ou{' '}
          <code>uvicorn app.main:app --reload</code>) e se o PostgreSQL está no ar.
        </p>
      </div>
    )
  }

  if (!valor) {
    return <div className="carregando">Carregando o CRM...</div>
  }

  return (
    <Contexto.Provider value={valor}>
      {children}

      <FormNegociacao
        aberto={formAberto}
        meta={valor.meta}
        clientes={clientes}
        inicial={emEdicao}
        salvando={salvando}
        aoFechar={() => {
          setFormAberto(false)
          setEmEdicao(null)
        }}
        aoSalvar={salvarNegociacao}
      />

      {detalheId !== null && (
        <DetalheNegociacao
          id={detalheId}
          meta={valor.meta}
          aoFechar={() => setDetalheId(null)}
          aoAtualizar={() => recarregar()}
          aoEditar={(negociacao) => {
            setDetalheId(null)
            abrirFormNegociacao(negociacao)
          }}
        />
      )}
    </Contexto.Provider>
  )
}
