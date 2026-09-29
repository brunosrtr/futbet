import { supabase } from './supabase'
import { sortMarkets } from './game'
import type { Game } from './types'

// Leitura pública (anon) usada no servidor para metadados e imagem de preview
export async function fetchGameSummary(id: string) {
  const { data } = await supabase
    .from('games')
    .select('id, home_team, away_team, description, location, starts_at, status, home_score, away_score, markets(*, options(*))')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const game = data as unknown as Game
  return { game, main: sortMarkets(game.markets).find((m) => m.is_main) ?? null }
}
