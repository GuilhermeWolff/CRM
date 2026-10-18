import { useState } from 'react'
import { Modal } from './Modal'

interface Props {
  aberto: boolean
  cliente?: string
  aoConfirmar: (motivo: string) => void
  aoCancelar: () => void
}

const SUGESTOES = [
  'Preço acima do orçamento dele',
  'Escolheu outro fornecedor',
  'Adiou o projeto',
  'Não respondeu mais',
  'Escopo não fazia sentido',
]

export function MotivoPerda({ aberto, cliente, aoConfirmar, aoCancelar }: Props) {
  const [motivo, setMotivo] = useState('')

  return (
    <Modal
      aberto={aberto}
      titulo="Marcar como perdida"
      sub={cliente ? `${cliente} — registrar o motivo ajuda a melhorar suas propostas` : undefined}
      aoFechar={aoCancelar}
      rodape={
        <>
          <button className="botao" onClick={aoCancelar}>
            Cancelar
          </button>
          <button className="botao botao-perigo" onClick={() => aoConfirmar(motivo.trim())}>
            Confirmar perda
          </button>
        </>
      }
    >
      <label className="campo">
        <span className="campo-rotulo">Motivo</span>
        <input
          className="entrada"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: fechou com outro fornecedor"
          autoFocus
        />
      </label>
      <div className="agora">
        {SUGESTOES.map((sugestao) => (
          <button key={sugestao} type="button" className="botao botao-mini" onClick={() => setMotivo(sugestao)}>
            {sugestao}
          </button>
        ))}
      </div>
    </Modal>
  )
}
