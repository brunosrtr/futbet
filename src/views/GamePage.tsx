'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarClock, MapPin, Share2, User } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GAME_SELECT, gameStatus, hasStarted, sortMarkets } from '@/lib/game'
import { dateTime, fmtOdd, money, timeAgo } from '@/lib/format'
import type { Bet, Game } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import TeamBadge from '@/components/TeamBadge'
import StatusBadge from '@/components/StatusBadge'
import OddButton from '@/components/OddButton'
import Comments from '@/components/Comments'
import CreatorPanel from '@/components/CreatorPanel'

const BET_TONE: Record<Bet['status'], string> = {
  pending: 'text-slate-300',
  won: 'text-win',
  lost: 'text-lose line-through',
  void: 'text-slate-500',
}

export default function GamePage({ id }: { id: string }) {
  const { profile } = useAuth()
  const [game, setGame] = useState<Game | null | undefined>(undefined)
  const [bets, setBets] = useState<Bet[]>([])

  const load = useCallback(async () => {
    const [g, b] = await Promise.all([
      supabase.from('games').select(GAME_SELECT).eq('id', id).maybeSingle(),
      supabase
        .from('bets')
        .select('*, profile:profiles(username), option:options(label), market:markets(title)')
        .eq('game_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    setGame((g.data as Game) ?? null)
    setBets((b.data as Bet[]) ?? [])
  }, [id])

  useEffect(() => {
    load()
    const ch = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets', filter: `game_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets', filter: `game_id=eq.${id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'options' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, load])

  if (game === undefined) return <div className="card h-72 animate-pulse" />
  if (game === null)
    return (
      <div className="card p-10 text-center">
        <p className="text-muted">Jogo não encontrado.</p>
        <Link href="/" className="btn-primary mt-4">Voltar</Link>
      </div>
    )

  const markets = sortMarkets(game.markets)
  const isCreator = profile?.id === game.creator_id
  const volume = bets.reduce((s, b) => s + Number(b.stake), 0)
  const finished = game.status === 'finished'
  const status = gameStatus(game)

  async function share() {
    const url = window.location.href
    const title = `${game!.home_team} x ${game!.away_team} — MigasBet`
    if (navigator.share) {
      try { await navigator.share({ title, text: `Bora apostar em ${game!.home_team} x ${game!.away_team}!`, url }) } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado! Manda no grupo 📲')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm text-muted hover:text-white"><ArrowLeft size={16} /> Jogos</Link>
        <button onClick={share} className="btn-ghost py-2"><Share2 size={16} /> Compartilhar</button>
      </div>

      {/* Placar */}
      <section className="card relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_0%,rgba(198,255,61,0.08),transparent)]" />
        <div className="relative p-5 sm:p-7">
          <div className="flex justify-center"><StatusBadge game={game} /></div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamBadge name={game.home_team} size="lg" />
              <span className="font-display text-xl font-bold uppercase leading-tight sm:text-2xl">{game.home_team}</span>
            </div>
            <div className="text-center">
              {finished ? (
                <div className="font-display text-5xl font-extrabold sm:text-6xl">
                  {game.home_score}<span className="mx-2 text-muted">:</span>{game.away_score}
                </div>
              ) : (
                <div className="font-display text-3xl font-bold text-muted">VS</div>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamBadge name={game.away_team} size="lg" />
              <span className="font-display text-xl font-bold uppercase leading-tight sm:text-2xl">{game.away_team}</span>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1"><CalendarClock size={13} /> {dateTime(game.starts_at)}</span>
            {game.location && <span className="flex items-center gap-1"><MapPin size={13} /> {game.location}</span>}
            <span className="flex items-center gap-1"><User size={13} /> criado por <b className="text-slate-300">{game.creator?.username}</b></span>
            <span>{bets.length} apostas · {money(volume)} em jogo</span>
          </div>
          {game.description && <p className="mx-auto mt-4 max-w-xl text-center text-sm text-slate-300">{game.description}</p>}
        </div>
      </section>

      {isCreator && <CreatorPanel game={game} markets={markets} onChange={load} />}
      {isCreator && game.status === 'open' && !hasStarted(game) && (
        <p className="text-center text-xs text-muted">Você é o criador — não pode apostar neste jogo, mas pode acompanhar tudo.</p>
      )}
      {status.tone === 'live' && game.status === 'open' && (
        <p className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-center text-sm text-gold">O horário do jogo já passou — apostas encerradas automaticamente.</p>
      )}

      {/* Mercados */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Mercados</h2>
        {markets.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                {m.title}
                {m.is_main && <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] uppercase text-brand">Principal</span>}
              </h3>
              {m.status === 'settled' && <span className="text-[11px] font-bold uppercase text-win">Liquidado</span>}
              {m.status === 'void' && <span className="text-[11px] font-bold uppercase text-slate-500">Anulado</span>}
            </div>
            <div className={`grid gap-2 ${m.options.length === 2 ? 'grid-cols-2' : m.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {m.options.map((o) => <OddButton key={o.id} game={game} market={m} option={o} />)}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Apostas da galera */}
        <section className="card">
          <h2 className="border-b border-line px-4 py-3 font-display text-lg font-bold uppercase tracking-wide">Apostas da galera</h2>
          <ul className="scrollbar-thin max-h-[480px] divide-y divide-line overflow-y-auto">
            {bets.length === 0 && <li className="p-6 text-center text-sm text-muted">Nenhuma aposta ainda.</li>}
            {bets.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <b>{b.profile?.username}</b> <span className="text-muted">em</span> <span className={BET_TONE[b.status]}>{b.option?.label}</span>
                  </div>
                  <div className="truncate text-xs text-muted">{b.market?.title} · {timeAgo(b.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{money(b.stake)}</div>
                  <div className="text-xs text-muted">@ {fmtOdd(b.odd)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Comments gameId={game.id} creatorId={game.creator_id} />
      </div>
    </div>
  )
}
