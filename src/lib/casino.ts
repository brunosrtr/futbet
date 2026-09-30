import { toast } from 'sonner'
import { supabase } from './supabase'
import { errMsg } from './format'

export async function play<T>(fn: string, args?: Record<string, unknown>, silent = false): Promise<T | null> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    if (!silent) toast.error(errMsg(error))
    return null
  }
  return data as T
}

export const fmtMult = (n: number | string) => `${Number(n).toFixed(2)}x`

export const GAMES = [
  { slug: 'roleta', game: 'roulette', name: 'Roleta', emoji: '🎡', desc: 'Europeia, 0 a 36. Número paga 36x.', from: '#7f1d1d', to: '#14532d' },
  { slug: 'caca-niquel', game: 'slots', name: 'Caça-níquel', emoji: '🎰', desc: 'Três 7️⃣ pagam 500x.', from: '#581c87', to: '#9d174d' },
  { slug: 'mines', game: 'mines', name: 'Mines', emoji: '💣', desc: 'Ache os diamantes, fuja das bombas.', from: '#0c4a6e', to: '#134e4a' },
  { slug: 'foguetinho', game: 'crash', name: 'Foguetinho', emoji: '🚀', desc: 'Retire antes de explodir.', from: '#7c2d12', to: '#1e3a8a' },
] as const

export type GameKey = (typeof GAMES)[number]['game']
export const gameName = (g: string) => GAMES.find((x) => x.game === g)?.name ?? g

// Roleta
export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
export const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
export const numColor = (n: number) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black')
export const NUM_BG = { green: '#15803d', red: '#dc2626', black: '#1f2937' } as const

// Caça-níquel (mesma ordem do banco)
export const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣']
export const SLOT_THREE = [6, 9, 15, 30, 80, 500]
export const SLOT_PAIR = [0.5, 0.5, 1, 1.5, 3, 5]

// Foguetinho: mesmo crescimento do banco
export const crashMult = (seconds: number) => Math.floor(100 * Math.exp(Math.min(0.1 * seconds, 7))) / 100

export const parseStake = (v: string) => Math.round((Number(v.replace(',', '.')) || 0) * 100) / 100
