import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type TipoAviso = 'ok' | 'erro' | 'info'

interface Aviso {
  id: number
  texto: string
  tipo: TipoAviso
}

interface ContextoToast {
  avisar: (texto: string, tipo?: TipoAviso) => void
}

const Contexto = createContext<ContextoToast>({ avisar: () => {} })

export const useToast = () => useContext(Contexto)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const avisar = useCallback((texto: string, tipo: TipoAviso = 'ok') => {
    const id = Date.now() + Math.random()
    setAvisos((atual) => [...atual, { id, texto, tipo }])
    window.setTimeout(() => {
      setAvisos((atual) => atual.filter((aviso) => aviso.id !== id))
    }, 4200)
  }, [])

  return (
    <Contexto.Provider value={{ avisar }}>
      {children}
      <div className="toast-area">
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`toast toast-${aviso.tipo}`}>
            {aviso.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}
