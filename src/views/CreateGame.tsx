'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { errMsg } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import Redirect from '@/components/Redirect'
import TeamBadge from '@/components/TeamBadge'
import MarketEditor, { TEMPLATES, cloneMarket, toPayload, validateMarket, type MarketDraft } from '@/components/MarketEditor'

export default function CreateGame() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [mainOdds, setMainOdds] = useState(['2.10', '3.60', '2.80'])
  const [extras, setExtras] = useState<MarketDraft[]>([])
  const [busy, setBusy] = useState(false)

  if (!loading && !session) return <Redirect to="/entrar" />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!home.trim() || !away.trim()) return toast.error('Informe os dois times')
    const main: MarketDraft = {
      title: 'Resultado final',
      options: [
        { label: home.trim(), odd: mainOdds[0] },
        { label: 'Empate', odd: mainOdds[1] },
        { label: away.trim(), odd: mainOdds[2] },
      ],
    }
    for (const m of [main, ...extras]) {
      const err = validateMarket(m)
      if (err) return toast.error(err)
    }
    setBusy(true)
    const { data, error } = await supabase.rpc('create_game', {
      p_home: home, p_away: away, p_description: description, p_location: location,
      p_starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      p_main: toPayload(main), p_extras: extras.map(toPayload),
    })
    setBusy(false)
    if (error) return toast.error(errMsg(error))
    toast.success('Jogo criado! Agora é só compartilhar o link 🔥')
    router.push(`/jogo/${data}`)
  }

  const oddInput = (i: number, label: string) => (
    <div className="rounded-lg border border-line bg-bg p-3 text-center">
      <div className="truncate text-xs font-semibold text-muted">{label}</div>
      <input
        value={mainOdds[i]}
        inputMode="decimal"
        onChange={(e) => setMainOdds((o) => o.map((v, j) => (j === i ? e.target.value.replace(/[^\d.,]/g, '') : v)))}
        className="mt-1 w-full bg-transparent text-center font-display text-3xl font-bold text-brand outline-none"
      />
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase">Criar jogo</h1>
        <p className="text-sm text-muted">Você é a casa: define as odds, os mercados e o resultado. Só não pode apostar no próprio jogo 😉</p>
      </div>

      <section className="card space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <label className="label">Time da casa</label>
            <div className="flex items-center gap-2">
              {home && <TeamBadge name={home} />}
              <input value={home} onChange={(e) => setHome(e.target.value)} maxLength={40} placeholder="Ex: Os Canelas" className="input" />
            </div>
          </div>
          <span className="pb-2.5 font-display text-xl font-bold text-muted">VS</span>
          <div>
            <label className="label">Visitante</label>
            <div className="flex items-center gap-2">
              <input value={away} onChange={(e) => setAway(e.target.value)} maxLength={40} placeholder="Ex: Pé de Rato FC" className="input" />
              {away && <TeamBadge name={away} />}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Data e hora (apostas fecham no início)</label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Local</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Quadra do Zé" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Descrição / regras</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="2 tempos de 20 min, quem perder paga o refri…" className="input resize-none" />
        </div>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">Resultado final — odds</h2>
        <div className="grid grid-cols-3 gap-2">
          {oddInput(0, home || 'Casa')}
          {oddInput(1, 'Empate')}
          {oddInput(2, away || 'Visitante')}
        </div>
        <p className="text-xs text-muted">Dica: odd 2.00 = paga o dobro. Quanto maior a odd, menos provável (e mais lucrativo).</p>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Opcionais</h2>
          <p className="text-xs text-muted">Crie mercados extras: expulsão, quem marca, total de gols… Você define o resultado depois do jogo.</p>
        </div>
        {extras.map((m, i) => (
          <MarketEditor
            key={i}
            value={m}
            onChange={(v) => setExtras((cur) => cur.map((x, j) => (j === i ? v : x)))}
            onRemove={() => setExtras((cur) => cur.filter((_, j) => j !== i))}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              type="button"
              key={t.name}
              onClick={() => setExtras((cur) => [...cur, cloneMarket(t.market)])}
              className="flex items-center gap-1 rounded-full border border-line bg-panel-2 px-3 py-1.5 text-xs font-semibold transition hover:border-brand/50"
            >
              <Plus size={12} /> {t.name}
            </button>
          ))}
        </div>
      </section>

      <button disabled={busy} className="btn-primary w-full py-3.5 text-base">
        <Rocket size={18} /> {busy ? 'Criando…' : 'Publicar jogo'}
      </button>
    </form>
  )
}
