'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GAME_SELECT, hasStarted } from '@/lib/game'
import type { Game } from '@/lib/types'
import GameCard from '@/components/GameCard'
import { useAuth } from '@/context/AuthContext'

const TABS = [
  { id: 'open', label: 'Abertos' },
  { id: 'live', label: 'Em andamento' },
  { id: 'done', label: 'Encerrados' },
  { id: 'all', label: 'Todos' },
] as const

export default function Home() {
  const { profile } = useAuth()
  const [games, setGames] = useState<Game[] | null>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('open')

  async function load() {
    const { data } = await supabase.from('games').select(GAME_SELECT).order('created_at', { ascending: false }).limit(100)
    setGames((data as Game[]) ?? [])
  }

  useEffect(() => {
    load()
    const ch = supabase
      .channel('home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = useMemo(() => {
    const list = games ?? []
    if (tab === 'open') return list.filter((g) => g.status === 'open' && !hasStarted(g))
    if (tab === 'live') return list.filter((g) => (g.status === 'locked' || g.status === 'open') && (g.status === 'locked' || hasStarted(g)))
    if (tab === 'done') return list.filter((g) => g.status === 'finished' || g.status === 'cancelled')
    return list
  }, [games, tab])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#1a2a0f] via-panel to-[#0f1d2e] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            <Sparkles size={12} /> 100% fictício · zero dinheiro real
          </span>
          <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">
            O futsal da galera <br /> agora tem <span className="text-brand">odds</span>.
          </h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Crie o jogo, defina as odds, compartilhe o link e veja quem entende de bola. Todo mundo começa com <b className="text-gold">MJ$ 1.000</b>.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/criar" className="btn-primary"><Plus size={16} /> Criar jogo</Link>
            {!profile && <Link href="/entrar?modo=cadastro" className="btn-ghost">Ganhar MJ$ 1.000 grátis</Link>}
          </div>
        </div>
      </section>

      <div className="scrollbar-thin flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-brand text-bg' : 'border border-line bg-panel text-slate-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {games === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card h-56 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="text-4xl">🥅</span>
          <p className="text-muted">Nenhum jogo por aqui.</p>
          <Link href="/criar" className="btn-primary"><Plus size={16} /> Criar o primeiro</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      )}
    </div>
  )
}
