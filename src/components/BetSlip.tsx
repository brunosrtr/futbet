'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Receipt, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useBetSlip } from '@/context/BetSlipContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { errMsg, fmtOdd, money } from '@/lib/format'

const QUICK = [10, 25, 50, 100]

function SlipBody({ onDone }: { onDone?: () => void }) {
  const { selections, stakes, setStake, remove, clear } = useBetSlip()
  const { profile, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)

  const stakeOf = (id: string) => Math.max(0, Number((stakes[id] || '0').replace(',', '.')) || 0)
  const total = selections.reduce((s, x) => s + stakeOf(x.optionId), 0)
  const potential = selections.reduce((s, x) => s + stakeOf(x.optionId) * x.odd, 0)
  const insufficient = !!profile && total > Number(profile.balance)

  async function placeAll() {
    const ready = selections.filter((s) => stakeOf(s.optionId) > 0)
    if (!ready.length) return toast.error('Informe o valor de pelo menos uma aposta')
    if (ready.some((s) => stakeOf(s.optionId) < 1)) return toast.error('Aposta mínima: MJ$ 1,00')
    setBusy(true)
    let ok = 0
    for (const s of ready) {
      const { error } = await supabase.rpc('place_bet', { p_option_id: s.optionId, p_stake: stakeOf(s.optionId) })
      if (error) toast.error(`${s.optionLabel}: ${errMsg(error)}`)
      else { ok++; remove(s.optionId); setStake(s.optionId, '') }
    }
    setBusy(false)
    await refreshProfile()
    if (ok) {
      toast.success(ok === 1 ? 'Aposta feita! Boa sorte 🍀' : `${ok} apostas feitas! Boa sorte 🍀`)
      onDone?.()
    }
  }

  if (!selections.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted">
        <Receipt size={32} className="text-line" />
        <p>Seu cupom está vazio.</p>
        <p className="text-xs">Clique em uma odd para adicionar uma seleção.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {selections.map((s) => {
          const v = stakeOf(s.optionId)
          return (
            <div key={s.optionId} className="animate-pop rounded-lg border border-line bg-bg p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{s.optionLabel}</div>
                  <div className="truncate text-xs text-muted">{s.marketTitle}</div>
                  <div className="truncate text-xs text-slate-500">{s.gameLabel}</div>
                </div>
                <span className="font-display text-xl font-bold text-brand">{fmtOdd(s.odd)}</span>
                <button onClick={() => remove(s.optionId)} className="text-slate-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">MJ$</span>
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={stakes[s.optionId] ?? ''}
                    onChange={(e) => setStake(s.optionId, e.target.value.replace(/[^\d.,]/g, ''))}
                    className="input py-2 pl-11 font-semibold"
                  />
                </div>
                <div className="text-right text-xs leading-tight">
                  <div className="text-muted">Retorno</div>
                  <div className="font-semibold text-win">{money(v * s.odd)}</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => setStake(s.optionId, String(v + q))}
                    className="rounded-md bg-panel-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-line"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2 border-t border-line p-3">
        <div className="flex justify-between text-sm"><span className="text-muted">Total apostado</span><span className="font-semibold">{money(total)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted">Retorno potencial</span><span className="font-display text-lg font-bold text-win">{money(potential)}</span></div>
        {profile ? (
          <button disabled={busy || total <= 0 || insufficient} onClick={placeAll} className="btn-primary w-full py-3 text-base">
            {busy ? 'Apostando…' : insufficient ? 'Saldo insuficiente' : `Apostar ${money(total)}`}
          </button>
        ) : (
          <Link href="/entrar" onClick={onDone} className="btn-primary w-full py-3">Entre para apostar</Link>
        )}
        <button onClick={clear} className="flex w-full items-center justify-center gap-1 text-xs text-muted hover:text-white">
          <Trash2 size={12} /> Limpar cupom
        </button>
      </div>
    </div>
  )
}

function SlipHeader({ onClose }: { onClose?: () => void }) {
  const { selections } = useBetSlip()
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <div className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
        Cupom de apostas
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-xs text-bg">{selections.length}</span>
      </div>
      {onClose && <button onClick={onClose} className="text-slate-400"><X size={20} /></button>}
    </div>
  )
}

export default function BetSlip() {
  const { selections, open, setOpen } = useBetSlip()
  return (
    <>
      {/* Desktop: barra lateral fixa */}
      <aside className="card sticky top-20 hidden max-h-[calc(100vh-6rem)] flex-col overflow-hidden lg:flex">
        <SlipHeader />
        <SlipBody />
      </aside>

      {/* Mobile: botão flutuante + gaveta */}
      {selections.length > 0 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-bold text-bg shadow-xl shadow-brand/30 lg:hidden"
        >
          <Receipt size={18} /> Cupom ({selections.length})
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border-t border-line bg-panel" onClick={(e) => e.stopPropagation()}>
            <SlipHeader onClose={() => setOpen(false)} />
            <SlipBody onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
