import { useState } from 'react'
import type { ClienteComTotais, Meta, Negociacao } from '../tipos'
import { hojeISO, paraDataInput } from '../utils'
import { Modal } from './Modal'

export interface DadosNegociacao {
  titulo: string
  cliente_nome: string | null
  cliente_id: number | null
  contato: string
  whatsapp: string
  email: string
  tipo_site: string
  valor: number
  mensal: number
  estagio: string
  probabilidade: number
  fonte: string
  follow_up: string | null
  prazo_entrega: string | null
  notas: string
  motivo_perda: string | null
}

interface Props {
  aberto: boolean
  meta: Meta
  clientes: ClienteComTotais[]
  inicial?: Partial<Negociacao> | null
  aoFechar: () => void
  aoSalvar: (dados: DadosNegociacao) => Promise<void> | void
  salvando?: boolean
}

export function FormNegociacao({ aberto, meta, clientes, inicial, aoFechar, aoSalvar, salvando }: Props) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [chave, setChave] = useState('')

  // Reinicia o formulário sempre que abre com dados diferentes
  const identificador = `${aberto}-${inicial?.id ?? 'novo'}`
  if (chave !== identificador) {
    setChave(identificador)
    if (aberto) {
      setForm({
        titulo: inicial?.titulo ?? '',
        cliente_nome: inicial?.cliente_nome ?? '',
        contato: inicial?.contato ?? '',
        whatsapp: inicial?.whatsapp ?? '',
        email: inicial?.email ?? '',
        tipo_site: inicial?.tipo_site ?? meta.tipos_site[1] ?? 'Site Institucional',
        valor: inicial ? String(inicial.valor ?? 0) : '',
        mensal: inicial ? String(inicial.mensal ?? 0) : '',
        estagio: inicial?.estagio ?? 'lead',
        probabilidade: String(
          inicial?.probabilidade ?? meta.estagios.find((e) => e.id === (inicial?.estagio ?? 'lead'))?.prob ?? 10,
        ),
        fonte: inicial?.fonte ?? 'Indicação',
        follow_up: paraDataInput(inicial?.follow_up ?? hojeISO()),
        prazo_entrega: paraDataInput(inicial?.prazo_entrega ?? null),
        notas: inicial?.notas ?? '',
        motivo_perda: inicial?.motivo_perda ?? '',
      })
    }
  }

  const alterar = (campo: string, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }))

  const trocarEstagio = (estagio: string) => {
    const padrao = meta.estagios.find((e) => e.id === estagio)?.prob ?? 10
    setForm((atual) => ({ ...atual, estagio, probabilidade: String(padrao) }))
  }

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    const nomeDigitado = (form.cliente_nome ?? '').trim()
    const nomeInicial = (inicial?.cliente_nome ?? '').trim()
    const mesmoCliente = nomeDigitado === nomeInicial

    await aoSalvar({
      titulo: (form.titulo ?? '').trim() || nomeDigitado || 'Sem título',
      cliente_nome: nomeDigitado || null,
      cliente_id: mesmoCliente ? (inicial?.cliente_id ?? null) : null,
      contato: form.contato ?? '',
      whatsapp: form.whatsapp ?? '',
      email: form.email ?? '',
      tipo_site: form.tipo_site ?? 'Site Institucional',
      valor: Number(form.valor) || 0,
      mensal: Number(form.mensal) || 0,
      estagio: form.estagio ?? 'lead',
      probabilidade: Number(form.probabilidade) || 0,
      fonte: form.fonte ?? '',
      follow_up: form.follow_up || null,
      prazo_entrega: form.prazo_entrega || null,
      notas: form.notas ?? '',
      motivo_perda: form.estagio === 'perdido' ? form.motivo_perda || null : null,
    })
  }

  const estagioAtual = meta.estagios.find((e) => e.id === form.estagio)

  return (
    <Modal
      aberto={aberto}
      titulo={inicial?.id ? 'Editar negociação' : 'Nova negociação'}
      sub={inicial?.id ? `#${inicial.id} · ${inicial.cliente_nome ?? inicial.titulo}` : 'Preencha o que já sabe — dá para completar depois'}
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <button className="botao" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="botao botao-primario" type="submit" form="form-negociacao" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar negociação'}
          </button>
        </>
      }
    >
      <form id="form-negociacao" onSubmit={enviar} className="empilhado">
        <div className="campo-linha">
          <label className="campo">
            <span className="campo-rotulo">Cliente *</span>
            <input
              className="entrada"
              list="lista-clientes"
              value={form.cliente_nome ?? ''}
              onChange={(e) => alterar('cliente_nome', e.target.value)}
              placeholder="Ex.: Padaria Pão Quente"
              required
            />
            <datalist id="lista-clientes">
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.nome} />
              ))}
            </datalist>
          </label>
          <label className="campo">
            <span className="campo-rotulo">Nome do projeto</span>
            <input
              className="entrada"
              value={form.titulo ?? ''}
              onChange={(e) => alterar('titulo', e.target.value)}
              placeholder="Ex.: Site institucional + agendamento"
            />
          </label>
        </div>

        <div className="campo-linha">
          <label className="campo">
            <span className="campo-rotulo">Tipo de site</span>
            <select className="selecao" value={form.tipo_site ?? ''} onChange={(e) => alterar('tipo_site', e.target.value)}>
              {meta.tipos_site.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span className="campo-rotulo">Origem do contato</span>
            <select className="selecao" value={form.fonte ?? ''} onChange={(e) => alterar('fonte', e.target.value)}>
              <option value="">—</option>
              {meta.fontes.map((fonte) => (
                <option key={fonte} value={fonte}>
                  {fonte}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="campo-linha-3">
          <label className="campo">
            <span className="campo-rotulo">Valor do projeto (R$)</span>
            <input
              className="entrada"
              type="number"
              min={0}
              step={50}
              value={form.valor ?? ''}
              onChange={(e) => alterar('valor', e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Manutenção mensal (R$)</span>
            <input
              className="entrada"
              type="number"
              min={0}
              step={50}
              value={form.mensal ?? ''}
              onChange={(e) => alterar('mensal', e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Probabilidade (%)</span>
            <input
              className="entrada"
              type="number"
              min={0}
              max={100}
              step={5}
              value={form.probabilidade ?? ''}
              onChange={(e) => alterar('probabilidade', e.target.value)}
            />
          </label>
        </div>

        <div className="campo-linha">
          <label className="campo">
            <span className="campo-rotulo">Estágio no funil</span>
            <select className="selecao" value={form.estagio ?? ''} onChange={(e) => trocarEstagio(e.target.value)}>
              {meta.estagios.map((estagio) => (
                <option key={estagio.id} value={estagio.id}>
                  {estagio.nome}
                </option>
              ))}
            </select>
            {estagioAtual?.descricao && <span className="dica">{estagioAtual.descricao}</span>}
          </label>
          <div className="campo">
            <span className="campo-rotulo">Contato</span>
            <input
              className="entrada"
              value={form.contato ?? ''}
              onChange={(e) => alterar('contato', e.target.value)}
              placeholder="Nome da pessoa"
            />
          </div>
        </div>

        <div className="campo-linha-3">
          <label className="campo">
            <span className="campo-rotulo">WhatsApp</span>
            <input
              className="entrada"
              value={form.whatsapp ?? ''}
              onChange={(e) => alterar('whatsapp', e.target.value)}
              placeholder="(41) 90000-0000"
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">E-mail</span>
            <input
              className="entrada"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => alterar('email', e.target.value)}
              placeholder="contato@cliente.com"
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Próximo follow-up</span>
            <input
              className="entrada"
              type="date"
              value={form.follow_up ?? ''}
              onChange={(e) => alterar('follow_up', e.target.value)}
            />
          </label>
        </div>

        <label className="campo">
          <span className="campo-rotulo">Prazo de entrega combinado</span>
          <input
            className="entrada"
            type="date"
            value={form.prazo_entrega ?? ''}
            onChange={(e) => alterar('prazo_entrega', e.target.value)}
          />
        </label>

        <label className="campo">
          <span className="campo-rotulo">Escopo / observações</span>
          <textarea
            className="area-texto"
            value={form.notas ?? ''}
            onChange={(e) => alterar('notas', e.target.value)}
            placeholder="Páginas, integrações, prazo, condições de pagamento..."
          />
        </label>

        {form.estagio === 'perdido' && (
          <label className="campo">
            <span className="campo-rotulo">Motivo da perda</span>
            <input
              className="entrada"
              value={form.motivo_perda ?? ''}
              onChange={(e) => alterar('motivo_perda', e.target.value)}
              placeholder="Ex.: preço, prazo, escolheu outro fornecedor..."
            />
          </label>
        )}
      </form>
    </Modal>
  )
}
