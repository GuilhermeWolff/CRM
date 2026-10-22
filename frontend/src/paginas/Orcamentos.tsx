import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Icone } from '../componentes/Icone'
import { Modal } from '../componentes/Modal'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { ItemOrcamento, Orcamento, Servico } from '../tipos'
import { brl, classe } from '../utils'

export function Orcamentos() {
  const { meta, versao, recarregar } = useCRM()
  const { avisar } = useToast()
  const navegar = useNavigate()

  const [tipo, setTipo] = useState('Site Institucional')
  const [paginas, setPaginas] = useState(5)
  const [extras, setExtras] = useState<string[]>([])
  const [desconto, setDesconto] = useState(0)
  const [horas, setHoras] = useState<number | null>(null)
  const [plano, setPlano] = useState(meta.plano_padrao ?? 'profissional')
  const [resultado, setResultado] = useState<Orcamento | null>(null)

  const [servicos, setServicos] = useState<Servico[]>([])
  const [emEdicao, setEmEdicao] = useState<Partial<Servico> | null>(null)
  const [formAberto, setFormAberto] = useState(false)

  const preco = meta.precos?.[tipo]
  const incluidas = preco?.paginas_incluidas ?? 1
  const descontoMaximo = meta.desconto_maximo ?? 25

  useEffect(() => {
    api.servicos().then(setServicos).catch(() => setServicos([]))
  }, [versao])

  useEffect(() => {
    api
      .orcamento({ tipo_site: tipo, paginas, extras, desconto, horas, plano })
      .then(setResultado)
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [tipo, paginas, extras, desconto, horas, plano, avisar])

  const alternarExtra = (id: string) =>
    setExtras((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]))

  const trocarTipo = (novo: string) => {
    setTipo(novo)
    setHoras(null)
    const dados = meta.precos?.[novo]
    if (dados) setPaginas(dados.paginas_incluidas)
  }

  const planoAtual =
    resultado?.planos.find((item) => item.id === plano) ??
    resultado?.planos.find((item) => item.recomendado) ??
    resultado?.planos[0] ??
    null
  const valorPlano = planoAtual?.total ?? 0
  const horaPlano = planoAtual?.valor_hora ?? 0

  const horaMinima = meta.valor_hora_minimo ?? 90
  const horaIdeal = meta.valor_hora_ideal ?? 120
  const horaBaixa = horaPlano < horaMinima
  const horaAtencao = !horaBaixa && horaPlano < horaIdeal

  const criarNegociacao = () => {
    if (!resultado || !planoAtual) return
    const escolhidos = planoAtual.adicionais
      .filter((extra) => extra.tipo !== 'mensal')
      .map((extra) => `${extra.nome}: ${brl(extra.total)}`)
      .join('\n')

    navegar('/cadastro', {
      state: {
        prefill: {
          tipo_site: tipo,
          plano: planoAtual.id,
          paginas,
          extras: extras.join(','),
          desconto,
          valor: valorPlano,
          mensal: planoAtual.mensal,
          notas:
            `Orçamento pela calculadora (plano ${planoAtual.nome}):\n` +
            `• ${tipo} — ${paginas} página(s)\n` +
            (escolhidos ? `${escolhidos}\n` : '') +
            `• Horas estimadas: ${planoAtual.horas}h (${brl(horaPlano)}/h)\n` +
            `• Planos: ${resultado.planos.map((item) => `${item.nome} ${brl(item.total)}`).join(' · ')}`,
        },
      },
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

  const itensMes = (planoAtual?.adicionais ?? []).filter((item) => item.tipo === 'mensal')

  return (
    <div className="empilhado">
      <div className="calculadora">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Calculadora de orçamento</div>
              <div className="bloco-sub">
                Três planos por projeto: Essencial, Profissional e Premium
              </div>
            </div>
          </div>

          <div className="empilhado">
            <div className="campo-linha">
              <label className="campo">
                <span className="campo-rotulo">Tipo de projeto</span>
                <select className="selecao" value={tipo} onChange={(e) => trocarTipo(e.target.value)}>
                  {meta.tipos_site.map((item) => {
                    const dados = meta.precos?.[item]
                    const valor = dados?.planos?.profissional?.preco
                    return (
                      <option key={item} value={item}>
                        {item}
                        {valor ? ` — a partir de ${brl(valor)}` : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="campo">
                <span className="campo-rotulo">Páginas / telas</span>
                <input
                  className="entrada"
                  type="number"
                  min={1}
                  max={200}
                  value={paginas}
                  onChange={(e) => setPaginas(Math.max(1, Number(e.target.value) || 1))}
                />
                <span className="dica">
                  {incluidas} incluída(s) · extra {brl(preco?.pagina_extra ?? 0)} ({brl(preco?.pagina_extra_minimo ?? 0)} a {brl(preco?.pagina_extra_maximo ?? 0)})
                </span>
              </label>
            </div>

            <div className="campo-linha">
              <label className="campo">
                <span className="campo-rotulo">Horas estimadas</span>
                <input
                  className="entrada"
                  type="number"
                  min={1}
                  value={horas ?? ''}
                  placeholder={String(resultado?.horas_estimadas ?? meta.horas_por_tipo?.[tipo] ?? '')}
                  onChange={(e) => setHoras(e.target.value ? Math.max(1, Number(e.target.value)) : null)}
                />
                <span className="dica">Vazio = automático pelo tipo e extras</span>
              </label>
              <label className="campo">
                <span className="campo-rotulo">
                  Desconto: {desconto}% (máximo {descontoMaximo}%)
                </span>
                <input
                  type="range"
                  min={0}
                  max={descontoMaximo}
                  step={1}
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="dica">Acima disso, corte escopo em vez de preço</span>
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
                          ? `+${extra.valor}% (teto +${extra.maximo}%)`
                          : extra.tipo === 'mensal'
                            ? `${extra.valor}% do projeto (mín. ${brl(extra.minimo)})`
                            : extra.tipo === 'por_pagina'
                              ? `${brl(extra.valor)}/página (até ${brl(extra.maximo)})`
                              : `${brl(extra.valor)} (até ${brl(extra.maximo)})`}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="calculadora-resultado">
          <div className="bloco-titulo mb">Três planos para o cliente</div>
          {resultado && planoAtual && (
            <>
              <div className="planos">
                {resultado.planos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={classe('plano-cartao', planoAtual.id === item.id && 'ativo')}
                    onClick={() => setPlano(item.id)}
                  >
                    <span className="plano-topo">
                      <span className="plano-nome">{item.nome}</span>
                      {item.recomendado && <span className="chip chip-ok">recomendado</span>}
                    </span>
                    <span className="plano-preco">{brl(item.preco_escopo)}</span>
                    <span className="dica">{item.resumo}</span>
                    <span className="plano-rodape">
                      ~{item.horas}h · {brl(item.valor_hora)}/h
                    </span>
                  </button>
                ))}
              </div>
              <div className="dica mt">
                Valores do pacote. Os extras marcados entram no plano escolhido e aparecem na composição
                abaixo.
              </div>

              <details className="detalhes-plano mt">
                <summary>O que inclui o plano {planoAtual.nome}</summary>
                <ul className="lista-inclui">
                  {planoAtual.inclui.map((linha) => (
                    <li key={linha}>{linha}</li>
                  ))}
                </ul>
              </details>

              <div className="tabela-envolucro mt">
                <table className="tabela tabela-faixas">
                  <tbody>
                    <tr>
                      <td>Pacote {planoAtual.nome}</td>
                      <td className="direita mini negrito">{brl(planoAtual.preco)}</td>
                    </tr>
                    {planoAtual.paginas_extras > 0 && (
                      <tr>
                        <td>Páginas extras ({planoAtual.paginas_extras})</td>
                        <td className="direita mini">{brl(planoAtual.valor_paginas)}</td>
                      </tr>
                    )}
                    {planoAtual.adicionais
                      .filter((item) => item.tipo !== 'mensal')
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{rotuloItem(item)}</td>
                          <td className="direita mini">{brl(item.total)}</td>
                        </tr>
                      ))}
                    <tr>
                      <td className="negrito">Subtotal</td>
                      <td className="direita mini negrito">{brl(planoAtual.subtotal)}</td>
                    </tr>
                    {planoAtual.desconto_valor > 0 && (
                      <tr>
                        <td>Desconto ({resultado.desconto}%)</td>
                        <td className="direita mini texto-erro">- {brl(planoAtual.desconto_valor)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="negrito">Total do plano</td>
                      <td className="direita negrito">{brl(planoAtual.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="resultado-linha mt">
                <span>Tempo estimado</span>
                <span className="negrito">~{planoAtual.horas}h</span>
              </div>
              <div className={classe('resultado-linha', 'ultima')}>
                <span>Sua hora nesse plano</span>
                <span
                  className={classe(
                    'negrito',
                    horaBaixa ? 'texto-erro' : horaAtencao ? 'texto-alerta' : 'texto-ok',
                  )}
                >
                  {brl(horaPlano)}/h
                </span>
              </div>

              {horaBaixa && (
                <div className="aviso mt">
                  Abaixo de {brl(horaMinima)}/h. Suba o preço, reduza o escopo ou renegocie o prazo antes de
                  enviar a proposta.
                </div>
              )}
              {horaAtencao && (
                <div className="aviso aviso-neutro mt">
                  Entre {brl(horaMinima)}/h e {brl(horaIdeal)}/h. Fecha, mas é o mínimo aceitável — prefira o
                  Profissional ou o Premium quando o cliente tiver urgência ou escopo maior.
                </div>
              )}

              {itensMes.length > 0 && planoAtual.mensal > 0 && (
                <div className="resultado-linha ultima mt">
                  <span>Manutenção sugerida</span>
                  <span className="negrito texto-ok">
                    {brl(resultado.mensal_minimo)} a {brl(resultado.mensal_maximo)}/mês
                  </span>
                </div>
              )}

              <div className="empilhado mt">
                <button className="botao botao-primario" onClick={criarNegociacao}>
                  <Icone nome="mais" tamanho={15} />
                  Criar negociação no plano {planoAtual.nome} — {brl(planoAtual.total)}
                </button>
                <span className="dica">
                  Abre o cadastro completo já preenchido com o plano escolhido para ajustar cliente, prazo e
                  condições.
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
            <div className="bloco-sub">
              Preço de cada serviço nos três planos: Essencial, Profissional e Premium
            </div>
          </div>
          <button
            className="botao botao-primario botao-mini"
            onClick={() => {
              setEmEdicao({ ativo: true, preco: 0, preco_minimo: 0, preco_maximo: 0 })
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
                <th className="direita">Essencial</th>
                <th className="direita">Profissional</th>
                <th className="direita">Premium</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {servicos.map((servico) => (
                <tr key={servico.id}>
                  <td>
                    <div className="negrito">{servico.nome}</div>
                    <div className="mini texto-suave">{servico.descricao ?? '—'}</div>
                  </td>
                  <td className="direita mini">{servico.preco_minimo != null ? brl(servico.preco_minimo) : '—'}</td>
                  <td className="direita negrito">{brl(servico.preco)}</td>
                  <td className="direita mini">{servico.preco_maximo != null ? brl(servico.preco_maximo) : '—'}</td>
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
                        title="Editar"
                      >
                        <Icone nome="lapis" tamanho={14} />
                      </button>
                      <button className="botao botao-mini botao-perigo" onClick={() => excluirServico(servico)} title="Excluir">
                        <Icone nome="lixeira" tamanho={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {servicos.length === 0 && (
                <tr>
                  <td colSpan={6} className="texto-suave">
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

function rotuloItem(item: ItemOrcamento) {
  if (item.tipo === 'percentual') return `${item.nome} (+${item.valor}%)`
  if (item.tipo === 'por_pagina') return `${item.nome} (${item.quantidade}× ${brl(item.valor)})`
  return item.nome
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
  const [precoMinimo, setPrecoMinimo] = useState('')
  const [precoMaximo, setPrecoMaximo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [chave, setChave] = useState('')

  const identificador = `${aberto}-${inicial?.id ?? 'novo'}`
  if (chave !== identificador) {
    setChave(identificador)
    if (aberto) {
      setNome(inicial?.nome ?? '')
      setPreco(String(inicial?.preco ?? 0))
      setPrecoMinimo(inicial?.preco_minimo != null ? String(inicial.preco_minimo) : '')
      setPrecoMaximo(inicial?.preco_maximo != null ? String(inicial.preco_maximo) : '')
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
            onClick={() =>
              aoSalvar({
                nome: nome.trim(),
                preco: Number(preco) || 0,
                preco_minimo: precoMinimo ? Number(precoMinimo) || 0 : null,
                preco_maximo: precoMaximo ? Number(precoMaximo) || 0 : null,
                descricao,
                ativo,
              })
            }
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
      <div className="campo-linha-3">
        <label className="campo">
          <span className="campo-rotulo">Essencial (R$)</span>
          <input
            className="entrada"
            type="number"
            step={50}
            value={precoMinimo}
            onChange={(e) => setPrecoMinimo(e.target.value)}
            placeholder="preço de entrada"
          />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Profissional (R$)</span>
          <input className="entrada" type="number" step={50} value={preco} onChange={(e) => setPreco(e.target.value)} />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Premium (R$)</span>
          <input
            className="entrada"
            type="number"
            step={50}
            value={precoMaximo}
            onChange={(e) => setPrecoMaximo(e.target.value)}
            placeholder="preço mais alto"
          />
        </label>
      </div>
      <div className="campo-linha">
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
