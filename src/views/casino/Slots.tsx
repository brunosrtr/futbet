'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { money } from '@/lib/format'
import { SLOT_PAIR, SLOT_SYMBOLS, SLOT_THREE, fmtMult, parseStake, play } from '@/lib/casino'
import GameShell from '@/components/casino/GameShell'
import StakeInput from '@/components/casino/StakeInput'

type Result = { reels: number[]; multiplier: number; payout: number; balance: number }

const STOPS = [700, 1100, 1500]
const rand = () => Math.floor(Math.random() * SLOT_SYMBOLS.length)

export default function Slots() {
  const { holdBalance } = useAuth()
  const [stake, setStake] = useState('10')
  const [reels, setReels] = useState([5, 5, 5])
  const [spinning, setSpinning] = useState([false, false, false])
  const [last, setLast] = useState<Result | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const busy = spinning.some(Boolean)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  async function spin() {
    const s = parseStake(stake)
    setLast(null)
    setSpinning([true, true, true])
    const res = await play<Result>('play_slots', { p_stake: s })
    if (!res) return setSpinning([false, false, false])
    holdBalance(STOPS[2] + 200)

    const stopped = [false, false, false]
    timer.current = setInterval(() => {
      setReels((cur) => cur.map((v, i) => (stopped[i] ? v : rand())))
    }, 70)
    STOPS.forEach((ms, i) =>
      setTimeout(() => {
        stopped[i] = true
        setReels((cur) => cur.map((v, j) => (j === i ? res.reels[i] : v)))
        setSpinning((cur) => cur.map((v, j) => (j === i ? false : v)))
        if (i === 2) {
          if (timer.current) clearInterval(timer.current)
          setLast(res)
          setRefreshKey((k) => k + 1)
          if (res.multiplier >= 30) toast.success(`JACKPOT! ${fmtMult(res.multiplier)} — ${money(res.payout)} 🤑`)
          else if (res.payout > 0) toast.success(`Ganhou ${money(res.payout)}!`)
        }
      }, ms),
    )
  }

  const jackpot = last && last.multiplier >= 30

  return (
    <GameShell title="Caça-níquel" emoji="🎰" game="slots" refreshKey={refreshKey}>
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_280px]">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-b from-[#3b0764] via-[#1e1033] to-panel p-5 sm:p-8">
            <div className={`mx-auto max-w-md rounded-2xl border-4 p-3 shadow-2xl transition ${jackpot ? 'border-gold shadow-gold/40' : 'border-[#a855f7]/50 shadow-purple-900/50'}`}>
              <div className="grid grid-cols-3 gap-2">
                {reels.map((r, i) => (
                  <div key={i} className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl bg-gradient-to-b from-white/95 via-white to-white/80 shadow-inner">
                    <span className={`select-none text-5xl sm:text-7xl ${spinning[i] ? 'blur-[2px] translate-y-1' : 'animate-pop'}`}>{SLOT_SYMBOLS[r]}</span>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/25" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 h-10 text-center">
              {last &&
                (last.payout > 0 ? (
                  <div className={`font-display text-3xl font-extrabold ${jackpot ? 'animate-pulse text-gold' : 'text-win'}`}>
                    +{money(last.payout)} <span className="text-lg opacity-70">({fmtMult(last.multiplier)})</span>
                  </div>
                ) : (
                  <div className="font-display text-2xl font-bold text-slate-400">Nada dessa vez…</div>
                ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-end">
            <div className="flex-1"><StakeInput value={stake} onChange={setStake} disabled={busy} /></div>
            <button disabled={busy} onClick={spin} className="btn-primary h-[46px] px-10 text-base">{busy ? 'Girando…' : 'Girar'}</button>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Tabela de pagamentos</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted"><th className="pb-2 font-semibold">Símbolo</th><th className="pb-2 text-right font-semibold">3 iguais</th><th className="pb-2 text-right font-semibold">2 iguais</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...SLOT_SYMBOLS.keys()].reverse().map((i) => (
                <tr key={i}>
                  <td className="py-1.5 text-xl">{SLOT_SYMBOLS[i]}</td>
                  <td className="py-1.5 text-right font-display text-base font-bold text-brand">{SLOT_THREE[i]}x</td>
                  <td className="py-1.5 text-right text-muted">{SLOT_PAIR[i]}x</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Os pares valem em qualquer posição. Retorno médio de ~95%, como numa máquina de verdade.</p>
        </div>
      </div>
    </GameShell>
  )
}
