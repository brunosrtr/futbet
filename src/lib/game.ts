import type { Game, Market } from './types'

export const hasStarted = (g: Game) => !!g.starts_at && new Date(g.starts_at).getTime() <= Date.now()

export const isGameBettable = (g: Game) => g.status === 'open' && !hasStarted(g)

export const isMarketBettable = (g: Game, m: Market) => isGameBettable(g) && m.status === 'open'

export function gameStatus(g: Game): { label: string; tone: 'open' | 'live' | 'closed' | 'done' | 'cancel' } {
  if (g.status === 'cancelled') return { label: 'Cancelado', tone: 'cancel' }
  if (g.status === 'finished') return { label: 'Encerrado', tone: 'done' }
  if (hasStarted(g)) return { label: 'Ao vivo', tone: 'live' }
  if (g.status === 'locked') return { label: 'Apostas fechadas', tone: 'closed' }
  return { label: 'Apostas abertas', tone: 'open' }
}

export const sortMarkets = (ms: Market[] = []) =>
  [...ms]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ ...m, options: [...(m.options ?? [])].sort((a, b) => a.position - b.position) }))

export const GAME_SELECT =
  '*, creator:profiles!games_creator_id_fkey(username), markets(*, options(*)), bets(stake)'
