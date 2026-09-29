import { Link } from 'react-router-dom'
import { ChevronRight, MapPin, Users } from 'lucide-react'
import TeamBadge from './TeamBadge'
import StatusBadge from './StatusBadge'
import OddButton from './OddButton'
import { dateTime, money } from '../lib/format'
import { sortMarkets } from '../lib/game'
import type { Game } from '../lib/types'

export default function GameCard({ game }: { game: Game }) {
  const markets = sortMarkets(game.markets)
  const main = markets.find((m) => m.is_main)
  const extras = markets.length - (main ? 1 : 0)
  const volume = (game.bets ?? []).reduce((s, b) => s + Number(b.stake), 0)
  const finished = game.status === 'finished'

  return (
    <div className="card group overflow-hidden transition hover:border-slate-600">
      <Link to={`/jogo/${game.id}`} className="block p-4 pb-3">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{dateTime(game.starts_at)}{game.location && <> · <MapPin size={11} className="inline" /> {game.location}</>}</span>
          <StatusBadge game={game} />
        </div>
        <div className="space-y-2">
          {[{ n: game.home_team, s: game.home_score }, { n: game.away_team, s: game.away_score }].map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <TeamBadge name={t.n} />
              <span className="flex-1 truncate font-semibold">{t.n}</span>
              {finished && <span className="font-display text-2xl font-bold">{t.s}</span>}
            </div>
          ))}
        </div>
      </Link>

      {main && (
        <div className="px-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{main.title}</div>
          <div className="grid grid-cols-3 gap-2">
            {main.options.map((o) => <OddButton key={o.id} game={game} market={main} option={o} compact />)}
          </div>
        </div>
      )}

      <Link
        to={`/jogo/${game.id}`}
        className="mt-3 flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted transition hover:bg-panel-2"
      >
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Users size={12} /> {game.bets?.length ?? 0} apostas</span>
          <span>{money(volume)} em jogo</span>
        </span>
        <span className="flex items-center gap-0.5 font-semibold text-slate-300 group-hover:text-brand">
          {extras > 0 ? `+${extras} mercados` : 'Ver jogo'} <ChevronRight size={14} />
        </span>
      </Link>
    </div>
  )
}
