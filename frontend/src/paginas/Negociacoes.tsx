import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Negociacao } from '../tipos'
import { brl, classe, dataBR, diasAte, baixarCsv, rotuloPrazo } from '../utils'

export function Negociacoes() {
  const { meta, versao, recarregar, abrirDetalhe, abrirFormNegociacao } = useCRM()
  const { avisar } = useToast()
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([])
  const [busca, setBusca] = useState('')
  const [filtroEstagio, setFiltroEstagio] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroFonte, setFiltroFonte] = useState('')

  useEffect(() => {
    api
      .negociacoes()
      .then(setNegociacoes)
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [versao, avisar])

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return negociacoes.filter((negociacao) => {
      if (filtroEstagio && negociacao.estagio !== filtroEstagio) return false
      if (filtroTipo && negociacao.tipo_site !== filtroTipo) return false
      if (filtroFonte && negociacao.fonte !== filtroFonte) return false
      if (!termo) return true
      return [negociacao.titulo, negociacao.cliente_nome, negociacao.contato, negociacao.notas]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo))
    })
  }, [negociacoes, busca, filtroEstagio, filtroTipo, filtroFonte])

  const trocarEstagio = async (negociacao: Negociacao, estagio: string) => {
    try {
      await api.moverNegociacao(negociacao.id, estagio)
      avisar('Estágio atualizado.')
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const excluir = async (negociacao: Negociacao) => {
    if (!window.confirm(`Excluir a negociação de “${negociacao.cliente_nome ?? negociacao.titulo}”?`)) return
    try {
      await api.excluirNegociacao(negociacao.id)
      avisar('Negociação excluída.')
      recarregar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const exportar = () => {
    baixarCsv('negociacoes.csv', [
      ['Cliente', 'Projeto', 'Tipo', 'Valor', 'Mensal', 'Estágio', 'Probabilidade', 'Origem', 'Follow-up', 'Prazo', 'Contato', 'WhatsApp'],
      ...lista.map((negociacao) => [
        negociacao.cliente_nome ?? '',
        negociacao.titulo,
        negociacao.tipo_site,
        negociacao.valor,
        negociacao.mensal,
        meta.estagios.find((e) => e.id === negociacao.estagio)?.nome ?? negociacao.estagio,
        `${negociacao.probabilidade}%`,
        negociacao.fonte ?? '',
        dataBR(negociacao.follow_up),
        dataBR(negociacao.prazo_entrega),
        negociacao.contato ?? '',
        negociacao.whatsapp ?? '',
      ]),
    ])
    avisar('CSV exportado.')
  }

  return (
    <div>
      <div className="filtros">
        <div className="busca">
          <span className="busca-icone">🔍</span>
          <input
            className="entrada"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select className="selecao" style={{ width: 170 }} value={filtroEstagio} onChange={(e) => setFiltroEstagio(e.target.value)}>
          <option value="">Todos os estágios</option>
          {meta.estagios.map((estagio) => (
            <option key={estagio.id} value={estagio.id}>
              {estagio.nome}
            </option>
          ))}
        </select>
        <select className="selecao" style={{ width: 200 }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {meta.tipos_site.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
        <select className="selecao" style={{ width: 170 }} value={filtroFonte} onChange={(e) => setFiltroFonte(e.target.value)}>
          <option value="">Todas as origens</option>
          {meta.fontes.map((fonte) => (
            <option key={fonte} value={fonte}>
              {fonte}
            </option>
          ))}
        </select>
        <button className="botao botao-mini" onClick={exportar}>
          ⬇️ Exportar CSV
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">📋</div>
          Nenhuma negociação encontrada com esses filtros.
        </div>
      ) : (
        <div className="tabela-envolucro">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente / projeto</th>
                <th>Tipo</th>
                <th className="direita">Valor</th>
                <th>Estágio</th>
                <th>Follow-up</th>
                <th>Origem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((negociacao) => {
                const dias = diasAte(negociacao.follow_up)
                const estagio = meta.estagios.find((e) => e.id === negociacao.estagio)
                return (
                  <tr key={negociacao.id}>
                    <td>
                      <div className="negrito">{negociacao.cliente_nome ?? negociacao.titulo}</div>
                      <div className="mini texto-suave">
                        {negociacao.contato ? `${negociacao.contato} · ` : ''}
                        {negociacao.probabilidade}% de chance
                        {negociacao.mensal > 0 ? ` · ${brl(negociacao.mensal)}/mês` : ''}
                      </div>
                    </td>
                    <td>{negociacao.tipo_site}</td>
                    <td className="direita negrito">{brl(negociacao.valor)}</td>
                    <td>
                      <select
                        className="selecao"
                        style={{ minWidth: 150, borderLeft: `3px solid ${estagio?.cor ?? '#64748b'}` }}
                        value={negociacao.estagio}
                        onChange={(e) => trocarEstagio(negociacao, e.target.value)}
                      >
                        {meta.estagios.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div>{dataBR(negociacao.follow_up)}</div>
                      {dias !== null && (
                        <span
                          className={classe(
                            'chip',
                            dias < 0 && negociacao.estagio !== 'ganho' && negociacao.estagio !== 'perdido'
                              ? 'chip-erro'
                              : dias <= 2
                                ? 'chip-alerta'
                                : 'chip',
                          )}
                        >
                          {rotuloPrazo(dias)}
                        </span>
                      )}
                    </td>
                    <td className="mini">{negociacao.fonte ?? '—'}</td>
                    <td>
                      <div className="acoes">
                        <button className="botao botao-mini" onClick={() => abrirDetalhe(negociacao.id)} title="Abrir detalhes">
                          👁
                        </button>
                        <button className="botao botao-mini" onClick={() => abrirFormNegociacao(negociacao)} title="Editar">
                          ✏️
                        </button>
                        <button className="botao botao-mini botao-perigo" onClick={() => excluir(negociacao)} title="Excluir">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
