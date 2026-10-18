import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { MotivoPerda } from '../componentes/MotivoPerda'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Negociacao } from '../tipos'
import { brl, brlCompacto, classe, diasAte, rotuloPrazo } from '../utils'

export function Pipeline() {
  const { meta, versao, recarregar, abrirDetalhe, abrirFormNegociacao } = useCRM()
  const { avisar } = useToast()
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([])
  const [busca, setBusca] = useState('')
  const [arrastando, setArrastando] = useState<number | null>(null)
  const [colunaSobre, setColunaSobre] = useState<string | null>(null)
  const [perdendo, setPerdendo] = useState<Negociacao | null>(null)

  useEffect(() => {
    api
      .negociacoes()
      .then(setNegociacoes)
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [versao, avisar])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return negociacoes
    return negociacoes.filter((negociacao) =>
      [negociacao.titulo, negociacao.cliente_nome, negociacao.contato, negociacao.tipo_site, negociacao.notas]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo)),
    )
  }, [negociacoes, busca])

  const mover = async (negociacao: Negociacao, estagio: string, motivo?: string) => {
    if (negociacao.estagio === estagio) return
    try {
      await api.moverNegociacao(negociacao.id, estagio, motivo)
      avisar(`“${negociacao.cliente_nome ?? negociacao.titulo}” → ${meta.estagios.find((e) => e.id === estagio)?.nome}`)
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const soltar = (estagio: string) => {
    setColunaSobre(null)
    const negociacao = negociacoes.find((item) => item.id === arrastando)
    setArrastando(null)
    if (!negociacao) return
    if (estagio === 'perdido') {
      setPerdendo(negociacao)
      return
    }
    void mover(negociacao, estagio)
  }

  return (
    <div>
      <div className="filtros">
        <div className="busca">
          <span className="busca-icone">🔍</span>
          <input
            className="entrada"
            placeholder="Buscar por cliente, contato, tipo de site..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <span className="dica">{filtradas.length} negociação(ões)</span>
        <span className="dica">· valor total {brl(filtradas.reduce((soma, item) => soma + item.valor, 0))}</span>
      </div>

      <div className="kanban">
        {meta.estagios.map((estagio) => {
          const itens = filtradas.filter((negociacao) => negociacao.estagio === estagio.id)
          const total = itens.reduce((soma, item) => soma + item.valor, 0)
          return (
            <section
              key={estagio.id}
              className={classe('coluna', colunaSobre === estagio.id && 'sobre')}
              onDragOver={(evento) => {
                evento.preventDefault()
                setColunaSobre(estagio.id)
              }}
              onDragLeave={() => setColunaSobre((atual) => (atual === estagio.id ? null : atual))}
              onDrop={(evento) => {
                evento.preventDefault()
                soltar(estagio.id)
              }}
            >
              <header className="coluna-topo" style={{ borderTopColor: estagio.cor }}>
                <div className="coluna-titulo">
                  <span>
                    <span className="ponto" style={{ background: estagio.cor, display: 'inline-block', marginRight: 6 }} />
                    {estagio.nome}
                  </span>
                  <span className="chip">{itens.length}</span>
                </div>
                <div className="coluna-valor">
                  {brlCompacto(total)} · {estagio.prob}% de chance
                </div>
              </header>

              <div className="coluna-corpo">
                {itens.map((negociacao) => {
                  const dias = diasAte(negociacao.follow_up)
                  const atrasado = dias !== null && dias < 0 && estagio.id !== 'ganho' && estagio.id !== 'perdido'
                  return (
                    <article
                      key={negociacao.id}
                      className={classe('cartao-neg', arrastando === negociacao.id && 'arrastando')}
                      draggable
                      onDragStart={(evento) => {
                        evento.dataTransfer.setData('text/plain', String(negociacao.id))
                        evento.dataTransfer.effectAllowed = 'move'
                        setArrastando(negociacao.id)
                      }}
                      onDragEnd={() => {
                        setArrastando(null)
                        setColunaSobre(null)
                      }}
                      onClick={() => abrirDetalhe(negociacao.id)}
                    >
                      <div className="cartao-topo">
                        <span className="cartao-titulo">{negociacao.cliente_nome ?? negociacao.titulo}</span>
                      </div>
                      <div className="cartao-sub">
                        {negociacao.tipo_site}
                        {negociacao.contato ? ` · ${negociacao.contato}` : ''}
                      </div>
                      <div className="cartao-rodape">
                        <span className="cartao-valor">{brl(negociacao.valor)}</span>
                        <span className={classe('chip', atrasado ? 'chip-erro' : 'chip')}>
                          {dias === null ? 'sem follow-up' : rotuloPrazo(dias)}
                        </span>
                      </div>
                      {negociacao.mensal > 0 && (
                        <div className="dica mt">+ {brl(negociacao.mensal)}/mês de manutenção</div>
                      )}
                    </article>
                  )
                })}

                {itens.length === 0 && <div className="dica">Arraste um cartão para cá.</div>}

                <button className="botao botao-mini" onClick={() => abrirFormNegociacao({ estagio: estagio.id })}>
                  + Adicionar
                </button>
              </div>
            </section>
          )
        })}
      </div>

      <MotivoPerda
        aberto={perdendo !== null}
        cliente={perdendo ? (perdendo.cliente_nome ?? perdendo.titulo) : undefined}
        aoCancelar={() => setPerdendo(null)}
        aoConfirmar={(motivo) => {
          if (perdendo) void mover(perdendo, 'perdido', motivo)
          setPerdendo(null)
        }}
      />
    </div>
  )
}
