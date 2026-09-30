'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import LoginGate from './LoginGate'
import RecentPlays from './RecentPlays'

export default function GameShell({ title, emoji, game, refreshKey, children }: {
  title: string; emoji: string; game: string; refreshKey: number; children: ReactNode
}) {
  const { session, loading } = useAuth()
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/cassino" className="flex items-center gap-1 text-sm text-muted hover:text-white"><ArrowLeft size={16} /> Cassino</Link>
      </div>
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold uppercase"><span>{emoji}</span> {title}</h1>
      {loading ? <div className="card h-80 animate-pulse" /> : session ? children : <LoginGate />}
      <RecentPlays game={game} refreshKey={refreshKey} />
    </div>
  )
}
