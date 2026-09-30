'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { money } from '@/lib/format'
import { fmtMult, parseStake, play } from '@/lib/casino'
import GameShell from '@/components/casino/GameShell'
import StakeInput from '@/components/casino/StakeInput'

type Round = {
  id: string
  status: 'active' | 'won' | 'lost'
  stake: number
  mines: number
  revealed: number[]
  multiplier: number
  next_multiplier?: number
  positions?: number[]
  hit?: number
  payout?: number
}

export default function Mines() {
  const { session } = useAuth()
  const [stake, setStake] = useState('10')
  const [mines, setMines] = useState(3)
  const [round, setRound] = useState<Round | null>(null)
  const [busy, setBusy] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const active = round?.status === 'active'

  // Retoma partida em andamento (ex: recarregou a página)
  useEffect(() => {
    if (!session) return
    play<Round | null>('mines_current', undefined, true).then((r) => r && setRound(r))
  }, [session])

  async function start() {
    setBusy(true)
    const r = await play<Round>('mines_start', { p_stake: parseStake(stake), p_mines: mines })
    setBusy(false)
    if (r) setRound(r)
  }

  async function reveal(cell: number) {
    if (!active || busy || round.revealed.includes(cell)) return
    setBusy(true)
    const r = await play<Round>('mines_reveal', { p_round: round.id, p_cell: cell })
    setBusy(false)
    if (!r) return
    setRound(r)
    if (r.status === 'lost') { toast.error('💥 Bomba! Perdeu a aposta.'); setRefreshKey((k) => k + 1) }
    if (r.status === 'won') { toast.success(`Limpou o campo! +${money(r.payout)} 💎`); setRefreshKey((k) => k + 1) }
  }

  async function cashout() {
    if (!active) return
    setBusy(true)
    const r = await play<Round>('mines_cashout', { p_round: round.id })
    setBusy(false)
    if (!r) return
    setRound(r)
    setRefreshKey((k) => k + 1)
    toast.success(`Retirou ${money(r.payout)} (${fmtMult(r.multiplier)}) 💰`)
  }

  const finished = round && round.status !== 'active'
  const current = round ? Math.round(round.stake * round.multiplier * 100) / 100 : 0

  return (
    <GameShell title="Mines" emoji="💣" game="mines" refreshKey={refreshKey}>
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[300px_1fr]">
        <div className="card space-y-4 p-4">
          {active ? (
            <>
              <div className="rounded-lg border border-line bg-bg p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-muted">Multiplicador atual</div>
                <div className="font-display text-4xl font-extrabold text-brand">{fmtMult(round.multiplier)}</div>
                <div className="mt-1 text-sm text-muted">
                  Próxima casa: <b className="text-slate-200">{round.next_multiplier ? fmtMult(round.next_multiplier) : '—'}</b>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Aposta</span><b>{money(round.stake)}</b>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Minas</span><b>{round.mines} 💣</b>
              </div>
              <button disabled={busy || round.revealed.length === 0} onClick={cashout} className="btn-primary w-full py-3.5 text-base">
                {round.revealed.length === 0 ? 'Abra uma casa' : `Retirar ${money(current)}`}
              </button>
            </>
          ) : (
            <>
              <StakeInput value={stake} onChange={setStake} disabled={busy} />
              <div>
                <label className="label">Quantidade de minas: <span className="text-white">{mines}</span></label>
                <input type="range" min={1} max={24} value={mines} onChange={(e) => setMines(Number(e.target.value))} className="w-full accent-[#c6ff3d]" />
                <div className="mt-1 flex gap-1">
                  {[1, 3, 5, 10, 20].map((n) => (
                    <button key={n} onClick={() => setMines(n)} className={`flex-1 rounded-md py-1 text-xs font-semibold ${mines === n ? 'bg-brand text-bg' : 'bg-panel-2 text-slate-300'}`}>{n}</button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Mais minas = multiplicador sobe mais rápido (e o risco também).</p>
              </div>
              <button disabled={busy} onClick={start} className="btn-primary w-full py-3.5 text-base">{finished ? 'Jogar de novo' : 'Começar'}</button>
              {finished && (
                <div className={`rounded-lg p-3 text-center text-sm font-semibold ${round.status === 'won' ? 'bg-win/10 text-win' : 'bg-lose/10 text-lose'}`}>
                  {round.status === 'won' ? `Você levou ${money(round.payout)} (${fmtMult(round.multiplier)})` : `Bomba! Perdeu ${money(round.stake)}`}
                </div>
              )}
            </>
          )}
        </div>

        <div className="card p-4 sm:p-6">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 25 }, (_, i) => {
              const revealed = round?.revealed.includes(i)
              const isMine = finished && round?.positions?.includes(i)
              const isHit = round?.hit === i
              let cls = 'bg-panel-2 border-line hover:border-brand/50 hover:-translate-y-0.5'
              let content = ''
              if (revealed) { cls = 'bg-win/15 border-win/50'; content = '💎' }
              else if (isMine) { cls = isHit ? 'bg-lose/40 border-lose' : 'bg-lose/10 border-lose/30 opacity-70'; content = '💣' }
              else if (finished) { cls = 'bg-panel-2/60 border-line opacity-50'; content = '💎' }
              return (
                <button
                  key={i}
                  disabled={!active || revealed || busy}
                  onClick={() => reveal(i)}
                  className={`grid aspect-square place-items-center rounded-xl border-2 text-2xl transition sm:text-3xl ${cls} ${!active && !finished ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className={content ? 'animate-pop' : ''} style={finished && !revealed && !isMine ? { filter: 'grayscale(1)', opacity: 0.35 } : undefined}>{content}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </GameShell>
  )
}
