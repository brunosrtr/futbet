'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { money, teamColor } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import type { Profile } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Ranking() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Profile[] | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').order('balance', { ascending: false }).limit(100)
      .then(({ data }) => setRows((data as Profile[]) ?? []))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase">Ranking</h1>
        <p className="text-sm text-muted">Quem tá forrado e quem tá devendo pro agiota.</p>
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        {rows === null && <div className="h-60 animate-pulse" />}
        {rows?.map((p, i) => {
          const diff = Number(p.balance) - 1000
          return (
            <div key={p.id} className={`flex items-center gap-4 px-4 py-3 ${p.id === profile?.id ? 'bg-brand/5' : ''}`}>
              <span className="w-8 text-center font-display text-xl font-bold text-muted">{MEDALS[i] ?? i + 1}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full font-bold text-bg" style={{ background: teamColor(p.username) }}>
                {p.username[0]?.toUpperCase()}
              </span>
              <span className="flex-1 truncate font-semibold">
                {p.username} {p.id === profile?.id && <span className="text-xs text-brand">(você)</span>}
              </span>
              <div className="text-right">
                <div className="font-display text-lg font-bold">{money(p.balance)}</div>
                <div className={`text-xs ${diff >= 0 ? 'text-win' : 'text-lose'}`}>{diff >= 0 ? '+' : ''}{money(diff)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
