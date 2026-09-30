'use client'

import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { money } from '@/lib/format'
import { NUM_BG, WHEEL, numColor, play } from '@/lib/casino'
import GameShell from '@/components/casino/GameShell'

type BetType = 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen' | 'column'
type Bet = { type: BetType; value?: number; amount: number }
type Result = { result: number; stake: number; payout: number; balance: number }

const SEG = 360 / 37
const CHIPS = [1, 5, 10, 25, 100]
const SPIN_MS = 4200
const keyOf = (t: BetType, v?: number) => (v === undefined ? t : `${t}-${v}`)

const WHEEL_BG = `conic-gradient(from ${-SEG / 2}deg, ${WHEEL.map(
  (n, i) => `${NUM_BG[numColor(n)]} ${i * SEG}deg ${(i + 1) * SEG}deg`,
).join(', ')})`

function Wheel({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <div className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[18px] border-x-transparent border-t-gold drop-shadow" />
      <div
        className="relative h-full w-full rounded-full border-[10px] border-[#5b3a17] shadow-[0_0_40px_-10px] shadow-gold/40"
        style={{
          background: WHEEL_BG,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.75, 0.15, 1)` : 'none',
        }}
      >
        {WHEEL.map((n, i) => (
          <span key={n} className="absolute inset-0 flex justify-center pt-1.5" style={{ transform: `rotate(${i * SEG}deg)` }}>
            <span className="text-[10px] font-bold text-white sm:text-xs">{n}</span>
          </span>
        ))}
        <div className="absolute inset-[26%] rounded-full border-4 border-[#5b3a17] bg-gradient-to-br from-[#3b2a14] to-[#1a1208]" />
      </div>
    </div>
  )
}

export default function Roulette() {
  const { holdBalance } = useAuth()
  const [chip, setChip] = useState(5)
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [last, setLast] = useState<Result | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const total = useMemo(() => Object.values(bets).reduce((s, b) => s + b.amount, 0), [bets])

  function place(type: BetType, value?: number) {
    if (spinning) return
    const k = keyOf(type, value)
    setBets((cur) => ({ ...cur, [k]: { type, value, amount: (cur[k]?.amount ?? 0) + chip } }))
  }

  async function spin() {
    if (!total) return toast.error('Coloque pelo menos uma ficha na mesa')
    setSpinning(true)
    const res = await play<Result>('play_roulette', { p_bets: Object.values(bets) })
    if (!res) return setSpinning(false)
    holdBalance(SPIN_MS + 300)
    const i = WHEEL.indexOf(res.result)
    const target = (((-i * SEG - rotation) % 360) + 360) % 360
    setRotation(rotation + 360 * 6 + target)
    setTimeout(() => {
      setSpinning(false)
      setLast(res)
      setHistory((h) => [res.result, ...h].slice(0, 14))
      setRefreshKey((k) => k + 1)
      if (res.payout > 0) toast.success(`Deu ${res.result}! Você ganhou ${money(res.payout)} 🎉`)
      else toast.error(`Deu ${res.result}. Não foi dessa vez.`)
    }, SPIN_MS)
  }

  const cell = (label: React.ReactNode, type: BetType, value: number | undefined, cls: string) => {
    const b = bets[keyOf(type, value)]
    const won = last && !spinning && isWinner(type, value, last.result)
    return (
      <button
        key={keyOf(type, value)}
        onClick={() => place(type, value)}
        className={`relative flex items-center justify-center rounded-md text-xs font-bold text-white transition hover:brightness-125 ${cls} ${won ? 'ring-2 ring-gold' : ''}`}
      >
        {label}
        {b && (
          <span className="absolute -right-1 -top-1 z-10 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-gold px-1 text-[9px] font-extrabold text-bg shadow">
            {b.amount}
          </span>
        )}
      </button>
    )
  }

  const rows = [3, 2, 1].map((r) => Array.from({ length: 12 }, (_, c) => c * 3 + r))

  return (
    <GameShell title="Roleta" emoji="🎡" game="roulette" refreshKey={refreshKey}>
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[300px_1fr]">
        <div className="card flex flex-col items-center gap-4 p-5">
          <Wheel rotation={rotation} spinning={spinning} />
          <div className="text-center">
            {spinning ? (
              <div className="font-display text-2xl font-bold text-muted">Girando…</div>
            ) : last ? (
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full font-display text-2xl font-extrabold text-white" style={{ background: NUM_BG[numColor(last.result)] }}>
                  {last.result}
                </span>
                <div className="text-left">
                  <div className="text-xs text-muted">Apostou {money(last.stake)}</div>
                  <div className={`font-display text-xl font-bold ${last.payout > 0 ? 'text-win' : 'text-lose'}`}>
                    {last.payout > 0 ? `Ganhou ${money(last.payout)}` : 'Perdeu'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">Faça suas apostas</div>
            )}
          </div>
          {history.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {history.map((n, i) => (
                <span key={i} className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: NUM_BG[numColor(n)] }}>{n}</span>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-4 p-4">
          <div className="scrollbar-thin overflow-x-auto pb-1">
            <div className="min-w-[540px] space-y-1.5 rounded-lg bg-[#0f3d24] p-2">
              <div className="grid grid-cols-[36px_repeat(12,1fr)_40px] gap-1">
                <div className="row-span-3 grid">{cell('0', 'number', 0, 'bg-[#15803d]')}</div>
                {rows.map((row, ri) => (
                  <div key={ri} className="contents">
                    {row.map((n) => cell(n, 'number', n, `h-10 ${numColor(n) === 'red' ? 'bg-[#dc2626]' : 'bg-[#1f2937]'}`))}
                    {cell('2:1', 'column', 3 - ri, 'h-10 bg-white/10')}
                  </div>
                ))}
              </div>
              <div className="ml-[40px] mr-[44px] grid grid-cols-3 gap-1">
                {cell('1ª 12', 'dozen', 1, 'h-9 bg-white/10')}
                {cell('2ª 12', 'dozen', 2, 'h-9 bg-white/10')}
                {cell('3ª 12', 'dozen', 3, 'h-9 bg-white/10')}
              </div>
              <div className="ml-[40px] mr-[44px] grid grid-cols-6 gap-1">
                {cell('1–18', 'low', undefined, 'h-9 bg-white/10')}
                {cell('Par', 'even', undefined, 'h-9 bg-white/10')}
                {cell(<span className="h-4 w-4 rotate-45 bg-[#dc2626]" />, 'red', undefined, 'h-9 bg-white/10')}
                {cell(<span className="h-4 w-4 rotate-45 bg-[#111827] ring-1 ring-white/30" />, 'black', undefined, 'h-9 bg-white/10')}
                {cell('Ímpar', 'odd', undefined, 'h-9 bg-white/10')}
                {cell('19–36', 'high', undefined, 'h-9 bg-white/10')}
              </div>
            </div>
          </div>

          <div>
            <div className="label">Valor da ficha</div>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChip(c)}
                  className={`grid h-11 w-11 place-items-center rounded-full border-4 border-dashed font-display text-sm font-extrabold transition ${
                    chip === c ? 'scale-110 border-white bg-gold text-bg' : 'border-white/30 bg-panel-2 text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto text-sm">
              <span className="text-muted">Total na mesa: </span>
              <b className="font-display text-lg">{money(total)}</b>
            </div>
            <button disabled={spinning || !total} onClick={() => setBets({})} className="btn-ghost"><RotateCcw size={16} /> Limpar</button>
            <button disabled={spinning || !total} onClick={spin} className="btn-primary px-8">{spinning ? 'Girando…' : 'Girar'}</button>
          </div>
          <p className="text-xs text-muted">Pagamentos: número 36x · dúzia/coluna 3x · vermelho, preto, par, ímpar, 1–18, 19–36 pagam 2x. O zero perde as apostas externas.</p>
        </div>
      </div>
    </GameShell>
  )
}

function isWinner(type: BetType, value: number | undefined, n: number) {
  const red = numColor(n) === 'red'
  switch (type) {
    case 'number': return n === value
    case 'red': return red
    case 'black': return n > 0 && !red
    case 'even': return n > 0 && n % 2 === 0
    case 'odd': return n % 2 === 1
    case 'low': return n >= 1 && n <= 18
    case 'high': return n >= 19
    case 'dozen': return n > 0 && Math.floor((n - 1) / 12) + 1 === value
    case 'column': return n > 0 && ((n - 1) % 3) + 1 === value
  }
}
