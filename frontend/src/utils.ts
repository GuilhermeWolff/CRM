// Funções utilitárias de formatação e datas.

export const brl = (valor: number | null | undefined) =>
  (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const brlCompacto = (valor: number | null | undefined) => {
  const numero = valor ?? 0
  if (Math.abs(numero) >= 1000) return `R$ ${(numero / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return brl(numero)
}

export const numero = (valor: number | null | undefined, casas = 1) =>
  (valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export const dataBR = (iso?: string | null) => {
  if (!iso) return '—'
  const data = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR')
}

export const dataHoraBR = (iso?: string | null) => {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Valor para <input type="date"> */
export const paraDataInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '')

export const hojeISO = () => {
  const agora = new Date()
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export const diasAte = (iso?: string | null) => {
  if (!iso) return null
  const alvo = new Date(`${iso.slice(0, 10)}T00:00:00`)
  const hoje = new Date(`${hojeISO()}T00:00:00`)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

export const rotuloPrazo = (dias: number | null) => {
  if (dias === null) return 'sem data'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  if (dias < 0) return `${Math.abs(dias)} dias atrás`
  return `em ${dias} dias`
}

export const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('') || nome.slice(0, 2).toUpperCase()

export const linkWhatsapp = (telefone?: string | null) => {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  if (!digitos) return null
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`
}

export const classe = (...itens: (string | false | null | undefined)[]) =>
  itens.filter(Boolean).join(' ')

export const mesCurto = (chave: string) => {
  const [ano, mes] = chave.split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`
}

export const baixarJson = (nomeArquivo: string, dados: unknown) => {
  const conteudo = JSON.stringify(dados, null, 2)
  const blob = new Blob([conteudo], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}

export const baixarCsv = (nomeArquivo: string, linhas: (string | number)[][]) => {
  const csv = linhas
    .map((linha) => linha.map((celula) => `"${String(celula ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}

export const copiar = async (texto: string) => {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = texto
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  }
}
