import { useEffect, useState } from 'react'
import { api } from '../api'
import { Icone } from '../componentes/Icone'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Painel as DadosPainel } from '../tipos'
import { brl, brlCompacto, classe, dataBR, mesCurto, numero, rotuloPrazo } from '../utils'

function corDoPrazo(dias: number) {
  if (dias < 0) return 'chip-erro'
  if (dias <= 2) return 'chip-alerta'
  return 'chip'
}

export function Painel() {
  const { versao, abrirDetalhe, abrirFormNegociacao, recarregar } = useCRM()
  const { avisar } = useToast()
  const [dados, setDados] = useState<DadosPainel | null>(null)

  useEffect(() => {
    api
      .painel()
      .then(setDados)
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [versao, avisar])

  if (!dados) return <div className="carregando">Carregando indicadores...</div>

  const { resumo } = dados
  const maiorMes = Math.max(1, ...dados.ganhos_por_mes.map((mes) => mes.valor))
  const maiorFunil = Math.max(1, ...dados.funil.map((item) => item.valor))

  const concluirTarefa = async (id: number) => {
    try {
      await api.concluirTarefa(id)
      avisar('Tarefa concluída!')
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  return (
    <div className="empilhado">
      <div className="cartoes-kpi">
        <div className="kpi info">
          <div className="kpi-rotulo">Pipeline aberto</div>
          <div className="kpi-valor">{brl(resumo.valor_pipeline)}</div>
          <div className="kpi-extra">{resumo.abertos} negociações em andamento</div>
        </div>
        <div className="kpi">
          <div className="kpi-rotulo">Previsão ponderada</div>
          <div className="kpi-valor">{brl(resumo.previsao_ponderada)}</div>
          <div className="kpi-extra">considerando a probabilidade de cada etapa</div>
        </div>
        <div className="kpi ok">
          <div className="kpi-rotulo">Fechado no mês</div>
          <div className="kpi-valor">{brl(resumo.ganhos_mes_valor)}</div>
          <div className="kpi-extra">
            {resumo.ganhos_mes_qtd} projeto(s) · meta {brl(resumo.meta_mensal)}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-rotulo">Receita recorrente</div>
          <div className="kpi-valor">{brl(resumo.mrr)}</div>
          <div className="kpi-extra">manutenção mensal contratada</div>
        </div>
        <div className="kpi">
          <div className="kpi-rotulo">Ticket médio</div>
          <div className="kpi-valor">{brl(resumo.ticket_medio)}</div>
          <div className="kpi-extra">{resumo.ganhos_total_qtd} projetos fechados no total</div>
        </div>
        <div className={classe('kpi', resumo.taxa_conversao >= 50 ? 'ok' : 'alerta')}>
          <div className="kpi-rotulo">Taxa de conversão</div>
          <div className="kpi-valor">{numero(resumo.taxa_conversao)}%</div>
          <div className="kpi-extra">
            {resumo.perdidos_mes} perdida(s) neste mês
          </div>
        </div>
      </div>

      <div className="bloco">
        <div className="bloco-cabecalho">
          <div>
            <div className="bloco-titulo">Meta do mês</div>
            <div className="bloco-sub">
              {brl(resumo.ganhos_mes_valor)} de {brl(resumo.meta_mensal)}
            </div>
          </div>
          <span className={classe('chip', resumo.atingimento_meta >= 100 ? 'chip-ok' : 'chip-alerta')}>
            {numero(resumo.atingimento_meta)}%
          </span>
        </div>
        <div className="barra-progresso">
          <div className="progresso" style={{ width: `${Math.min(100, resumo.atingimento_meta)}%` }} />
        </div>
        <div className="dica mt">
          {resumo.falta_meta > 0
            ? `Faltam ${brl(resumo.falta_meta)} para bater a meta. ${resumo.followups_semana} follow-up(s) nos próximos 7 dias.`
            : 'Meta batida! Que tal subir a régua para o próximo mês?'}
        </div>
      </div>

      <div className="grade-2">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Funil de vendas</div>
            <span className="dica">valor por etapa</span>
          </div>
          <div className="empilhado">
            {dados.funil.map((item) => (
              <div key={item.id} className="funil-linha">
                <div>
                  <div className="funil-qtd">{item.nome}</div>
                  <div className="dica">{item.qtd} negociação(ões)</div>
                </div>
                <div className="funil-barra-fundo">
                  <div
                    className="funil-barra"
                    style={{ width: `${Math.max(2, (item.valor / maiorFunil) * 100)}%`, background: item.cor }}
                  />
                </div>
                <div className="funil-valor">{brlCompacto(item.valor)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Fechamentos por mês</div>
            <span className="dica">últimos 6 meses</span>
          </div>
          <div className="grafico">
            {dados.ganhos_por_mes.map((mes) => (
              <div key={mes.mes} className="grafico-coluna">
                <span className="grafico-valor">{mes.valor > 0 ? brlCompacto(mes.valor) : ''}</span>
                <div className="grafico-barra" style={{ height: `${Math.max(3, (mes.valor / maiorMes) * 105)}px` }} />
                <span className="grafico-rotulo">{mesCurto(mes.mes)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grade-2">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Próximos follow-ups</div>
            <span className={classe('chip', resumo.atrasados > 0 ? 'chip-erro' : 'chip-ok')}>
              {resumo.atrasados} atrasado(s)
            </span>
          </div>
          {dados.followups.length === 0 ? (
            <div className="vazio">
              <div className="vazio-icone">
                <Icone nome="balao" tamanho={22} />
              </div>
              Nenhum follow-up pendente nos próximos dias.
            </div>
          ) : (
            <div className="lista">
              {dados.followups.map((item) => (
                <div key={item.id} className="lista-item" onClick={() => abrirDetalhe(item.id)}>
                  <div className="lista-corpo">
                    <div className="lista-titulo">{item.cliente_nome ?? item.titulo}</div>
                    <div className="lista-sub">
                      {item.tipo_site} · {item.estagio_nome} · {brl(item.valor)}
                    </div>
                  </div>
                  <span className={classe('chip', corDoPrazo(item.dias))}>{rotuloPrazo(item.dias)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Tarefas da semana</div>
            <span className="dica">{resumo.tarefas_pendentes} pendente(s)</span>
          </div>
          {dados.tarefas.length === 0 ? (
            <div className="vazio">
              <div className="vazio-icone">
                <Icone nome="check" tamanho={22} />
              </div>
              Nada para esta semana. Aproveite para prospectar!
            </div>
          ) : (
            <div className="lista">
              {dados.tarefas.map((tarefa) => (
                <div key={tarefa.id} className="lista-item parado">
                  <input
                    type="checkbox"
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                    onChange={() => concluirTarefa(tarefa.id)}
                  />
                  <div className="lista-corpo">
                    <div className="lista-titulo">{tarefa.titulo}</div>
                    <div className="lista-sub">
                      {dataBR(tarefa.vencimento)}
                      {tarefa.negociacao_titulo ? ` · ${tarefa.negociacao_titulo}` : ''}
                    </div>
                  </div>
                  <span
                    className={classe(
                      'chip',
                      tarefa.prioridade === 'alta' ? 'chip-erro' : tarefa.prioridade === 'media' ? 'chip-alerta' : 'chip',
                    )}
                  >
                    {tarefa.prioridade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grade-3">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Últimos ganhos</div>
          </div>
          {dados.ultimos_ganhos.length === 0 ? (
            <div className="dica">Nenhum projeto fechado ainda.</div>
          ) : (
            <div className="lista">
              {dados.ultimos_ganhos.map((item) => (
                <div key={item.id} className="lista-item" onClick={() => abrirDetalhe(item.id)}>
                  <div className="lista-corpo">
                    <div className="lista-titulo">{item.cliente_nome ?? item.titulo}</div>
                    <div className="lista-sub">
                      {item.tipo_site} · {dataBR(item.fechado_em)}
                    </div>
                  </div>
                  <div className="lista-valor texto-ok">{brl(item.valor)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Tipo de projeto</div>
            <span className="dica">em aberto</span>
          </div>
          {dados.por_tipo.length === 0 ? (
            <div className="dica">Sem negociações abertas.</div>
          ) : (
            <div className="lista">
              {dados.por_tipo.map((item) => (
                <div key={item.tipo} className="lista-item parado">
                  <div className="lista-corpo">
                    <div className="lista-titulo">{item.tipo}</div>
                    <div className="lista-sub">{item.qtd} negociação(ões)</div>
                  </div>
                  <div className="lista-valor">{brl(item.valor)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">De onde vêm os contatos</div>
          </div>
          {dados.por_fonte.length === 0 ? (
            <div className="dica">Sem dados ainda.</div>
          ) : (
            <div className="lista">
              {dados.por_fonte.map((item) => (
                <div key={item.fonte} className="lista-item parado">
                  <div className="lista-corpo">
                    <div className="lista-titulo">{item.fonte}</div>
                    <div className="lista-sub">{item.ganhos} ganho(s)</div>
                  </div>
                  <div className="lista-valor">{item.qtd}</div>
                </div>
              ))}
            </div>
          )}
          <div className="divisor mt" />
          <button className="botao botao-mini mt" onClick={() => abrirFormNegociacao()}>
            + Registrar nova negociação
          </button>
        </div>
      </div>
    </div>
  )
}
