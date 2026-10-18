import { useEffect, type ReactNode } from 'react'

interface Props {
  aberto: boolean
  titulo: string
  sub?: string
  aoFechar: () => void
  children: ReactNode
  rodape?: ReactNode
  largo?: boolean
}

export function Modal({ aberto, titulo, sub, aoFechar, children, rodape, largo }: Props) {
  useEffect(() => {
    if (!aberto) return
    const escutar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', escutar)
    return () => document.removeEventListener('keydown', escutar)
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <div
      className="modal-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
    >
      <div className={largo ? 'modal largo' : 'modal'}>
        <header className="modal-cabecalho">
          <div>
            <h3 className="bloco-titulo">{titulo}</h3>
            {sub && <div className="bloco-sub">{sub}</div>}
          </div>
          <button className="botao botao-icone" onClick={aoFechar} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className="modal-corpo">{children}</div>
        {rodape && <footer className="modal-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}
