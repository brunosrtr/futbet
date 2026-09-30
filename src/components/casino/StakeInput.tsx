'use client'

import { useAuth } from '@/context/AuthContext'
import { parseStake } from '@/lib/casino'

export default function StakeInput({ value, onChange, disabled, label = 'Valor da aposta' }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; label?: string
}) {
  const { profile } = useAuth()
  const v = parseStake(value)
  const set = (n: number) => onChange(String(Math.max(1, Math.round(n * 100) / 100)))
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">MJ$</span>
          <input
            value={value}
            disabled={disabled}
            inputMode="decimal"
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
            className="input pl-11 font-display text-lg font-bold"
          />
        </div>
        <button type="button" disabled={disabled} onClick={() => set(v / 2)} className="btn-ghost px-3">½</button>
        <button type="button" disabled={disabled} onClick={() => set(v * 2)} className="btn-ghost px-3">2x</button>
        <button type="button" disabled={disabled || !profile} onClick={() => profile && set(Math.floor(Number(profile.balance)))} className="btn-ghost px-3">Máx</button>
      </div>
    </div>
  )
}
