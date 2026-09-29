export const money = (n: number | string | null | undefined) =>
  'FC ' + Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtOdd = (n: number | string) => Number(n).toFixed(2)

export const dateTime = (s?: string | null) =>
  s
    ? new Date(s).toLocaleString('pt-BR', {
        weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : 'Horário a definir'

export function timeAgo(s: string) {
  const diff = (Date.now() - new Date(s).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  return `${Math.floor(diff / 86400)} d`
}

export function teamColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return `hsl(${h} 70% 55%)`
}

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'

export const errMsg = (e: unknown) =>
  (e as { message?: string })?.message ?? 'Algo deu errado'
