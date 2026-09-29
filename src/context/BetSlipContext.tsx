import { createContext, useContext, useState, type ReactNode } from 'react'

export type Selection = {
  optionId: string
  optionLabel: string
  odd: number
  marketId: string
  marketTitle: string
  gameId: string
  gameLabel: string
}

type SlipCtx = {
  selections: Selection[]
  stakes: Record<string, string>
  open: boolean
  setOpen: (v: boolean) => void
  toggle: (s: Selection) => void
  remove: (optionId: string) => void
  clear: () => void
  setStake: (optionId: string, v: string) => void
  isSelected: (optionId: string) => boolean
}

const Ctx = createContext<SlipCtx>(null!)

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<Selection[]>([])
  const [stakes, setStakes] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)

  const toggle = (s: Selection) =>
    setSelections((cur) => {
      if (cur.some((x) => x.optionId === s.optionId)) return cur.filter((x) => x.optionId !== s.optionId)
      // Só uma seleção por mercado, como numa casa de verdade
      return [...cur.filter((x) => x.marketId !== s.marketId), s]
    })

  const remove = (optionId: string) => setSelections((cur) => cur.filter((x) => x.optionId !== optionId))
  const clear = () => { setSelections([]); setStakes({}) }
  const setStake = (optionId: string, v: string) => setStakes((cur) => ({ ...cur, [optionId]: v }))
  const isSelected = (optionId: string) => selections.some((x) => x.optionId === optionId)

  return (
    <Ctx.Provider value={{ selections, stakes, open, setOpen, toggle, remove, clear, setStake, isSelected }}>
      {children}
    </Ctx.Provider>
  )
}

export const useBetSlip = () => useContext(Ctx)
