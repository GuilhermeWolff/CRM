import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Icone } from '../componentes/Icone'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Lead } from '../tipos'
import { brl, classe, dataHoraBR, iniciais, linkWhatsapp } from '../utils'

const CORES: Record<string, string> = {
  novo: 'chip-accent',
  contatado: 'chip-info',
  qualificado: 'chip-alerta',
  convertido: 'chip-ok',
  descartado: 'chip-erro',
}

export function Leads() {
  const { meta, versao, recarregar } = useCRM()
  const { avisar } = useToast()
  const navegar = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    api
      .leads()
      .then((dados) => ativo && setLeads(dados))
      .catch((erro) => ativo && avisar((erro as Error).message, 'erro'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [versao, avisar])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return leads.filter((lead) => {
      if (status && lead.status !== status) return false
      if (!termo) return true
      return [lead.nome, lead.empresa, lead.email, lead.whatsapp, lead.produto, lead.mensagem]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo))
    })
  }, [leads, status, busca])

  const contar = (id: string) => leads.filter((lead) => lead.status === id).length

  const mudarStatus = async (lead: Lead, novo: string) => {
    try {
      await api.atualizarLead(lead.id, { status: novo })
      avisar('Lead atualizado.')
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const converter = async (lead: Lead) => {
    try {
      const resultado = await api.converterLead(lead.id)
      avisar('Negociação criada. Complete o cadastro com valor e prazo.')
      recarregar()
      navegar(`/cadastro/${resultado.negociacao_id}`)
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const excluir = async (lead: Lead) => {
    if (!window.confirm(`Excluir o lead de ${lead.nome}?`)) return
    try {
      await api.excluirLead(lead.id)
      avisar('Lead excluído.')
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  return (
    <div className="empilhado">
      <div className="bloco">
        <div className="bloco-cabecalho">
          <div>
            <div className="bloco-titulo">Leads capturados</div>
            <div className="bloco-sub">
              Contatos que chegaram pelos formulários dos seus sites e lojas
            </div>
          </div>
          <div className="campo" style={{ minWidth: 240 }}>
            <input
              className="entrada"
              placeholder="Buscar por nome, produto ou mensagem"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>
        </div>

        <div className="filtros">
          <button
            className={classe('chip', !status && 'chip-accent')}
            onClick={() => setStatus('')}
          >
            Todos ({leads.length})
          </button>
          {meta.status_lead.map((situacao) => (
            <button
              key={situacao.id}
              className={classe('chip', status === situacao.id && CORES[situacao.id])}
              onClick={() => setStatus(situacao.id)}
            >
              {situacao.nome} ({contar(situacao.id)})
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="bloco texto-suave">Carregando leads...</div>
      ) : filtrados.length === 0 ? (
        <div className="bloco vazio">
          <div className="vazio-icone">
            <Icone nome="entrada" tamanho={22} />
          </div>
          <h3>{leads.length === 0 ? 'Nenhum lead capturado ainda' : 'Nenhum lead neste filtro'}</h3>
          <p className="texto-suave">
            {leads.length === 0
              ? 'Instale o formulário no seu site em Configurações e os contatos aparecem aqui.'
              : 'Troque o filtro ou limpe a busca para ver os outros contatos.'}
          </p>
        </div>
      ) : (
        <div className="empilhado">
          {filtrados.map((lead) => {
            const whats = linkWhatsapp(lead.whatsapp)
            const textoWhats = encodeURIComponent(
              `Olá ${lead.nome}! Recebi seu contato pelo site${
                lead.produto ? ` sobre ${lead.produto}` : ''
              } e já estou te respondendo.`,
            )
            return (
              <div key={lead.id} className="bloco lead-cartao">
                <div className="lead-topo">
                  <div className="avatar">{iniciais(lead.nome)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lead-nome">
                      {lead.nome}
                      {lead.empresa && lead.empresa !== lead.nome && (
                        <span className="texto-suave"> · {lead.empresa}</span>
                      )}
                    </div>
                    <div className="mini texto-suave">
                      {dataHoraBR(lead.criado_em)} · {lead.origem || 'Site'}
                    </div>
                  </div>
                  <span className={classe('chip', CORES[lead.status])}>
                    {meta.status_lead.find((s) => s.id === lead.status)?.nome ?? lead.status}
                  </span>
                </div>

                <div className="lead-dados">
                  {lead.whatsapp && (
                    <span>
                      <Icone nome="telefone" tamanho={13} /> {lead.whatsapp}
                    </span>
                  )}
                  {lead.email && (
                    <span>
                      <Icone nome="email" tamanho={13} /> {lead.email}
                    </span>
                  )}
                  {lead.produto && (
                    <span>
                      <Icone nome="lista" tamanho={13} /> {lead.produto}
                    </span>
                  )}
                  {lead.valor !== null && lead.valor > 0 && (
                    <span>
                      <Icone nome="tendencia" tamanho={13} /> {brl(lead.valor)}
                    </span>
                  )}
                  {lead.utm_source && (
                    <span>
                      <Icone nome="globo" tamanho={13} /> {lead.utm_source}
                      {lead.utm_campaign ? ` / ${lead.utm_campaign}` : ''}
                    </span>
                  )}
                </div>

                {lead.mensagem && <p className="lead-mensagem">{lead.mensagem}</p>}

                <div className="lead-acoes">
                  {whats && (
                    <a
                      className="botao botao-mini"
                      href={`${whats}?text=${textoWhats}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icone nome="balao" tamanho={14} />
                      WhatsApp
                    </a>
                  )}
                  {lead.email && (
                    <a className="botao botao-mini" href={`mailto:${lead.email}`}>
                      <Icone nome="email" tamanho={14} />
                      E-mail
                    </a>
                  )}

                  {lead.negociacao_id ? (
                    <button
                      className="botao botao-mini"
                      onClick={() => navegar(`/cadastro/${lead.negociacao_id}`)}
                    >
                      <Icone nome="externo" tamanho={14} />
                      Abrir negociação
                    </button>
                  ) : (
                    <button
                      className="botao botao-mini botao-primario"
                      onClick={() => converter(lead)}
                    >
                      <Icone nome="mais" tamanho={14} />
                      Criar negociação
                    </button>
                  )}

                  {lead.status !== 'contatado' && lead.status !== 'convertido' && (
                    <button className="botao botao-mini" onClick={() => mudarStatus(lead, 'contatado')}>
                      <Icone nome="check" tamanho={14} />
                      Marcar contatado
                    </button>
                  )}
                  {lead.status !== 'descartado' && lead.status !== 'convertido' && (
                    <button className="botao botao-mini" onClick={() => mudarStatus(lead, 'descartado')}>
                      Descartar
                    </button>
                  )}
                  <button
                    className="botao botao-mini botao-perigo"
                    onClick={() => excluir(lead)}
                    title="Excluir lead"
                  >
                    <Icone nome="lixeira" tamanho={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
