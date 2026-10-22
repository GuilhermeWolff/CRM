import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Icone } from '../componentes/Icone'
import { Modal } from '../componentes/Modal'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { ItemOrcamento, Orcamento, Servico } from '../tipos'
import { brl, classe } from '../utils'

type Nivel = 'piso' | 'alvo' | 'teto'

const ROTULO_NIVEL: Record<Nivel, string> = {
  piso: 'Piso',
  alvo: 'Alvo',
  teto: 'Teto',
}

const AJUDA_NIVEL: Record<Nivel, string> = {
  piso: 'mínimo aceitável',
  alvo: 'preço recomendado',
  teto: 'máximo do mercado',
}

export function Orcamentos() {
  const { meta, versao, recarregar } = useCRM()
  const { avisar } = useToast()
  const navegar = useNavigate()

  const [tipo, setTipo] = useState('Site Institucional')
  const [paginas, setPaginas] = useState(5)
  const [extras, setExtras] = useState<string[]>([])
  const [desconto, setDesconto] = useState(0)
  const [horas, setHoras] = useState<number | null>(null)
  const [nivel, setNivel] = useState<Nivel>('alvo')
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
      .orcamento({ tipo_site: tipo, paginas, extras, desconto, horas })
      .then(setResultado)
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [tipo, paginas, extras, desconto, horas, avisar])

  const alternarExtra = (id: string) =>
    setExtras((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]))

  const trocarTipo = (novo: string) => {
    setTipo(novo)
    setHoras(null)
    const dados = meta.precos?.[novo]
    if (dados) setPaginas(dados.paginas_incluidas)
  }

  const valorNivel = !resultado
    ? 0
    : nivel === 'piso'
      ? resultado.piso
      : nivel === 'teto'
        ? resultado.teto
        : resultado.total

  const horaNivel = !resultado
    ? 0
    : nivel === 'piso'
      ? resultado.valor_hora_piso
      : nivel === 'teto'
        ? resultado.valor_hora_teto
        : resultado.valor_hora

  const horaMinima = meta.valor_hora_minimo ?? 90
  const horaIdeal = meta.valor_hora_ideal ?? 120
  const horaBaixa = horaNivel < horaMinima
  const horaAtencao = !horaBaixa && horaNivel < horaIdeal

  const criarNegociacao = () => {
    if (!resultado) return
    const escolhidos = resultado.extras
      .filter((extra) => extra.tipo !== 'mensal')
      .map((extra) => `${extra.nome}: ${brl(extra.total)}`)
      .join('\n')

    navegar('/cadastro', {
      state: {
        prefill: {
          tipo_site: tipo,
          paginas,
          extras: extras.join(','),
          desconto,
          valor: valorNivel,
          mensal: resultado.mensal,
          notas:
            `Orçamento pela calculadora (nível ${ROTULO_NIVEL[nivel].toLowerCase()}):\n` +
            `• ${tipo} — ${paginas} página(s)\n` +
            (escolhidos ? `${escolhidos}\n` : '') +
            `• Horas estimadas: ${resultado.horas_estimadas}h (${brl(horaNivel)}/h)\n` +
            `• Referências: piso ${brl(resultado.piso)} · alvo ${brl(resultado.total)} · teto ${brl(resultado.teto)}`,
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

  const itensTabela = (resultado?.extras ?? []).filter((item) => item.tipo !== 'mensal')
  const mensalItem = (resultado?.extras ?? []).find((item) => item.tipo === 'mensal')

  return (
    <div className="empilhado">
      <div className="calculadora">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Calculadora de orçamento</div>
              <div className="bloco-sub">
                Piso, alvo e teto de cada item — o teto é o máximo que o mercado paga
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
                    return (
                      <option key={item} value={item}>
                        {item}
                        {dados ? ` — alvo ${brl(dados.base)}` : ''}
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
          <div className="bloco-titulo mb">Resumo do orçamento</div>
          {resultado && (
            <>
              <div className="tabela-envolucro">
                <table className="tabela tabela-faixas">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="direita">Piso</th>
                      <th className="direita">Alvo</th>
                      <th className="direita">Teto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        {tipo}
                        <span className="dica"> · {resultado.paginas_incluidas} pág.</span>
                      </td>
                      <td className="direita mini">{brl(resultado.base_minimo)}</td>
                      <td className="direita mini negrito">{brl(resultado.base)}</td>
                      <td className="direita mini">{brl(resultado.base_maximo)}</td>
                    </tr>
                    {resultado.paginas_extras > 0 && (
                      <tr>
                        <td>Páginas extras ({resultado.paginas_extras})</td>
                        <td className="direita mini">{brl(resultado.paginas_extra_minimo)}</td>
                        <td className="direita mini negrito">{brl(resultado.paginas_extra)}</td>
                        <td className="direita mini">{brl(resultado.paginas_extra_maximo)}</td>
                      </tr>
                    )}
                    {itensTabela.map((item) => (
                      <tr key={item.id}>
                        <td>{rotuloItem(item)}</td>
                        <td className="direita mini">{brl(item.total_minimo)}</td>
                        <td className="direita mini negrito">{brl(item.total)}</td>
                        <td className="direita mini">{brl(item.total_maximo)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="negrito">Subtotal</td>
                      <td className="direita mini">{brl(resultado.subtotal_minimo)}</td>
                      <td className="direita mini negrito">{brl(resultado.subtotal)}</td>
                      <td className="direita mini">{brl(resultado.subtotal_maximo)}</td>
                    </tr>
                    {resultado.desconto > 0 && (
                      <tr>
                        <td>Desconto ({resultado.desconto}%)</td>
                        <td className="direita mini texto-erro">- {brl(resultado.subtotal_minimo - resultado.piso)}</td>
                        <td className="direita mini texto-erro">- {brl(resultado.desconto_valor)}</td>
                        <td className="direita mini texto-erro">- {brl(resultado.subtotal_maximo - resultado.teto)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="niveis mt">
                {(['piso', 'alvo', 'teto'] as Nivel[]).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    className={classe('nivel', nivel === opcao && 'ativo')}
                    onClick={() => setNivel(opcao)}
                  >
                    <span className="nivel-rotulo">{ROTULO_NIVEL[opcao]}</span>
                    <span className="nivel-valor">
                      {brl(opcao === 'piso' ? resultado.piso : opcao === 'teto' ? resultado.teto : resultado.total)}
                    </span>
                    <span className="dica">{AJUDA_NIVEL[opcao]}</span>
                  </button>
                ))}
              </div>

              <div className="resultado-total">
                <span className="bloco-titulo">Proposta</span>
                <span className="valor">{brl(valorNivel)}</span>
              </div>

              <div className="resultado-linha">
                <span>Tempo estimado</span>
                <span className="negrito">~{resultado.horas_estimadas}h</span>
              </div>
              <div className={classe('resultado-linha', 'ultima')}>
                <span>Sua hora nesse nível</span>
                <span
                  className={classe(
                    'negrito',
                    horaBaixa ? 'texto-erro' : horaAtencao ? 'texto-alerta' : 'texto-ok',
                  )}
                >
                  {brl(horaNivel)}/h
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
                  Entre {brl(horaMinima)}/h e {brl(horaIdeal)}/h. Fecha, mas é o mínimo aceitável — use o alvo
                  ou o teto quando o cliente tiver urgência ou escopo maior.
                </div>
              )}

              {mensalItem && (
                <div className="resultado-linha ultima mt">
                  <span>Manutenção sugerida</span>
                  <span className="negrito texto-ok">
                    {brl(mensalItem.total_minimo)} a {brl(mensalItem.total_maximo)}/mês
                  </span>
                </div>
              )}

              <div className="empilhado mt">
                <button className="botao botao-primario" onClick={criarNegociacao}>
                  <Icone nome="mais" tamanho={15} />
                  Criar negociação com {brl(valorNivel)}
                </button>
                <span className="dica">
                  Abre o cadastro completo já preenchido para você ajustar cliente, prazo e condições.
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
              Piso, preço alvo e teto de cada serviço — o teto é o máximo que dá para cobrar com escopo premium
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
                <th className="direita">Piso</th>
                <th className="direita">Alvo</th>
                <th className="direita">Teto</th>
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
          <span className="campo-rotulo">Piso (R$)</span>
          <input
            className="entrada"
            type="number"
            step={50}
            value={precoMinimo}
            onChange={(e) => setPrecoMinimo(e.target.value)}
            placeholder="não descer abaixo"
          />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Alvo (R$)</span>
          <input className="entrada" type="number" step={50} value={preco} onChange={(e) => setPreco(e.target.value)} />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Teto (R$)</span>
          <input
            className="entrada"
            type="number"
            step={50}
            value={precoMaximo}
            onChange={(e) => setPrecoMaximo(e.target.value)}
            placeholder="máximo do mercado"
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
