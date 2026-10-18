import { useState } from 'react'
import type { Cliente, ClienteComTotais } from '../tipos'
import { Modal } from './Modal'

interface Props {
  aberto: boolean
  inicial?: Partial<ClienteComTotais> | null
  aoFechar: () => void
  aoSalvar: (dados: Partial<Cliente>) => Promise<void> | void
  salvando?: boolean
}

export function FormCliente({ aberto, inicial, aoFechar, aoSalvar, salvando }: Props) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [chave, setChave] = useState('')

  const identificador = `${aberto}-${inicial?.id ?? 'novo'}`
  if (chave !== identificador) {
    setChave(identificador)
    if (aberto) {
      setForm({
        nome: inicial?.nome ?? '',
        contato: inicial?.contato ?? '',
        whatsapp: inicial?.whatsapp ?? '',
        email: inicial?.email ?? '',
        segmento: inicial?.segmento ?? '',
        site: inicial?.site ?? '',
        notas: inicial?.notas ?? '',
      })
    }
  }

  const alterar = (campo: string, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }))

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    await aoSalvar({
      nome: (form.nome ?? '').trim(),
      contato: form.contato ?? '',
      whatsapp: form.whatsapp ?? '',
      email: form.email ?? '',
      segmento: form.segmento ?? '',
      site: form.site ?? '',
      notas: form.notas ?? '',
    })
  }

  return (
    <Modal
      aberto={aberto}
      titulo={inicial?.id ? 'Editar cliente' : 'Novo cliente'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="botao" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="botao botao-primario" type="submit" form="form-cliente" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </>
      }
    >
      <form id="form-cliente" onSubmit={enviar} className="empilhado">
        <label className="campo">
          <span className="campo-rotulo">Nome / empresa *</span>
          <input
            className="entrada"
            value={form.nome ?? ''}
            onChange={(e) => alterar('nome', e.target.value)}
            required
            placeholder="Ex.: Clínica Vida Odonto"
          />
        </label>

        <div className="campo-linha">
          <label className="campo">
            <span className="campo-rotulo">Pessoa de contato</span>
            <input className="entrada" value={form.contato ?? ''} onChange={(e) => alterar('contato', e.target.value)} />
          </label>
          <label className="campo">
            <span className="campo-rotulo">WhatsApp</span>
            <input
              className="entrada"
              value={form.whatsapp ?? ''}
              onChange={(e) => alterar('whatsapp', e.target.value)}
              placeholder="(41) 90000-0000"
            />
          </label>
        </div>

        <div className="campo-linha">
          <label className="campo">
            <span className="campo-rotulo">E-mail</span>
            <input className="entrada" type="email" value={form.email ?? ''} onChange={(e) => alterar('email', e.target.value)} />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Segmento</span>
            <input
              className="entrada"
              value={form.segmento ?? ''}
              onChange={(e) => alterar('segmento', e.target.value)}
              placeholder="Ex.: Saúde, Alimentação..."
            />
          </label>
        </div>

        <label className="campo">
          <span className="campo-rotulo">Site atual</span>
          <input
            className="entrada"
            value={form.site ?? ''}
            onChange={(e) => alterar('site', e.target.value)}
            placeholder="https://..."
          />
        </label>

        <label className="campo">
          <span className="campo-rotulo">Observações</span>
          <textarea className="area-texto" value={form.notas ?? ''} onChange={(e) => alterar('notas', e.target.value)} />
        </label>
      </form>
    </Modal>
  )
}
