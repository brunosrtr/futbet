'use client'

import { useState } from 'react'
import { Ban, Check, Flag, Lock, LockOpen, Plus, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { errMsg, fmtOdd } from '@/lib/format'
import type { Game, Market } from '@/lib/types'
import MarketEditor, { TEMPLATES, cloneMarket, toPayload, validateMarket, type MarketDraft } from './MarketEditor'

async function call(fn: string, args: Record<string, unknown>, success: string) {
  const { error } = await supabase.rpc(fn, args)
  if (error) { toast.error(errMsg(error)); return false }
  toast.success(success)
  return true
}

function OpenMarketRow({ market, onChange }: { market: Market; onChange: () => void }) {
  const [winner, setWinner] = useState<string>('')
  const [odds, setOdds] = useState<Record<string, string>>({})

  async function saveOdd(optionId: string, original: number) {
    const v = odds[optionId]
    if (v === undefined || Number(v.replace(',', '.')) === Number(original)) return
    if (await call('update_odd', { p_option_id: optionId, p_odd: Number(v.replace(',', '.')) }, 'Odd atualizada')) onChange()
    setOdds((o) => { const n = { ...o }; delete n[optionId]; return n })
  }

  return (
    <div className="rounded-lg border border-line bg-bg p-3">
      <div className="mb-2 text-sm font-bold">{market.title}</div>
      <div className="space-y-1.5">
        {market.options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition ${winner === o.id ? 'border-win bg-win/10' : 'border-transparent hover:bg-panel-2'}`}>
            <input type="radio" name={`w-${market.id}`} checked={winner === o.id} onChange={() => setWinner(o.id)} className="accent-[#22c55e]" />
            <span className="flex-1 truncate">{o.label}</span>
            <input
              value={odds[o.id] ?? fmtOdd(o.odd)}
              onChange={(e) => setOdds((s) => ({ ...s, [o.id]: e.target.value.replace(/[^\d.,]/g, '') }))}
              onBlur={() => saveOdd(o.id, o.odd)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              onClick={(e) => e.preventDefault()}
              title="Editar odd (vale para novas apostas)"
              className="w-16 rounded border border-line bg-panel px-1.5 py-0.5 text-right font-display font-bold text-brand outline-none focus:border-brand"
            />
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          disabled={!winner}
          onClick={async () => {
            const label = market.options.find((o) => o.id === winner)?.label
            if (!confirm(`Confirmar "${label}" como resultado de "${market.title}"? Os pagamentos são feitos na hora e não dá pra desfazer.`)) return
            if (await call('settle_market', { p_market_id: market.id, p_option_id: winner }, 'Mercado liquidado! Pagamentos feitos 💸')) onChange()
          }}
          className="btn-primary flex-1 py-2 text-xs"
        >
          <Check size={14} /> Definir resultado
        </button>
        <button
          onClick={async () => {
            if (!confirm(`Anular "${market.title}"? Todas as apostas são devolvidas.`)) return
            if (await call('void_market', { p_market_id: market.id }, 'Mercado anulado, apostas devolvidas')) onChange()
          }}
          className="btn-ghost py-2 text-xs"
        >
          Anular
        </button>
      </div>
    </div>
  )
}

export default function CreatorPanel({ game, markets, onChange }: { game: Game; markets: Market[]; onChange: () => void }) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [draft, setDraft] = useState<MarketDraft | null>(null)
  const active = game.status === 'open' || game.status === 'locked'
  const openMarkets = markets.filter((m) => m.status === 'open' && !(m.is_main && active))
  const mainOpen = markets.some((m) => m.is_main && m.status === 'open')

  return (
    <section className="card overflow-hidden border-gold/30">
      <h2 className="flex items-center gap-2 border-b border-line bg-gold/5 px-4 py-3 font-display text-lg font-bold uppercase tracking-wide text-gold">
        <Settings2 size={18} /> Painel do criador
      </h2>
      <div className="space-y-5 p-4">
        {active && (
          <div className="flex flex-wrap gap-2">
            {game.status === 'open' ? (
              <button onClick={async () => (await call('set_betting_open', { p_game_id: game.id, p_open: false }, 'Apostas fechadas')) && onChange()} className="btn-ghost">
                <Lock size={16} /> Fechar apostas
              </button>
            ) : (
              <button onClick={async () => (await call('set_betting_open', { p_game_id: game.id, p_open: true }, 'Apostas reabertas')) && onChange()} className="btn-ghost">
                <LockOpen size={16} /> Reabrir apostas
              </button>
            )}
            <button
              onClick={async () => {
                if (!confirm('Cancelar o jogo? Todas as apostas pendentes serão devolvidas.')) return
                if (await call('cancel_game', { p_game_id: game.id }, 'Jogo cancelado')) onChange()
              }}
              className="btn-danger"
            >
              <Ban size={16} /> Cancelar jogo
            </button>
          </div>
        )}

        {active && (
          <div>
            <div className="label">Encerrar jogo com placar final</div>
            <div className="flex items-center gap-2">
              <input value={home} onChange={(e) => setHome(e.target.value.replace(/\D/g, ''))} placeholder={game.home_team} inputMode="numeric" className="input w-full text-center font-display text-xl font-bold" />
              <span className="font-display text-xl text-muted">x</span>
              <input value={away} onChange={(e) => setAway(e.target.value.replace(/\D/g, ''))} placeholder={game.away_team} inputMode="numeric" className="input w-full text-center font-display text-xl font-bold" />
              <button
                disabled={home === '' || away === ''}
                onClick={async () => {
                  if (!confirm(`Encerrar ${game.home_team} ${home} x ${away} ${game.away_team}?${mainOpen ? ' O mercado de resultado será pago automaticamente.' : ''}`)) return
                  if (await call('finish_game', { p_game_id: game.id, p_home: Number(home), p_away: Number(away) }, 'Jogo encerrado! 🏁')) onChange()
                }}
                className="btn-primary shrink-0"
              >
                <Flag size={16} /> Encerrar
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted">O mercado "Resultado final" é liquidado automaticamente pelo placar. Os opcionais você define abaixo.</p>
          </div>
        )}

        {openMarkets.length > 0 && (
          <div>
            <div className="label">Resultados dos mercados ({openMarkets.length} pendentes)</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {openMarkets.map((m) => <OpenMarketRow key={m.id} market={m} onChange={onChange} />)}
            </div>
          </div>
        )}

        {active && (
          <div>
            <div className="label">Novo mercado opcional</div>
            {draft ? (
              <div className="space-y-2">
                <MarketEditor value={draft} onChange={setDraft} />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const err = validateMarket(draft)
                      if (err) return toast.error(err)
                      if (await call('add_market', { p_game_id: game.id, p_market: toPayload(draft) }, 'Mercado criado')) { setDraft(null); onChange() }
                    }}
                    className="btn-primary"
                  >
                    Publicar mercado
                  </button>
                  <button onClick={() => setDraft(null)} className="btn-ghost">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => setDraft(cloneMarket(t.market))} className="rounded-full border border-line bg-panel-2 px-3 py-1.5 text-xs font-semibold hover:border-brand/50">
                    {t.name}
                  </button>
                ))}
                <span className="flex items-center text-xs text-muted"><Plus size={12} /> escolha um modelo</span>
              </div>
            )}
          </div>
        )}

        {!active && openMarkets.length === 0 && <p className="text-sm text-muted">Tudo liquidado. Nada pendente por aqui ✅</p>}
      </div>
    </section>
  )
}
