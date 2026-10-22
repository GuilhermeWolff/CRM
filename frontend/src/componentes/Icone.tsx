import type { ReactNode } from 'react'

/**
 * Ícones em SVG (traço), no lugar de emojis.
 * Herdam a cor do texto (currentColor), então acompanham o tema.
 */
export type NomeIcone =
  | 'painel'
  | 'funil'
  | 'lista'
  | 'usuarios'
  | 'check'
  | 'calculadora'
  | 'ajustes'
  | 'busca'
  | 'lapis'
  | 'lixeira'
  | 'olho'
  | 'copiar'
  | 'baixar'
  | 'subir'
  | 'mais'
  | 'fechar'
  | 'balao'
  | 'entrada'
  | 'alerta'
  | 'relogio'
  | 'raio'
  | 'externo'
  | 'usuario'
  | 'telefone'
  | 'email'
  | 'globo'
  | 'tendencia'
  | 'recolher'

const DESENHOS: Record<NomeIcone, ReactNode> = {
  painel: (
    <>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="5" rx="1" />
      <rect x="12" y="8.5" width="3" height="8.5" rx="1" />
      <rect x="17" y="5" width="3" height="12" rx="1" />
    </>
  ),
  funil: <path d="M3 4h18l-7 8.5V20l-4-2.4v-5.1L3 4Z" />,
  lista: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  usuarios: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  check: (
    <>
      <polyline points="9 11.5 12 14.5 22 4.5" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  calculadora: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <rect x="7.5" y="5.5" width="9" height="4" rx="1" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </>
  ),
  ajustes: (
    <>
      <path d="M5 21v-6M5 11V3M12 21v-9M12 8V3M19 21v-4M19 13V3" />
      <path d="M2.5 15h5M9.5 8h5M16.5 17h5" />
    </>
  ),
  busca: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m20.5 20.5-4.2-4.2" />
    </>
  ),
  lapis: <path d="M17 3.5a2.5 2.5 0 0 1 3.5 3.5L7.5 20l-5 1.5L4 16.5 17 3.5Z" />,
  lixeira: (
    <>
      <path d="M3.5 6h17" />
      <path d="M18.5 6l-.9 13.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5.5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
    </>
  ),
  olho: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  copiar: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5.5 15H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v.5" />
    </>
  ),
  baixar: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </>
  ),
  subir: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 8 5-5 5 5M12 3v12" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  fechar: <path d="M18 6 6 18M6 6l12 12" />,
  balao: (
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-2.8-.4L4 21l1.5-4.6A8.5 8.5 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" />
  ),
  entrada: (
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z" />
    </>
  ),
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V13M12 16.5h.01" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.5 2" />
    </>
  ),
  raio: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />,
  externo: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10.5 13.5 21 3" />
    </>
  ),
  usuario: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  telefone: (
    <path d="M21.5 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.6 4.2 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.8 2.8a2 2 0 0 1-.5 2.1L7.6 9.9a16 16 0 0 0 6 6l1.3-1.4a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" />
  ),
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2.5 6.5 9.5 6.5 9.5-6.5" />
    </>
  ),
  globo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  tendencia: (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  recolher: (
    <>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </>
  ),
}

interface Props {
  nome: NomeIcone
  tamanho?: number
  className?: string
}

export function Icone({ nome, tamanho = 17, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {DESENHOS[nome]}
    </svg>
  )
}
