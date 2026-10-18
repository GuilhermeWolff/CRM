import { useState } from 'react'
import type { Negociacao, Tarefa } from '../tipos'
import { hojeISO, paraDataInput } from '../utils'
import { Modal } from './Modal'

interface Props {
  aberto: boolean
  negociacoes: Negociacao[]
  inicial?: Partial<Tarefa> | null
  negociacaoFixa?: number
  aoFechar: () => void
  aoSalvar: (dados: Partial<Tarefa>) => Promise<void> | void
  salvando?: boolean
}

export function FormTarefa({
  aberto,
  negociacoes,
  inicial,
  negociacaoFixa,
  aoFechar,
  aoSalvar,
  salvando,
}: Props) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [chave, setChave] = useState('')

  const identificador = `${aberto}-${inicial?.id ?? 'nova'}-${negociacaoFixa ?? ''}`
  if (chave !== identificador) {
    setChave(identificador)
    if (aberto) {
      setForm({
        titulo: inicial?.titulo ?? '',
        negociacao_id: String(inicial?.negociacao_id ?? negociacaoFixa ?? ''),
        vencimento: paraDataInput(inicial?.vencimento ?? hojeISO()),
        prioridade: inicial?.prioridade ?? 'media',
      })
    }
  }

  const alterar = (campo: string, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }))

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    await aoSalvar({
      titulo: (form.titulo ?? '').trim(),
      negociacao_id: form.negociacao_id ? Number(form.negociacao_id) : null,
      vencimento: form.vencimento || null,
      prioridade: form.prioridade ?? 'media',
    })
  }

  return (
    <Modal
      aberto={aberto}
      titulo={inicial?.id ? 'Editar tarefa' : 'Nova tarefa'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="botao" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="botao botao-primario" type="submit" form="form-tarefa" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar tarefa'}
          </button>
        </>
      }
    >
      <form id="form-tarefa" onSubmit={enviar} className="empilhado">
        <label className="campo">
          <span className="campo-rotulo">O que precisa ser feito? *</span>
          <input
            className="entrada"
            value={form.titulo ?? ''}
            onChange={(e) => alterar('titulo', e.target.value)}
            required
            placeholder="Ex.: Ligar para confirmar a proposta"
          />
        </label>

        <div className="campo-linha">
          <label className="campo">
            <span className="campo-rotulo">Data</span>
            <input
              className="entrada"
              type="date"
              value={form.vencimento ?? ''}
              onChange={(e) => alterar('vencimento', e.target.value)}
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Prioridade</span>
            <select className="selecao" value={form.prioridade ?? ''} onChange={(e) => alterar('prioridade', e.target.value)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </label>
        </div>

        <label className="campo">
          <span className="campo-rotulo">Vincular a uma negociação</span>
          <select
            className="selecao"
            value={form.negociacao_id ?? ''}
            onChange={(e) => alterar('negociacao_id', e.target.value)}
          >
            <option value="">— sem vínculo —</option>
            {negociacoes.map((negociacao) => (
              <option key={negociacao.id} value={negociacao.id}>
                #{negociacao.id} · {negociacao.cliente_nome ?? negociacao.titulo}
              </option>
            ))}
          </select>
        </label>
      </form>
    </Modal>
  )
}
