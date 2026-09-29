'use client'

import { Check, Lock } from 'lucide-react'
import { useBetSlip } from '@/context/BetSlipContext'
import { fmtOdd } from '@/lib/format'
import { isMarketBettable } from '@/lib/game'
import type { Game, Market, Option } from '@/lib/types'

export default function OddButton({ game, market, option, compact }: {
  game: Game; market: Market; option: Option; compact?: boolean
}) {
  const { toggle, isSelected, setOpen } = useBetSlip()
  const selected = isSelected(option.id)
  const bettable = isMarketBettable(game, market)
  const winner = option.is_winner === true
  const loser = market.status === 'settled' && !winner

  const base = 'group relative flex w-full items-center justify-between gap-2 rounded-lg border px-3 transition'
  const size = compact ? 'py-2' : 'py-3'
  let look = 'border-line bg-panel-2 hover:border-brand/50 hover:bg-line'
  if (selected) look = 'border-brand bg-brand text-bg shadow-[0_0_20px_-4px] shadow-brand/60'
  if (winner) look = 'border-win/60 bg-win/15 text-win'
  else if (loser || market.status === 'void') look = 'border-line/60 bg-panel-2/50 text-slate-500 line-through'
  else if (!bettable) look = 'border-line bg-panel-2/60 text-slate-400 cursor-not-allowed'

  return (
    <button
      disabled={!bettable}
      onClick={() => {
        toggle({
          optionId: option.id, optionLabel: option.label, odd: Number(option.odd),
          marketId: market.id, marketTitle: market.title,
          gameId: game.id, gameLabel: `${game.home_team} x ${game.away_team}`,
        })
        if (!selected && window.innerWidth < 1024) setOpen(true)
      }}
      className={`${base} ${size} ${look}`}
    >
      <span className={`truncate text-left text-xs font-medium ${selected ? 'text-bg' : winner ? '' : 'text-slate-300'}`}>
        {option.label}
      </span>
      <span className="flex items-center gap-1 font-display text-lg font-bold">
        {winner && <Check size={16} />}
        {!bettable && !winner && market.status === 'open' && <Lock size={12} className="opacity-60" />}
        <span className={selected ? 'text-bg' : winner ? 'text-win' : bettable ? 'text-brand' : ''}>{fmtOdd(option.odd)}</span>
      </span>
    </button>
  )
}
