'use client'

import { Plus, Trash2, X } from 'lucide-react'

export type OptionDraft = { label: string; odd: string }
export type MarketDraft = { title: string; options: OptionDraft[] }

export const TEMPLATES: { name: string; market: MarketDraft }[] = [
  { name: '🟥 Jogador expulso', market: { title: 'Fulano será expulso?', options: [{ label: 'Sim', odd: '8.00' }, { label: 'Não', odd: '1.05' }] } },
  { name: '⚽ Jogador marca', market: { title: 'Fulano marca gol?', options: [{ label: 'Sim', odd: '1.90' }, { label: 'Não', odd: '1.80' }] } },
  { name: '🔢 Total de gols', market: { title: 'Total de gols', options: [{ label: 'Mais de 7.5', odd: '1.85' }, { label: 'Menos de 7.5', odd: '1.95' }] } },
  { name: '🤝 Ambos marcam', market: { title: 'Ambas as equipes marcam?', options: [{ label: 'Sim', odd: '1.35' }, { label: 'Não', odd: '3.00' }] } },
  { name: '👑 Artilheiro', market: { title: 'Artilheiro do jogo', options: [{ label: 'Jogador A', odd: '3.00' }, { label: 'Jogador B', odd: '4.50' }, { label: 'Jogador C', odd: '6.00' }] } },
  { name: '✏️ Personalizado', market: { title: '', options: [{ label: '', odd: '2.00' }, { label: '', odd: '2.00' }] } },
]

export const cloneMarket = (m: MarketDraft): MarketDraft => ({ title: m.title, options: m.options.map((o) => ({ ...o })) })

export const toPayload = (m: MarketDraft) => ({
  title: m.title.trim(),
  options: m.options.map((o) => ({ label: o.label.trim(), odd: Number(o.odd.replace(',', '.')) })),
})

export function validateMarket(m: MarketDraft): string | null {
  if (!m.title.trim()) return 'Todo mercado precisa de um título'
  if (m.options.length < 2) return `"${m.title}" precisa de pelo menos 2 opções`
  for (const o of m.options) {
    if (!o.label.trim()) return `Preencha todas as opções de "${m.title}"`
    const n = Number(o.odd.replace(',', '.'))
    if (!(n >= 1.01)) return `Odd inválida em "${m.title}" (mínimo 1.01)`
  }
  return null
}

export default function MarketEditor({ value, onChange, onRemove }: {
  value: MarketDraft; onChange: (m: MarketDraft) => void; onRemove?: () => void
}) {
  const setOpt = (i: number, patch: Partial<OptionDraft>) =>
    onChange({ ...value, options: value.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) })

  return (
    <div className="rounded-lg border border-line bg-bg p-3">
      <div className="flex items-center gap-2">
        <input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Ex: Zé será expulso?"
          maxLength={80}
          className="input font-semibold"
        />
        {onRemove && (
          <button type="button" onClick={onRemove} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-lose/10 hover:text-lose">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="mt-2 space-y-2">
        {value.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} placeholder={`Opção ${i + 1}`} maxLength={40} className="input py-2" />
            <div className="relative w-28 shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">odd</span>
              <input
                value={o.odd}
                inputMode="decimal"
                onChange={(e) => setOpt(i, { odd: e.target.value.replace(/[^\d.,]/g, '') })}
                className="input py-2 pl-10 text-right font-display text-base font-bold text-brand"
              />
            </div>
            {value.options.length > 2 && (
              <button type="button" onClick={() => onChange({ ...value, options: value.options.filter((_, j) => j !== i) })} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {value.options.length < 10 && (
        <button
          type="button"
          onClick={() => onChange({ ...value, options: [...value.options, { label: '', odd: '2.00' }] })}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          <Plus size={14} /> Adicionar opção
        </button>
      )}
    </div>
  )
}
