import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Icone } from '../componentes/Icone'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Negociacao, Orcamento } from '../tipos'
import { brl, classe, diasAte, hojeISO, paraDataInput, rotuloPrazo } from '../utils'

/** Campos do cadastro (todos como texto; convertidos ao salvar). */
type Campos = Record<string, string>

/** Valores vindos da calculadora de orçamento. */
interface Prefill {
  tipo_site?: string
  plano?: string
  paginas?: number
  extras?: string
  desconto?: number
  valor?: number
  mensal?: number
  notas?: string
}

function formularioInicial(tipoPadrao: string, paginas: number, prefill?: Prefill | null): Campos {
  return {
    cliente_nome: '',
    contato: '',
    whatsapp: '',
    email: '',
    segmento: '',
    site: '',

    titulo: '',
    tipo_site: prefill?.tipo_site ?? tipoPadrao,
    plano: prefill?.plano ?? 'profissional',
    paginas: String(prefill?.paginas ?? paginas),
    prazo_entrega: '',
    follow_up: hojeISO(),

    valor: prefill?.valor ? String(prefill.valor) : '',
    mensal: prefill?.mensal ? String(prefill.mensal) : '',
    desconto: String(prefill?.desconto ?? 0),
    entrada: '',
    parcelas: '1',
    forma_pagamento: '',

    estagio: 'lead',
    probabilidade: '10',
    fonte: 'Indicação',
    notas: prefill?.notas ?? '',
  }
}

export function Cadastro() {
  const { meta, clientes, recarregar } = useCRM()
  const { avisar } = useToast()
  const navegar = useNavigate()
  const local = useLocation()
  const { id } = useParams()
  const editando = id ? Number(id) : null
  const prefill = (local.state as { prefill?: Prefill } | null)?.prefill ?? null

  const tipoPadrao = 'Site Institucional'

  const [form, setForm] = useState<Campos>(() =>
    formularioInicial(
      tipoPadrao,
      meta.precos?.[tipoPadrao]?.paginas_incluidas ?? 5,
      prefill,
    ),
  )
  const [extras, setExtras] = useState<string[]>(() =>
    (prefill?.extras ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  const [sugestao, setSugestao] = useState<Orcamento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(Boolean(editando))
  const [clienteOriginal, setClienteOriginal] = useState<{ id: number | null; nome: string } | null>(null)

  // Carrega a negociação quando a tela é aberta para edição
  useEffect(() => {
    if (!editando) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    api
      .negociacao(editando)
      .then((neg) => preencher(neg))
      .catch((erro) => {
        avisar((erro as Error).message, 'erro')
        navegar('/funil')
      })
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando])

  // Sugestão de valor acompanha tipo, páginas, extras e desconto
  useEffect(() => {
    let ativo = true
    api
      .orcamento({
        tipo_site: form.tipo_site,
        plano: form.plano || undefined,
        paginas: Math.max(1, Number(form.paginas) || 1),
        extras,
        desconto: Math.max(0, Number(form.desconto) || 0),
      })
      .then((resultado) => {
        if (ativo) setSugestao(resultado)
      })
      .catch(() => setSugestao(null))
    return () => {
      ativo = false
    }
  }, [form.tipo_site, form.plano, form.paginas, form.desconto, extras])

  function preencher(neg: Negociacao) {
    setForm({
      cliente_nome: neg.cliente_nome ?? '',
      contato: neg.contato ?? '',
      whatsapp: neg.whatsapp ?? '',
      email: neg.email ?? '',
      segmento: '',
      site: '',
      titulo: neg.titulo ?? '',
      tipo_site: neg.tipo_site ?? 'Site Institucional',
      plano: neg.plano ?? '',
      paginas: String(neg.paginas ?? 1),
      prazo_entrega: paraDataInput(neg.prazo_entrega),
      follow_up: paraDataInput(neg.follow_up),
      valor: String(neg.valor ?? ''),
      mensal: String(neg.mensal ?? ''),
      desconto: String(neg.desconto ?? 0),
      entrada: String(neg.entrada ?? ''),
      parcelas: String(neg.parcelas ?? 1),
      forma_pagamento: neg.forma_pagamento ?? '',
      estagio: neg.estagio ?? 'lead',
      probabilidade: String(neg.probabilidade ?? 10),
      fonte: neg.fonte ?? '',
      notas: neg.notas ?? '',
    })
    setExtras(
      (neg.extras ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
    setClienteOriginal({ id: neg.cliente_id, nome: neg.cliente_nome ?? '' })
    // Completa segmento/site com o cadastro do cliente, se existir
    const cliente = clientes.find((item) => item.id === neg.cliente_id)
    if (cliente) {
      setForm((atual) => ({
        ...atual,
        segmento: cliente.segmento ?? '',
        site: cliente.site ?? '',
      }))
    }
  }

  const alterar = (campo: string, valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }))

  const trocarEstagio = (estagio: string) => {
    const padrao = meta.estagios.find((item) => item.id === estagio)?.prob ?? 10
    setForm((atual) => ({ ...atual, estagio, probabilidade: String(padrao) }))
  }

  /** Ao escolher um cliente já cadastrado, completa os dados de contato. */
  const escolherCliente = (nome: string) => {
    setForm((atual) => ({ ...atual, cliente_nome: nome }))
    const cliente = clientes.find((item) => item.nome.toLowerCase() === nome.trim().toLowerCase())
    if (!cliente) return
    setForm((atual) => ({
      ...atual,
      cliente_nome: cliente.nome,
      contato: atual.contato || cliente.contato || '',
      whatsapp: atual.whatsapp || cliente.whatsapp || '',
      email: atual.email || cliente.email || '',
      segmento: cliente.segmento ?? atual.segmento,
      site: cliente.site ?? atual.site,
    }))
  }

  const alternarExtra = (idExtra: string) =>
    setExtras((atual) =>
      atual.includes(idExtra) ? atual.filter((item) => item !== idExtra) : [...atual, idExtra],
    )

  const valorFinal = form.valor !== '' ? Number(form.valor) || 0 : (sugestao?.total ?? 0)
  const entrada = Number(form.entrada) || 0
  const parcelas = Math.max(1, Number(form.parcelas) || 1)
  const saldo = Math.max(0, valorFinal - entrada)
  const valorParcela = saldo / parcelas
  const mensal = Number(form.mensal) || 0
  const dias = diasAte(form.follow_up)
  const estagio = meta.estagios.find((item) => item.id === form.estagio)
  const desconto = Math.max(0, Number(form.desconto) || 0)
  const precoTipo = meta.precos?.[form.tipo_site]
  const teto = sugestao?.teto ?? 0
  const planoNome = sugestao?.planos.find((item) => item.id === form.plano)?.nome ?? ''
  const acimaDoTeto = teto > 0 && valorFinal > teto

  const usarSugestao = () => {
    if (!sugestao) return
    setForm((atual) => ({
      ...atual,
      plano: sugestao.plano_selecionado,
      valor: String(sugestao.total),
      mensal: sugestao.mensal > 0 ? String(sugestao.mensal) : atual.mensal,
    }))
  }

  /** Escolher um plano preenche o valor do projeto com o total daquele plano. */
  const escolherPlano = (id: string) => {
    const plano = sugestao?.planos.find((item) => item.id === id)
    setForm((atual) => ({
      ...atual,
      plano: id,
      valor: plano ? String(plano.total) : atual.valor,
      mensal: plano && plano.mensal > 0 ? String(plano.mensal) : atual.mensal,
    }))
  }

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    const nome = form.cliente_nome.trim()
    if (!nome) {
      avisar('Informe o nome do cliente.', 'erro')
      return
    }

    const mesmoCliente = editando
      ? clienteOriginal !== null && clienteOriginal.nome.trim().toLowerCase() === nome.toLowerCase()
      : false

    const dados = {
      titulo: form.titulo.trim() || nome,
      cliente_nome: nome,
      cliente_id: mesmoCliente ? (clienteOriginal?.id ?? null) : null,
      segmento: form.segmento.trim() || null,
      site: form.site.trim() || null,
      contato: form.contato.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      tipo_site: form.tipo_site,
      plano: form.plano || null,
      valor: Number(form.valor) || 0,
      mensal: Number(form.mensal) || 0,
      paginas: Math.max(1, Number(form.paginas) || 1),
      extras: extras.join(',') || null,
      desconto,
      entrada,
      parcelas,
      forma_pagamento: form.forma_pagamento || null,
      estagio: form.estagio,
      probabilidade: Number(form.probabilidade) || 0,
      fonte: form.fonte || null,
      follow_up: form.follow_up || null,
      prazo_entrega: form.prazo_entrega || null,
      notas: form.notas.trim() || null,
    }

    setSalvando(true)
    try {
      if (editando) await api.atualizarNegociacao(editando, dados)
      else await api.criarNegociacao(dados)
      recarregar()
      avisar(editando ? 'Cadastro atualizado.' : 'Negociação cadastrada.')
      navegar('/funil')
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return <div className="carregando">Carregando cadastro...</div>
  }

  return (
    <form className="cadastro" onSubmit={enviar}>
      <div className="cadastro-coluna">
        {/* ------------------------------- Cliente ------------------------------ */}
        <section className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Cliente</div>
              <div className="bloco-sub">Quem está contratando o projeto</div>
            </div>
          </div>

          <div className="empilhado">
            <div className="campo-linha">
              <label className="campo">
                <span className="campo-rotulo">Nome do cliente *</span>
                <input
                  className="entrada"
                  list="lista-clientes-cadastro"
                  value={form.cliente_nome}
                  onChange={(evento) => escolherCliente(evento.target.value)}
                  placeholder="Ex.: Padaria Pão Quente"
                  required
                />
                <datalist id="lista-clientes-cadastro">
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.nome} />
                  ))}
                </datalist>
              </label>
              <label className="campo">
                <span className="campo-rotulo">Pessoa de contato</span>
                <input
                  className="entrada"
                  value={form.contato}
                  onChange={(evento) => alterar('contato', evento.target.value)}
                  placeholder="Nome de quem responde"
                />
              </label>
            </div>

            <div className="campo-linha-3">
              <label className="campo">
                <span className="campo-rotulo">WhatsApp</span>
                <input
                  className="entrada"
                  value={form.whatsapp}
                  onChange={(evento) => alterar('whatsapp', evento.target.value)}
                  placeholder="(41) 90000-0000"
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">E-mail</span>
                <input
                  className="entrada"
                  type="email"
                  value={form.email}
                  onChange={(evento) => alterar('email', evento.target.value)}
                  placeholder="contato@cliente.com"
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Segmento</span>
                <input
                  className="entrada"
                  value={form.segmento}
                  onChange={(evento) => alterar('segmento', evento.target.value)}
                  placeholder="Ex.: alimentação, saúde, beleza"
                />
              </label>
            </div>

            <label className="campo">
              <span className="campo-rotulo">Site atual / rede social</span>
              <input
                className="entrada"
                value={form.site}
                onChange={(evento) => alterar('site', evento.target.value)}
                placeholder="https://... ou @instagram"
              />
            </label>
          </div>
        </section>

        {/* ------------------------------- Projeto ------------------------------ */}
        <section className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Projeto</div>
              <div className="bloco-sub">O que vai ser entregue e para quando</div>
            </div>
          </div>

          <div className="empilhado">
            <div className="campo-linha">
              <label className="campo">
                <span className="campo-rotulo">Nome do projeto</span>
                <input
                  className="entrada"
                  value={form.titulo}
                  onChange={(evento) => alterar('titulo', evento.target.value)}
                  placeholder="Ex.: Site institucional + agendamento"
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Tipo de site</span>
                <select
                  className="selecao"
                  value={form.tipo_site}
                  onChange={(evento) => alterar('tipo_site', evento.target.value)}
                >
                  {meta.tipos_site.map((tipo) => {
                    const valor = meta.precos?.[tipo]?.planos?.profissional?.preco
                    return (
                      <option key={tipo} value={tipo}>
                        {tipo}
                        {valor ? ` — a partir de ${brl(valor)}` : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>

            <div className="campo-linha-3">
              <label className="campo">
                <span className="campo-rotulo">Páginas / telas</span>
                <input
                  className="entrada"
                  type="number"
                  min={1}
                  max={200}
                  value={form.paginas}
                  onChange={(evento) => alterar('paginas', evento.target.value)}
                />
                <span className="dica">
                  {precoTipo?.paginas_incluidas ?? 1} incluída(s) · +{brl(precoTipo?.pagina_extra ?? 0)} por extra
                </span>
              </label>
              <label className="campo">
                <span className="campo-rotulo">Prazo de entrega</span>
                <input
                  className="entrada"
                  type="date"
                  value={form.prazo_entrega}
                  onChange={(evento) => alterar('prazo_entrega', evento.target.value)}
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Próximo follow-up</span>
                <input
                  className="entrada"
                  type="date"
                  value={form.follow_up}
                  onChange={(evento) => alterar('follow_up', evento.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        {/* ------------------------------- Escopo ------------------------------- */}
        <section className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Escopo e variações</div>
              <div className="bloco-sub">Marque o que entra no projeto — o valor sugerido se ajusta sozinho</div>
            </div>
          </div>

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
        </section>

        {/* ------------------------------- Valores ------------------------------ */}
        <section className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Valores e condições</div>
              <div className="bloco-sub">Quanto custa e como o cliente paga</div>
            </div>
          </div>

          <div className="empilhado">
            {sugestao && sugestao.planos.length > 0 && (
              <>
                <div className="campo-rotulo">Plano oferecido ao cliente</div>
                <div className="planos">
                  {sugestao.planos.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={classe('plano-cartao', form.plano === item.id && 'ativo')}
                      onClick={() => escolherPlano(item.id)}
                    >
                      <span className="plano-topo">
                        <span className="plano-nome">{item.nome}</span>
                        {item.recomendado && <span className="chip chip-ok">recomendado</span>}
                      </span>
                      <span className="plano-preco">{brl(item.preco_escopo)}</span>
                      <span className="dica">{item.resumo}</span>
                    </button>
                  ))}
                </div>
                <div className="dica">
                  O valor do projeto acompanha o plano escolhido, já com os extras que ele não inclui.
                </div>
                {(() => {
                  const escolhido = sugestao.planos.find((item) => item.id === form.plano)
                  if (!escolhido) return null
                  return (
                    <details className="detalhes-plano">
                      <summary>O que inclui o plano {escolhido.nome}</summary>
                      <ul className="lista-inclui">
                        {escolhido.inclui.map((linha) => (
                          <li key={linha}>{linha}</li>
                        ))}
                      </ul>
                    </details>
                  )
                })()}
              </>
            )}

            <div className="campo-linha-3">
              <label className="campo">
                <span className="campo-rotulo">Valor do projeto (R$)</span>
                <input
                  className="entrada"
                  type="number"
                  min={0}
                  step={50}
                  value={form.valor}
                  onChange={(evento) => alterar('valor', evento.target.value)}
                  placeholder={sugestao ? String(sugestao.total) : '0'}
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Manutenção mensal (R$)</span>
                <input
                  className="entrada"
                  type="number"
                  min={0}
                  step={50}
                  value={form.mensal}
                  onChange={(evento) => alterar('mensal', evento.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Desconto (%)</span>
                <input
                  className="entrada"
                  type="number"
                  min={0}
                  max={meta.desconto_maximo ?? 25}
                  step={1}
                  value={form.desconto}
                  onChange={(evento) => alterar('desconto', evento.target.value)}
                />
                <span className="dica">Máximo recomendado: {meta.desconto_maximo ?? 25}%</span>
              </label>
            </div>

            <div className="dica">
              Planos: Essencial <strong>{brl(sugestao?.planos?.[0]?.preco_escopo ?? 0)}</strong> · Profissional{' '}
              <strong>{brl(sugestao?.planos?.[1]?.preco_escopo ?? 0)}</strong> · Premium{' '}
              <strong>{brl(sugestao?.planos?.[2]?.preco_escopo ?? 0)}</strong>
              {desconto > 0 && <> · com {desconto}% de desconto fica {brl(sugestao?.total ?? 0)}</>}
              {sugestao && Number(form.valor) !== sugestao.total && (
                <button className="botao botao-mini" type="button" onClick={usarSugestao} style={{ marginLeft: 8 }}>
                  <Icone nome="raio" tamanho={13} />
                  Usar sugerido
                </button>
              )}
            </div>

            {acimaDoTeto && (
              <div className="aviso">
                Acima do plano Premium ({brl(teto)}). Só sustente esse valor com escopo ou prazo que justifiquem.
              </div>
            )}

            <div className="campo-linha-3">
              <label className="campo">
                <span className="campo-rotulo">Entrada (R$)</span>
                <input
                  className="entrada"
                  type="number"
                  min={0}
                  step={50}
                  value={form.entrada}
                  onChange={(evento) => alterar('entrada', evento.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Parcelas</span>
                <input
                  className="entrada"
                  type="number"
                  min={1}
                  max={36}
                  value={form.parcelas}
                  onChange={(evento) => alterar('parcelas', evento.target.value)}
                />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Forma de pagamento</span>
                <select
                  className="selecao"
                  value={form.forma_pagamento}
                  onChange={(evento) => alterar('forma_pagamento', evento.target.value)}
                >
                  <option value="">—</option>
                  {(meta.formas_pagamento ?? []).map((forma) => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="dica">
              {parcelas > 1
                ? `Entrada de ${brl(entrada)} + ${parcelas}x de ${brl(valorParcela)}`
                : `Pagamento único de ${brl(valorFinal)}`}
            </div>
          </div>
        </section>

        {/* -------------------------------- Funil ------------------------------- */}
        <section className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Funil</div>
              <div className="bloco-sub">Onde essa negociação está agora</div>
            </div>
          </div>

          <div className="campo-linha-3">
            <label className="campo">
              <span className="campo-rotulo">Estágio</span>
              <select
                className="selecao"
                value={form.estagio}
                onChange={(evento) => trocarEstagio(evento.target.value)}
              >
                {meta.estagios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
              {estagio?.descricao && <span className="dica">{estagio.descricao}</span>}
            </label>
            <label className="campo">
              <span className="campo-rotulo">Probabilidade (%)</span>
              <input
                className="entrada"
                type="number"
                min={0}
                max={100}
                step={5}
                value={form.probabilidade}
                onChange={(evento) => alterar('probabilidade', evento.target.value)}
              />
            </label>
            <label className="campo">
              <span className="campo-rotulo">Origem do contato</span>
              <select
                className="selecao"
                value={form.fonte}
                onChange={(evento) => alterar('fonte', evento.target.value)}
              >
                <option value="">—</option>
                {meta.fontes.map((fonte) => (
                  <option key={fonte} value={fonte}>
                    {fonte}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* ----------------------------- Observações ---------------------------- */}
        <section className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Observações</div>
              <div className="bloco-sub">Escopo detalhado, referências, combinados</div>
            </div>
          </div>
          <label className="campo">
            <textarea
              className="area-texto"
              rows={5}
              value={form.notas}
              onChange={(evento) => alterar('notas', evento.target.value)}
              placeholder="Referências visuais, integrações, conteúdo que o cliente vai enviar, condições combinadas..."
            />
          </label>
        </section>
      </div>

      {/* ------------------------------- Resumo ------------------------------- */}
      <aside className="cadastro-resumo">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Prévia do card</div>
            <span className="chip chip-accent">{estagio?.nome}</span>
          </div>

          <article className="cartao-neg previa-cartao">
            <div className="cartao-topo">
              <span className="cartao-titulo">{form.cliente_nome || 'Nome do cliente'}</span>
            </div>
            <div className="cartao-sub">
              {form.tipo_site}
              {planoNome ? ` · ${planoNome}` : ''}
              {form.contato ? ` · ${form.contato}` : ''}
            </div>
            <div className="dica">
              {Math.max(1, Number(form.paginas) || 1)} página(s)
              {extras.length > 0 ? ` · ${extras.length} extra(s)` : ''}
              {desconto > 0 ? ` · ${desconto}% off` : ''}
            </div>
            <div className="cartao-rodape">
              <span className="cartao-valor">{brl(valorFinal)}</span>
              <span className={classe('chip', dias !== null && dias < 0 ? 'chip-erro' : 'chip')}>
                {dias === null ? 'sem follow-up' : rotuloPrazo(dias)}
              </span>
            </div>
            {mensal > 0 && <div className="dica mt">+ {brl(mensal)}/mês de manutenção</div>}
          </article>

          <div className="dica mt">É assim que a negociação aparece no funil.</div>
        </div>

        <div className="bloco">
          <div className="bloco-titulo mb">Resumo</div>

          <div className="resultado-linha">
            <span>Subtotal do plano</span>
            <span className="negrito">{brl(sugestao?.subtotal ?? 0)}</span>
          </div>
          {desconto > 0 && (
            <div className="resultado-linha">
              <span>Desconto ({desconto}%)</span>
              <span className="negrito texto-erro">- {brl(sugestao?.desconto_valor ?? 0)}</span>
            </div>
          )}
          <div className="resultado-total">
            <span className="bloco-titulo">Valor final</span>
            <span className="valor">{brl(valorFinal)}</span>
          </div>

          <div className="resultado-linha">
            <span>Essencial</span>
            <span className="negrito">{brl(sugestao?.planos?.[0]?.preco_escopo ?? 0)}</span>
          </div>
          <div className="resultado-linha">
            <span>Premium</span>
            <span className="negrito">{brl(sugestao?.planos?.[2]?.preco_escopo ?? 0)}</span>
          </div>
          <div className="resultado-linha">
            <span>Sua hora ({sugestao?.horas_estimadas ?? 0}h)</span>
            <span className={classe('negrito', (sugestao?.valor_hora ?? 0) < (meta.valor_hora_minimo ?? 120) ? 'texto-erro' : 'texto-ok')}>
              {brl(sugestao?.valor_hora ?? 0)}/h
            </span>
          </div>

          {entrada > 0 && (
            <div className="resultado-linha">
              <span>Entrada</span>
              <span className="negrito">{brl(entrada)}</span>
            </div>
          )}
          {parcelas > 1 && (
            <div className="resultado-linha">
              <span>{parcelas}x de</span>
              <span className="negrito">{brl(valorParcela)}</span>
            </div>
          )}
          {mensal > 0 && (
            <div className="resultado-linha ultima">
              <span>Manutenção</span>
              <span className="negrito texto-ok">{brl(mensal)}/mês</span>
            </div>
          )}

          <div className="dica mt">
            {precoTipo
              ? `${form.tipo_site}: ${precoTipo.paginas_incluidas} página(s) incluída(s) e ${brl(precoTipo.pagina_extra)} por extra`
              : 'Tipo de projeto sem base de preço definida'}
          </div>
        </div>

        <div className="bloco empilhado">
          <button className="botao botao-primario" type="submit" disabled={salvando}>
            <Icone nome="check" tamanho={15} />
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar negociação'}
          </button>
          <button className="botao" type="button" onClick={() => navegar(-1)} disabled={salvando}>
            Cancelar
          </button>
        </div>
      </aside>
    </form>
  )
}
