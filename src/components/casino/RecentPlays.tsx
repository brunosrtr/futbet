'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { money, timeAgo } from '@/lib/format'
import { fmtMult, gameName, GAMES } from '@/lib/casino'

type Row = {
  id: string; game: string; stake: number; status: 'won' | 'lost'; payout: number
  multiplier: number | null; created_at: string; profile: { username: string } | null
}

export default function RecentPlays({ game, refreshKey = 0 }: { game?: string; refreshKey?: number }) {
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      let q = supabase
        .from('casino_rounds')
        .select('id, game, stake, status, payout, multiplier, created_at, profile:profiles(username)')
        .neq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(15)
      if (game) q = q.eq('game', game)
      const { data } = await q
      if (alive) setRows((data as unknown as Row[]) ?? [])
    }
    load()
    const t = setInterval(load, 8000)
    return () => { alive = false; clearInterval(t) }
  }, [game, refreshKey])

  return (
    <section className="card">
      <h2 className="border-b border-line px-4 py-3 font-display text-lg font-bold uppercase tracking-wide">Últimas jogadas</h2>
      <ul className="divide-y divide-line">
        {rows === null && <li className="h-24 animate-pulse" />}
        {rows?.length === 0 && <li className="p-6 text-center text-sm text-muted">Ninguém jogou ainda.</li>}
        {rows?.map((r) => {
          const net = Number(r.payout) - Number(r.stake)
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="text-lg">{GAMES.find((g) => g.game === r.game)?.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate"><b>{r.profile?.username}</b> <span className="text-muted">· {gameName(r.game)}</span></div>
                <div className="text-xs text-muted">apostou {money(r.stake)} · {timeAgo(r.created_at)}</div>
              </div>
              <div className="text-right">
                <div className={`font-display text-lg font-bold ${net >= 0 ? 'text-win' : 'text-lose'}`}>
                  {net >= 0 ? '+' : '−'}{money(Math.abs(net))}
                </div>
                {r.status === 'won' && r.multiplier != null && <div className="text-xs text-muted">{fmtMult(r.multiplier)}</div>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
