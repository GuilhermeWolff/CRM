import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { FormTarefa } from '../componentes/FormTarefa'
import { Icone } from '../componentes/Icone'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Negociacao, Tarefa } from '../tipos'
import { classe, dataBR, diasAte, rotuloPrazo } from '../utils'

type Filtro = 'pendentes' | 'atrasadas' | 'hoje' | 'concluidas' | 'todas'

const FILTROS: { id: Filtro; nome: string }[] = [
  { id: 'pendentes', nome: 'Pendentes' },
  { id: 'atrasadas', nome: 'Atrasadas' },
  { id: 'hoje', nome: 'Hoje' },
  { id: 'concluidas', nome: 'Concluídas' },
  { id: 'todas', nome: 'Todas' },
]

export function Tarefas() {
  const { versao, recarregar, abrirDetalhe } = useCRM()
  const { avisar } = useToast()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([])
  const [filtro, setFiltro] = useState<Filtro>('pendentes')
  const [formAberto, setFormAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Tarefa | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([api.tarefas(), api.negociacoes()])
      .then(([listaTarefas, listaNegociacoes]) => {
        setTarefas(listaTarefas)
        setNegociacoes(listaNegociacoes)
      })
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [versao, avisar])

  const lista = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    return tarefas.filter((tarefa) => {
      const dias = diasAte(tarefa.vencimento)
      if (filtro === 'concluidas') return tarefa.concluida
      if (filtro === 'todas') return true
      if (tarefa.concluida) return false
      if (filtro === 'atrasadas') return dias !== null && dias < 0
      if (filtro === 'hoje') return tarefa.vencimento === hoje
      return true
    })
  }, [tarefas, filtro])

  const alternar = async (tarefa: Tarefa) => {
    try {
      await api.concluirTarefa(tarefa.id)
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const excluir = async (tarefa: Tarefa) => {
    if (!window.confirm(`Excluir a tarefa “${tarefa.titulo}”?`)) return
    try {
      await api.excluirTarefa(tarefa.id)
      avisar('Tarefa excluída.')
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const salvar = async (dados: Partial<Tarefa>) => {
    setSalvando(true)
    try {
      if (emEdicao?.id) {
        await api.atualizarTarefa(emEdicao.id, dados)
        avisar('Tarefa atualizada.')
      } else {
        await api.criarTarefa(dados)
        avisar('Tarefa criada.')
      }
      setFormAberto(false)
      setEmEdicao(null)
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const pendentes = tarefas.filter((tarefa) => !tarefa.concluida)
  const atrasadas = pendentes.filter((tarefa) => {
    const dias = diasAte(tarefa.vencimento)
    return dias !== null && dias < 0
  })

  return (
    <div>
      <div className="cartoes-kpi">
        <div className="kpi alerta">
          <div className="kpi-rotulo">Pendentes</div>
          <div className="kpi-valor">{pendentes.length}</div>
          <div className="kpi-extra">tarefas para resolver</div>
        </div>
        <div className="kpi erro">
          <div className="kpi-rotulo">Atrasadas</div>
          <div className="kpi-valor">{atrasadas.length}</div>
          <div className="kpi-extra">passaram da data</div>
        </div>
        <div className="kpi ok">
          <div className="kpi-rotulo">Concluídas</div>
          <div className="kpi-valor">{tarefas.filter((tarefa) => tarefa.concluida).length}</div>
          <div className="kpi-extra">bom trabalho</div>
        </div>
      </div>

      <div className="filtros">
        {FILTROS.map((item) => (
          <button
            key={item.id}
            className={classe('botao', 'botao-mini', filtro === item.id && 'botao-primario')}
            onClick={() => setFiltro(item.id)}
          >
            {item.nome}
          </button>
        ))}
        <button
          className="botao botao-primario"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            setEmEdicao(null)
            setFormAberto(true)
          }}
        >
          + Nova tarefa
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">
            <Icone nome="check" tamanho={22} />
          </div>
          Nada por aqui. Tudo em dia!
        </div>
      ) : (
        <div className="lista">
          {lista.map((tarefa) => {
            const dias = diasAte(tarefa.vencimento)
            const atrasada = !tarefa.concluida && dias !== null && dias < 0
            return (
              <div key={tarefa.id} className="lista-item parado">
                <input
                  type="checkbox"
                  checked={tarefa.concluida}
                  onChange={() => alternar(tarefa)}
                  style={{ accentColor: 'var(--accent)', width: 17, height: 17 }}
                />
                <div className="lista-corpo">
                  <div
                    className="lista-titulo"
                    style={{ textDecoration: tarefa.concluida ? 'line-through' : 'none' }}
                  >
                    {tarefa.titulo}
                  </div>
                  <div className="lista-sub">
                    {dataBR(tarefa.vencimento)}
                    {dias !== null && !tarefa.concluida ? ` · ${rotuloPrazo(dias)}` : ''}
                    {tarefa.negociacao_titulo ? ` · ${tarefa.negociacao_titulo}` : ''}
                  </div>
                </div>
                <span
                  className={classe(
                    'chip',
                    atrasada
                      ? 'chip-erro'
                      : tarefa.prioridade === 'alta'
                        ? 'chip-alerta'
                        : tarefa.prioridade === 'baixa'
                          ? 'chip'
                          : 'chip-info',
                  )}
                >
                  {tarefa.prioridade}
                </span>
                {tarefa.negociacao_id && (
                  <button className="botao botao-mini" onClick={() => abrirDetalhe(tarefa.negociacao_id!)} title="Abrir negociação">
                    <Icone nome="olho" tamanho={15} />
                  </button>
                )}
                <button
                  className="botao botao-mini"
                  onClick={() => {
                    setEmEdicao(tarefa)
                    setFormAberto(true)
                  }}
                  title="Editar"
                >
                  <Icone nome="lapis" tamanho={14} />
                </button>
                <button className="botao botao-mini botao-perigo" onClick={() => excluir(tarefa)} title="Excluir">
                  <Icone nome="lixeira" tamanho={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <FormTarefa
        aberto={formAberto}
        negociacoes={negociacoes}
        inicial={emEdicao}
        salvando={salvando}
        aoFechar={() => {
          setFormAberto(false)
          setEmEdicao(null)
        }}
        aoSalvar={salvar}
      />
    </div>
  )
}
