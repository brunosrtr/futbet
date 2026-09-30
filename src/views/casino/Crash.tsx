'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { money } from '@/lib/format'
import { crashMult, fmtMult, parseStake, play } from '@/lib/casino'
import GameShell from '@/components/casino/GameShell'
import StakeInput from '@/components/casino/StakeInput'

type Phase = 'idle' | 'flying' | 'cashed' | 'crashed'
type Outcome = { status: 'active' | 'won' | 'lost'; multiplier?: number; crash?: number; payout?: number }

const W = 600
const H = 300

export default function Crash() {
  const { session } = useAuth()
  const [stake, setStake] = useState('10')
  const [auto, setAuto] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [mult, setMult] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [crashAt, setCrashAt] = useState<number | null>(null)
  const [cashedAt, setCashedAt] = useState<{ mult: number; payout: number } | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const roundId = useRef<string | null>(null)
  const startedAt = useRef(0)
  const raf = useRef(0)
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)
  const cashing = useRef(false)
  const crashRef = useRef<number | null>(null) // explosão conhecida (após retirar) para continuar a animação
  const phaseRef = useRef<Phase>('idle')
  const autoRef = useRef(0)

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p) }

  // Histórico das suas últimas explosões
  useEffect(() => {
    if (!session) return
    supabase
      .from('casino_rounds')
      .select('state')
      .eq('user_id', session.user.id)
      .eq('game', 'crash')
      .neq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => setHistory((data ?? []).map((r) => Number((r.state as { crash?: number }).crash)).filter(Boolean)))
  }, [session, refreshKey])

  useEffect(() => () => stopLoops(), [])

  function stopLoops() {
    cancelAnimationFrame(raf.current)
    if (poll.current) clearInterval(poll.current)
    poll.current = null
  }

  function explode(at: number) {
    stopLoops()
    setMult(at)
    setCrashAt(at)
    setPhaseBoth('crashed')
    setRefreshKey((k) => k + 1)
  }

  function frame() {
    const t = (performance.now() - startedAt.current) / 1000
    const m = crashMult(t)
    // Depois de retirar, sabemos onde explode: a animação continua até lá
    if (crashRef.current !== null && m >= crashRef.current) return explode(crashRef.current)
    setElapsed(t)
    setMult(m)
    if (phaseRef.current === 'flying' && autoRef.current >= 1.01 && m >= autoRef.current) cashout()
    raf.current = requestAnimationFrame(frame)
  }

  async function launch() {
    stopLoops()
    setCrashAt(null)
    setCashedAt(null)
    crashRef.current = null
    cashing.current = false
    autoRef.current = parseStake(auto)
    const r = await play<{ id: string }>('crash_start', { p_stake: parseStake(stake) })
    if (!r) return
    roundId.current = r.id
    startedAt.current = performance.now()
    setMult(1)
    setElapsed(0)
    setPhaseBoth('flying')
    raf.current = requestAnimationFrame(frame)
    poll.current = setInterval(async () => {
      if (!roundId.current || phaseRef.current !== 'flying') return
      const o = await play<Outcome>('crash_poll', { p_round: roundId.current }, true)
      if (o?.status === 'lost' && phaseRef.current === 'flying') {
        explode(Number(o.crash))
        toast.error(`💥 Explodiu em ${fmtMult(Number(o.crash))}!`)
      }
    }, 350)
  }

  async function cashout() {
    if (cashing.current || !roundId.current) return
    cashing.current = true
    const o = await play<Outcome>('crash_cashout', { p_round: roundId.current })
    if (!o) return
    if (o.status === 'won') {
      if (poll.current) clearInterval(poll.current)
      setCashedAt({ mult: Number(o.multiplier), payout: Number(o.payout) })
      crashRef.current = Number(o.crash)
      setPhaseBoth('cashed')
      toast.success(`Retirou em ${fmtMult(Number(o.multiplier))}: +${money(o.payout)} 🚀`)
    } else if (o.status === 'lost' && phaseRef.current === 'flying') {
      explode(Number(o.crash))
      toast.error(`💥 Tarde demais! Explodiu em ${fmtMult(Number(o.crash))}`)
    }
  }

  // Curva
  const maxT = Math.max(8, elapsed * 1.15)
  const maxM = Math.max(2, mult * 1.15)
  const px = (t: number) => (t / maxT) * W
  const py = (m: number) => H - 20 - ((m - 1) / (maxM - 1)) * (H - 50)
  const pts = Array.from({ length: 60 }, (_, i) => {
    const t = (elapsed * i) / 59
    return `${px(t).toFixed(1)},${py(crashMult(t)).toFixed(1)}`
  }).join(' ')
  const tipX = px(elapsed)
  const tipY = py(mult)
  const prev = crashMult(Math.max(0, elapsed - 0.3))
  const angle = elapsed > 0.3 ? (Math.atan2(py(prev) - tipY, px(elapsed - 0.3) === tipX ? 1 : tipX - px(elapsed - 0.3)) * 180) / Math.PI : 20

  const flying = phase === 'flying'
  const running = flying || phase === 'cashed'
  const liveValue = Math.round(parseStake(stake) * mult * 100) / 100

  return (
    <GameShell title="Foguetinho" emoji="🚀" game="crash" refreshKey={refreshKey}>
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_300px]">
        <div className="card overflow-hidden">
          {history.length > 0 && (
            <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2">
              {history.map((h, i) => (
                <span key={i} className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${h >= 2 ? 'bg-win/15 text-win' : 'bg-lose/15 text-lose'}`}>{fmtMult(h)}</span>
              ))}
            </div>
          )}
          <div className="relative bg-[radial-gradient(ellipse_at_bottom,#1e293b,#0b1018)]">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="#232e40" strokeDasharray="4 6" />
              ))}
              {phase !== 'idle' && elapsed > 0 && (
                <>
                  <polygon points={`0,${H - 20} ${pts} ${tipX},${H - 20}`} fill={phase === 'crashed' ? 'rgba(244,63,94,0.12)' : 'rgba(198,255,61,0.12)'} />
                  <polyline points={pts} fill="none" stroke={phase === 'crashed' ? '#f43f5e' : '#c6ff3d'} strokeWidth={4} strokeLinecap="round" />
                  <text x={tipX} y={tipY} fontSize={34} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${phase === 'crashed' ? 0 : 45 - angle} ${tipX} ${tipY})`}>
                    {phase === 'crashed' ? '💥' : '🚀'}
                  </text>
                </>
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className={`font-display text-6xl font-extrabold drop-shadow sm:text-7xl ${phase === 'crashed' ? 'text-lose' : running ? 'text-white' : 'text-slate-500'}`}>
                {fmtMult(mult)}
              </div>
              {phase === 'crashed' && <div className="mt-1 font-display text-xl font-bold uppercase text-lose">Explodiu!</div>}
              {cashedAt && <div className="mt-1 rounded-full bg-win/20 px-3 py-1 text-sm font-bold text-win">Você saiu em {fmtMult(cashedAt.mult)} · +{money(cashedAt.payout)}</div>}
              {phase === 'idle' && <div className="mt-1 text-sm text-muted">Aposte e lance o foguete</div>}
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-4">
          <StakeInput value={stake} onChange={setStake} disabled={flying} />
          <div>
            <label className="label">Retirada automática (opcional)</label>
            <div className="relative">
              <input
                value={auto}
                disabled={flying}
                inputMode="decimal"
                placeholder="ex: 2.00"
                onChange={(e) => setAuto(e.target.value.replace(/[^\d.,]/g, ''))}
                className="input pr-8 font-display text-lg font-bold"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">x</span>
            </div>
          </div>
          {flying ? (
            <button onClick={cashout} className="btn w-full animate-pulse bg-gold py-4 text-lg text-bg hover:bg-gold/90">
              Retirar {money(liveValue)}
            </button>
          ) : (
            <button onClick={launch} className="btn-primary w-full py-4 text-lg">🚀 {phase === 'idle' ? 'Lançar' : 'Lançar de novo'}</button>
          )}
          <p className="text-xs text-muted">
            O multiplicador sobe até o foguete explodir, num ponto sorteado no servidor. Retire antes para ganhar aposta × multiplicador. Se fechar a página durante o voo, a aposta é perdida.
          </p>
        </div>
      </div>
    </GameShell>
  )
}
