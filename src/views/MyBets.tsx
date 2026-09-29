'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Redirect from '@/components/Redirect'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { fmtOdd, money, timeAgo } from '@/lib/format'
import type { Bet } from '@/lib/types'

const LABEL: Record<Bet['status'], { t: string; c: string }> = {
  pending: { t: 'Em aberto', c: 'bg-gold/10 text-gold' },
  won: { t: 'Ganhou', c: 'bg-win/15 text-win' },
  lost: { t: 'Perdeu', c: 'bg-lose/15 text-lose' },
  void: { t: 'Devolvida', c: 'bg-slate-500/15 text-slate-400' },
}

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Em aberto' },
  { id: 'won', label: 'Ganhas' },
  { id: 'lost', label: 'Perdidas' },
] as const

export default function MyBets() {
  const { session, loading, profile } = useAuth()
  const [bets, setBets] = useState<Bet[] | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const uid = session?.user.id

  useEffect(() => {
    if (!uid) return
    const load = () =>
      supabase
        .from('bets')
        .select('*, option:options(label), market:markets(title), game:games(id, home_team, away_team, status)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .then(({ data }) => setBets((data as Bet[]) ?? []))
    load()
    const ch = supabase
      .channel(`mybets-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets', filter: `user_id=eq.${uid}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid])

  const stats = useMemo(() => {
    const list = bets ?? []
    const settled = list.filter((b) => b.status === 'won' || b.status === 'lost')
    const staked = settled.reduce((s, b) => s + Number(b.stake), 0)
    const returned = settled.reduce((s, b) => s + Number(b.payout), 0)
    const won = settled.filter((b) => b.status === 'won').length
    return {
      pending: list.filter((b) => b.status === 'pending').reduce((s, b) => s + Number(b.stake), 0),
      profit: returned - staked,
      hitRate: settled.length ? Math.round((won / settled.length) * 100) : 0,
      count: list.length,
    }
  }, [bets])

  if (!loading && !session) return <Redirect to="/entrar" />

  const list = (bets ?? []).filter((b) => filter === 'all' || b.status === filter)

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold uppercase">Minhas apostas</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: 'Saldo', v: money(profile?.balance), c: 'text-brand' },
          { l: 'Em aberto', v: money(stats.pending), c: 'text-gold' },
          { l: 'Lucro', v: (stats.profit >= 0 ? '+' : '') + money(stats.profit), c: stats.profit >= 0 ? 'text-win' : 'text-lose' },
          { l: 'Acerto', v: `${stats.hitRate}%`, c: 'text-slate-100' },
        ].map((s) => (
          <div key={s.l} className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{s.l}</div>
            <div className={`mt-1 font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filter === f.id ? 'bg-brand text-bg' : 'border border-line bg-panel text-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {bets === null && <div className="card h-40 animate-pulse" />}
        {bets && list.length === 0 && (
          <div className="card p-10 text-center text-sm text-muted">
            Nenhuma aposta aqui. <Link href="/" className="font-semibold text-brand hover:underline">Ver jogos</Link>
          </div>
        )}
        {list.map((b) => {
          const s = LABEL[b.status]
          return (
            <Link key={b.id} href={`/jogo/${b.game_id}`} className="card flex items-center gap-4 p-4 transition hover:border-slate-600">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${s.c}`}>{s.t}</span>
                  <span className="text-xs text-muted">{timeAgo(b.created_at)}</span>
                </div>
                <div className="mt-1 truncate font-bold">{b.option?.label} <span className="font-display text-brand">@ {fmtOdd(b.odd)}</span></div>
                <div className="truncate text-xs text-muted">{b.market?.title} · {b.game?.home_team} x {b.game?.away_team}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Apostou {money(b.stake)}</div>
                <div className={`font-display text-lg font-bold ${b.status === 'won' ? 'text-win' : b.status === 'lost' ? 'text-lose' : 'text-slate-200'}`}>
                  {b.status === 'pending' ? `→ ${money(b.stake * b.odd)}` : b.status === 'lost' ? `−${money(b.stake)}` : `+${money(b.payout)}`}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
