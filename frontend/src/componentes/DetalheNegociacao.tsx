import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { Meta, Negociacao, NegociacaoDetalhe, Tarefa } from '../tipos'
import { useToast } from '../toast'
import { brl, classe, copiar, dataBR, dataHoraBR, diasAte, linkWhatsapp, rotuloPlano, rotuloPrazo } from '../utils'
import { FormTarefa } from './FormTarefa'
import { Icone } from './Icone'
import { MotivoPerda } from './MotivoPerda'

interface Props {
  id: number
  meta: Meta
  aoFechar: () => void
  aoAtualizar: () => void
  aoEditar: (negociacao: Negociacao) => void
}

const TIPOS_MENSAGEM = [
  { id: 'proposta', nome: 'Proposta' },
  { id: 'followup', nome: 'Follow-up' },
  { id: 'fechamento', nome: 'Boas-vindas (ganho)' },
  { id: 'cobranca', nome: 'Cobrança' },
]

export function DetalheNegociacao({ id, meta, aoFechar, aoAtualizar, aoEditar }: Props) {
  const { avisar } = useToast()
  const navegar = useNavigate()
  const [detalhe, setDetalhe] = useState<NegociacaoDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [nota, setNota] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState('proposta')
  const [perdendo, setPerdendo] = useState(false)
  const [formTarefa, setFormTarefa] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDetalhe(await api.negociacao(id))
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
      aoFechar()
    } finally {
      setCarregando(false)
    }
  }, [id, avisar, aoFechar])

  useEffect(() => {
    setCarregando(true)
    carregar()
  }, [carregar])

  useEffect(() => {
    api
      .mensagem(id, 'proposta')
      .then((resposta) => setMensagem(resposta.texto))
      .catch(() => setMensagem(''))
  }, [id])

  const mudarEstagio = async (estagio: string, motivo?: string) => {
    try {
      await api.moverNegociacao(id, estagio, motivo)
      avisar(`Movida para “${meta.estagios.find((e) => e.id === estagio)?.nome}”.`)
      setPerdendo(false)
      await carregar()
      aoAtualizar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const salvarNota = async () => {
    if (!nota.trim()) return
    try {
      await api.anotar(id, nota.trim())
      setNota('')
      await carregar()
      aoAtualizar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const excluir = async () => {
    if (!window.confirm('Excluir esta negociação? Essa ação não pode ser desfeita.')) return
    try {
      await api.excluirNegociacao(id)
      avisar('Negociação excluída.')
      aoFechar()
      aoAtualizar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const trocarMensagem = async (tipo: string) => {
    setTipoMensagem(tipo)
    try {
      const resposta = await api.mensagem(id, tipo)
      setMensagem(resposta.texto)
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const alternarTarefa = async (tarefa: Tarefa) => {
    try {
      await api.concluirTarefa(tarefa.id)
      await carregar()
      aoAtualizar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const removerTarefa = async (tarefa: Tarefa) => {
    try {
      await api.excluirTarefa(tarefa.id)
      await carregar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const estagio = meta.estagios.find((e) => e.id === detalhe?.estagio)
  const zap = linkWhatsapp(detalhe?.whatsapp)
  const dias = diasAte(detalhe?.follow_up)
  const nomesExtras = (detalhe?.extras ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((id) => meta.extras_calculadora.find((extra) => extra.id === id)?.nome ?? id)
    .join(', ')
  const entrada = detalhe?.entrada ?? 0
  const parcelas = detalhe?.parcelas ?? 1
  const valorParcela = parcelas > 1 ? Math.max(0, (detalhe?.valor ?? 0) - entrada) / parcelas : 0

  return (
    <>
      <div
        className="gaveta-fundo"
        onMouseDown={(evento) => {
          if (evento.target === evento.currentTarget) aoFechar()
        }}
      >
        <aside className="gaveta">
          {carregando || !detalhe ? (
            <div className="carregando">Carregando negociação...</div>
          ) : (
            <>
              <header className="gaveta-cabecalho">
                <div>
                  <h3 className="bloco-titulo">{detalhe.cliente_nome ?? detalhe.titulo}</h3>
                  <div className="bloco-sub">
                    #{detalhe.id} · {detalhe.tipo_site}
                    {detalhe.plano ? ` · Plano ${rotuloPlano(detalhe.plano)}` : ''}
                  </div>
                </div>
                <div className="agora">
                  <button
                    className="botao botao-mini"
                    onClick={() => {
                      aoFechar()
                      navegar(`/cadastro/${detalhe.id}`)
                    }}
                    title="Abrir o cadastro completo"
                  >
                    <Icone nome="lista" tamanho={14} />
                    Cadastro
                  </button>
                  <button className="botao botao-mini" onClick={() => aoEditar(detalhe)}>
                    <Icone nome="lapis" tamanho={14} />
                    Editar
                  </button>
                  <button className="botao botao-icone" onClick={aoFechar} aria-label="Fechar">
                    <Icone nome="fechar" tamanho={16} />
                  </button>
                </div>
              </header>

              <div className="gaveta-corpo">
                <div className="linha-entre">
                  <span
                    className="etiqueta-estagio"
                    style={{
                      background: `color-mix(in srgb, ${estagio?.cor ?? '#64748b'} 16%, transparent)`,
                      color: estagio?.cor ?? '#64748b',
                    }}
                  >
                    <span className="ponto" style={{ background: estagio?.cor }} />
                    {estagio?.nome}
                  </span>
                  <span className="negrito">
                    {brl(detalhe.valor)} {detalhe.mensal > 0 && <span className="mini texto-suave">+ {brl(detalhe.mensal)}/mês</span>}
                  </span>
                </div>

                <div className="agora">
                  {meta.estagios.map((item) => (
                    <button
                      key={item.id}
                      className={classe('botao', 'botao-mini', item.id === detalhe.estagio && 'botao-primario')}
                      onClick={() => (item.id === 'perdido' ? setPerdendo(true) : mudarEstagio(item.id))}
                    >
                      {item.nome}
                    </button>
                  ))}
                </div>

                <div className="informacoes">
                  <div>
                    <div className="informacao-rotulo">Contato</div>
                    <div className="informacao-valor">{detalhe.contato || '—'}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">WhatsApp</div>
                    <div className="informacao-valor">
                      {zap ? (
                        <a href={zap} target="_blank" rel="noreferrer" className="texto-ok link-icone">
                          {detalhe.whatsapp}
                          <Icone nome="externo" tamanho={13} />
                        </a>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">E-mail</div>
                    <div className="informacao-valor">{detalhe.email || '—'}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Origem</div>
                    <div className="informacao-valor">{detalhe.fonte || '—'}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Probabilidade</div>
                    <div className="informacao-valor">{detalhe.probabilidade}%</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Próximo follow-up</div>
                    <div className="informacao-valor">
                      {dataBR(detalhe.follow_up)}{' '}
                      {dias !== null && <span className="mini texto-suave">({rotuloPrazo(dias)})</span>}
                    </div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Prazo de entrega</div>
                    <div className="informacao-valor">{dataBR(detalhe.prazo_entrega)}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Plano</div>
                    <div className="informacao-valor">{rotuloPlano(detalhe.plano) || '—'}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Páginas / telas</div>
                    <div className="informacao-valor">{detalhe.paginas ?? 1}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Escopo extra</div>
                    <div className="informacao-valor">{nomesExtras || '—'}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Condições</div>
                    <div className="informacao-valor">
                      {parcelas > 1
                        ? `${entrada > 0 ? `entrada ${brl(entrada)} + ` : ''}${parcelas}x de ${brl(valorParcela)}`
                        : 'à vista'}
                      {detalhe.forma_pagamento ? ` · ${detalhe.forma_pagamento}` : ''}
                    </div>
                  </div>
                  {detalhe.desconto > 0 && (
                    <div>
                      <div className="informacao-rotulo">Desconto</div>
                      <div className="informacao-valor">{detalhe.desconto}%</div>
                    </div>
                  )}
                  <div>
                    <div className="informacao-rotulo">Criada em</div>
                    <div className="informacao-valor">{dataBR(detalhe.criado_em)}</div>
                  </div>
                  {detalhe.fechado_em && (
                    <div>
                      <div className="informacao-rotulo">Fechada em</div>
                      <div className="informacao-valor">{dataBR(detalhe.fechado_em)}</div>
                    </div>
                  )}
                </div>

                {detalhe.motivo_perda && (
                  <div className="aviso aviso-erro">
                    <strong>Motivo da perda:</strong> {detalhe.motivo_perda}
                  </div>
                )}

                {detalhe.notas && (
                  <div className="gaveta-secao">
                    <div className="informacao-rotulo">Escopo / observações</div>
                    <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{detalhe.notas}</p>
                  </div>
                )}

                <div className="gaveta-secao">
                  <div className="bloco-cabecalho">
                    <span className="bloco-titulo">Mensagem pronta</span>
                    <button
                      className="botao botao-mini"
                      onClick={async () => {
                        const ok = await copiar(mensagem)
                        avisar(ok ? 'Mensagem copiada!' : 'Não foi possível copiar.', ok ? 'ok' : 'erro')
                      }}
                    >
                      <Icone nome="copiar" tamanho={14} />
                      Copiar
                    </button>
                  </div>
                  <div className="agora mb">
                    {TIPOS_MENSAGEM.map((tipo) => (
                      <button
                        key={tipo.id}
                        className={classe('botao', 'botao-mini', tipoMensagem === tipo.id && 'botao-primario')}
                        onClick={() => trocarMensagem(tipo.id)}
                      >
                        {tipo.nome}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="area-texto"
                    rows={6}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                  />
                </div>

                <div className="gaveta-secao">
                  <div className="bloco-cabecalho">
                    <span className="bloco-titulo">Tarefas ({detalhe.tarefas.filter((t) => !t.concluida).length} pendentes)</span>
                    <button className="botao botao-mini" onClick={() => setFormTarefa(true)}>
                      + Tarefa
                    </button>
                  </div>
                  <div className="lista">
                    {detalhe.tarefas.length === 0 && <div className="dica">Nenhuma tarefa vinculada.</div>}
                    {detalhe.tarefas.map((tarefa) => (
                      <div key={tarefa.id} className="lista-item parado">
                        <input
                          type="checkbox"
                          checked={tarefa.concluida}
                          onChange={() => alternarTarefa(tarefa)}
                          style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                        />
                        <div className="lista-corpo">
                          <div className="lista-titulo" style={{ textDecoration: tarefa.concluida ? 'line-through' : 'none' }}>
                            {tarefa.titulo}
                          </div>
                          <div className="lista-sub">
                            {dataBR(tarefa.vencimento)} · prioridade {tarefa.prioridade}
                          </div>
                        </div>
                        <button className="botao botao-mini botao-perigo" onClick={() => removerTarefa(tarefa)} aria-label="Remover tarefa">
                          <Icone nome="fechar" tamanho={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="gaveta-secao">
                  <div className="bloco-cabecalho">
                    <span className="bloco-titulo">Histórico</span>
                  </div>
                  <div className="campo mb">
                    <textarea
                      className="area-texto"
                      rows={2}
                      placeholder="Anotar o que aconteceu (ligação, reunião, resposta do cliente...)"
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                    />
                    <button className="botao botao-primario botao-mini" onClick={salvarNota} style={{ alignSelf: 'flex-start' }}>
                      Anotar
                    </button>
                  </div>
                  <div className="timeline">
                    {detalhe.atividades.map((atividade) => (
                      <div key={atividade.id} className="timeline-item">
                        <span className="timeline-ponto" />
                        <div>
                          <div className="timeline-texto">{atividade.texto}</div>
                          <div className="timeline-data">{dataHoraBR(atividade.criado_em)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="botao botao-perigo" onClick={excluir}>
                  <Icone nome="lixeira" tamanho={15} />
                  Excluir negociação
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      <MotivoPerda
        aberto={perdendo}
        cliente={detalhe?.cliente_nome ?? detalhe?.titulo}
        aoCancelar={() => setPerdendo(false)}
        aoConfirmar={(motivo) => mudarEstagio('perdido', motivo)}
      />

      <FormTarefa
        aberto={formTarefa}
        negociacoes={detalhe ? [detalhe] : []}
        negociacaoFixa={id}
        aoFechar={() => setFormTarefa(false)}
        aoSalvar={async (dados) => {
          await api.criarTarefa(dados)
          setFormTarefa(false)
          avisar('Tarefa criada.')
          await carregar()
          aoAtualizar()
        }}
      />
    </>
  )
}
