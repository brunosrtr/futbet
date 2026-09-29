import type { Game } from '../lib/types'
import { gameStatus } from '../lib/game'

const TONES = {
  open: 'bg-brand/10 text-brand ring-brand/30',
  live: 'bg-lose/15 text-lose ring-lose/40',
  closed: 'bg-gold/10 text-gold ring-gold/30',
  done: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  cancel: 'bg-slate-700/30 text-slate-500 ring-slate-600/30',
}

export default function StatusBadge({ game }: { game: Game }) {
  const s = gameStatus(game)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${TONES[s.tone]}`}>
      {s.tone === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lose" />}
      {s.label}
    </span>
  )
}
