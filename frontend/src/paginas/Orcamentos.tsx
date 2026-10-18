import { useEffect, useState } from 'react'
import { api } from '../api'
import { Modal } from '../componentes/Modal'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Orcamento, Servico } from '../tipos'
import { brl, classe } from '../utils'

export function Orcamentos() {
  const { meta, versao, recarregar, abrirFormNegociacao } = useCRM()
  const { avisar } = useToast()

  const [tipo, setTipo] = useState(meta.tipos_site[1] ?? 'Site Institucional')
  const [paginas, setPaginas] = useState(5)
  const [extras, setExtras] = useState<string[]>([])
  const [desconto, setDesconto] = useState(0)
  const [resultado, setResultado] = useState<Orcamento | null>(null)

  const [servicos, setServicos] = useState<Servico[]>([])
  const [emEdicao, setEmEdicao] = useState<Partial<Servico> | null>(null)
  const [formAberto, setFormAberto] = useState(false)

  useEffect(() => {
    api.servicos().then(setServicos).catch(() => setServicos([]))
  }, [versao])

  useEffect(() => {
    api
      .orcamento({ tipo_site: tipo, paginas, extras, desconto })
      .then(setResultado)
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [tipo, paginas, extras, desconto, avisar])

  const alternarExtra = (id: string) =>
    setExtras((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]))

  const criarNegociacao = () => {
    if (!resultado) return
    const escolhidos = resultado.extras.map((extra) => extra.nome).join(', ')
    abrirFormNegociacao({
      tipo_site: tipo,
      valor: resultado.total,
      mensal: resultado.mensal,
      notas:
        `Orçamento sugerido pela calculadora:\n` +
        `• Páginas: ${paginas}\n` +
        (escolhidos ? `• Extras: ${escolhidos}\n` : '') +
        `• Horas estimadas: ${resultado.horas_estimadas}h\n` +
        `• Faixa sugerida: ${brl(resultado.faixa_min)} a ${brl(resultado.faixa_max)}`,
    })
  }

  const salvarServico = async (dados: Partial<Servico>) => {
    try {
      if (emEdicao?.id) await api.atualizarServico(emEdicao.id, dados)
      else await api.criarServico(dados)
      setFormAberto(false)
      setEmEdicao(null)
      avisar('Tabela de preços atualizada.')
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const excluirServico = async (servico: Servico) => {
    if (!window.confirm(`Remover “${servico.nome}” da tabela de preços?`)) return
    try {
      await api.excluirServico(servico.id)
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  return (
    <div className="empilhado">
      <div className="calculadora">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Calculadora de orçamento</div>
              <div className="bloco-sub">Estimativa rápida com base no seu preço por tipo de projeto</div>
            </div>
          </div>

          <div className="empilhado">
            <div className="campo-linha">
              <label className="campo">
                <span className="campo-rotulo">Tipo de projeto</span>
                <select className="selecao" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {meta.tipos_site.map((item) => (
                    <option key={item} value={item}>
                      {item} — base {brl(meta.base_por_tipo[item] ?? 0)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span className="campo-rotulo">Páginas / telas</span>
                <input
                  className="entrada"
                  type="number"
                  min={1}
                  max={80}
                  value={paginas}
                  onChange={(e) => setPaginas(Math.max(1, Number(e.target.value) || 1))}
                />
                <span className="dica">
                  {meta.paginas_incluidas} incluída(s) · +{brl(meta.valor_por_pagina_extra)} por página extra
                </span>
              </label>
            </div>

            <div className="campo">
              <span className="campo-rotulo">O que está incluído</span>
              <div className="grade-extras">
                {meta.extras_calculadora.map((extra) => (
                  <label key={extra.id} className="linha-checkbox">
                    <input
                      type="checkbox"
                      checked={extras.includes(extra.id)}
                      onChange={() => alternarExtra(extra.id)}
                    />
                    <span>
                      {extra.nome}
                      <span className="dica">
                        {' '}
                        {extra.tipo === 'percentual'
                          ? `+${extra.valor}%`
                          : extra.tipo === 'mensal'
                            ? `${brl(extra.valor)}/mês`
                            : brl(extra.valor)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="campo">
              <span className="campo-rotulo">Desconto de negociação: {desconto}%</span>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={desconto}
                onChange={(e) => setDesconto(Number(e.target.value))}
                style={{ accentColor: 'var(--accent)' }}
              />
            </label>
          </div>
        </div>

        <div className="calculadora-resultado">
          <div className="bloco-titulo mb">Resumo do orçamento</div>
          {resultado && (
            <>
              <div className="resultado-linha">
                <span>Base ({tipo})</span>
                <span className="negrito">{brl(resultado.base)}</span>
              </div>
              {resultado.paginas_extra > 0 && (
                <div className="resultado-linha">
                  <span>Páginas extras</span>
                  <span className="negrito">{brl(resultado.paginas_extra)}</span>
                </div>
              )}
              {resultado.extras.map((extra) => (
                <div key={extra.id} className="resultado-linha">
                  <span>{extra.nome}</span>
                  <span className="negrito">
                    {extra.tipo === 'percentual' ? `+${extra.valor}%` : brl(extra.valor)}
                  </span>
                </div>
              ))}
              {resultado.desconto_valor > 0 && (
                <div className="resultado-linha">
                  <span>Desconto</span>
                  <span className="negrito texto-erro">- {brl(resultado.desconto_valor)}</span>
                </div>
              )}
              <div className="resultado-linha ultima">
                <span>Tempo estimado</span>
                <span className="negrito">~{resultado.horas_estimadas}h de trabalho</span>
              </div>

              <div className="resultado-total">
                <span className="bloco-titulo">Valor do projeto</span>
                <span className="valor">{brl(resultado.total)}</span>
              </div>

              {resultado.mensal > 0 && (
                <div className="resultado-linha ultima">
                  <span>Manutenção mensal</span>
                  <span className="negrito texto-ok">{brl(resultado.mensal)}/mês</span>
                </div>
              )}

              <div className="dica mt">
                Faixa sugerida para negociar: {brl(resultado.faixa_min)} até {brl(resultado.faixa_max)}
              </div>

              <div className="empilhado mt">
                <button className="botao botao-primario" onClick={criarNegociacao}>
                  + Criar negociação com esse valor
                </button>
                <span className="dica">
                  Ajuste os valores no cadastro da negociação antes de enviar a proposta.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bloco">
        <div className="bloco-cabecalho">
          <div>
            <div className="bloco-titulo">Tabela de preços</div>
            <div className="bloco-sub">Seus serviços de referência para montar propostas</div>
          </div>
          <button
            className="botao botao-primario botao-mini"
            onClick={() => {
              setEmEdicao({ ativo: true, preco: 0 })
              setFormAberto(true)
            }}
          >
            + Novo serviço
          </button>
        </div>

        <div className="tabela-envolucro">
          <table className="tabela">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Descrição</th>
                <th className="direita">Preço</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {servicos.map((servico) => (
                <tr key={servico.id}>
                  <td className="negrito">{servico.nome}</td>
                  <td className="mini texto-suave">{servico.descricao ?? '—'}</td>
                  <td className="direita negrito">{brl(servico.preco)}</td>
                  <td>
                    <span className={classe('chip', servico.ativo ? 'chip-ok' : 'chip')}>
                      {servico.ativo ? 'ativo' : 'inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="acoes">
                      <button
                        className="botao botao-mini"
                        onClick={() => {
                          setEmEdicao(servico)
                          setFormAberto(true)
                        }}
                      >
                        ✏️
                      </button>
                      <button className="botao botao-mini botao-perigo" onClick={() => excluirServico(servico)}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {servicos.length === 0 && (
                <tr>
                  <td colSpan={5} className="texto-suave">
                    Nenhum serviço cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ServicoModal
        aberto={formAberto}
        inicial={emEdicao}
        aoFechar={() => {
          setFormAberto(false)
          setEmEdicao(null)
        }}
        aoSalvar={salvarServico}
      />
    </div>
  )
}

function ServicoModal({
  aberto,
  inicial,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean
  inicial: Partial<Servico> | null
  aoFechar: () => void
  aoSalvar: (dados: Partial<Servico>) => void
}) {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('0')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [chave, setChave] = useState('')

  const identificador = `${aberto}-${inicial?.id ?? 'novo'}`
  if (chave !== identificador) {
    setChave(identificador)
    if (aberto) {
      setNome(inicial?.nome ?? '')
      setPreco(String(inicial?.preco ?? 0))
      setDescricao(inicial?.descricao ?? '')
      setAtivo(inicial?.ativo ?? true)
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={inicial?.id ? 'Editar serviço' : 'Novo serviço'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="botao" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className="botao botao-primario"
            onClick={() => aoSalvar({ nome: nome.trim(), preco: Number(preco) || 0, descricao, ativo })}
          >
            Salvar
          </button>
        </>
      }
    >
      <label className="campo">
        <span className="campo-rotulo">Nome *</span>
        <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </label>
      <div className="campo-linha">
        <label className="campo">
          <span className="campo-rotulo">Preço (R$)</span>
          <input className="entrada" type="number" step={50} value={preco} onChange={(e) => setPreco(e.target.value)} />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Situação</span>
          <select className="selecao" value={ativo ? 'sim' : 'nao'} onChange={(e) => setAtivo(e.target.value === 'sim')}>
            <option value="sim">Ativo</option>
            <option value="nao">Inativo</option>
          </select>
        </label>
      </div>
      <label className="campo">
        <span className="campo-rotulo">Descrição</span>
        <textarea className="area-texto" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>
    </Modal>
  )
}
