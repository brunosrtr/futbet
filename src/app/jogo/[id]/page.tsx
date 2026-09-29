import type { Metadata } from 'next'
import GamePage from '@/views/GamePage'
import { fetchGameSummary } from '@/lib/server'
import { fmtOdd } from '@/lib/format'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const summary = await fetchGameSummary(id).catch(() => null)
  if (!summary) return { title: 'Jogo' }
  const { game, main } = summary
  const title = `${game.home_team} x ${game.away_team}`
  const odds = main?.options.map((o) => `${o.label} ${fmtOdd(o.odd)}`).join(' · ')
  const description = odds ? `Odds: ${odds}. Bora apostar?` : 'Bora apostar?'
  return { title, description, openGraph: { title: `${title} — MigasBet`, description } }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <GamePage id={id} />
}
