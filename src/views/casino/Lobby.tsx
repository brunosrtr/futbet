'use client'

import Link from 'next/link'
import { GAMES } from '@/lib/casino'
import RecentPlays from '@/components/casino/RecentPlays'

export default function Lobby() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase">Cassino</h1>
        <p className="text-sm text-muted">Enquanto o jogo não começa, arrisca uns MJ$ aqui. Todo sorteio é feito no servidor, ninguém consegue roubar.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {GAMES.map((g) => (
          <Link
            key={g.slug}
            href={`/cassino/${g.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-line p-4 transition hover:-translate-y-1 hover:border-slate-500 sm:p-6"
            style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
          >
            <div className="pointer-events-none absolute -right-4 -top-4 text-8xl opacity-25 transition group-hover:scale-110 group-hover:opacity-40 sm:text-9xl">{g.emoji}</div>
            <div className="relative">
              <div className="text-4xl sm:text-5xl">{g.emoji}</div>
              <div className="mt-3 font-display text-2xl font-extrabold uppercase sm:text-3xl">{g.name}</div>
              <div className="mt-1 text-xs text-white/75 sm:text-sm">{g.desc}</div>
              <div className="mt-4 inline-flex rounded-lg bg-black/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide group-hover:bg-brand group-hover:text-bg">Jogar</div>
            </div>
          </Link>
        ))}
      </div>
      <RecentPlays />
    </div>
  )
}
