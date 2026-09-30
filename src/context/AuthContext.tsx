'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

type AuthCtx = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  /** Segura atualizações de saldo por `ms` (para não entregar o resultado antes da animação) */
  holdBalance: (ms: number) => void
}

const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const uid = session?.user.id
  const holdUntil = useRef(0)
  const holdBalance = useCallback((ms: number) => { holdUntil.current = Date.now() + ms }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!uid) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data as Profile | null)
  }, [uid])

  // Saldo ao vivo: quando uma aposta é liquidada o saldo atualiza sozinho
  useEffect(() => {
    refreshProfile()
    if (!uid) return
    const ch = supabase
      .channel(`profile-${uid}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        (p) => {
          const wait = holdUntil.current - Date.now()
          if (wait > 0) setTimeout(() => setProfile(p.new as Profile), wait)
          else setProfile(p.new as Profile)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid, refreshProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return <Ctx.Provider value={{ session, profile, loading, refreshProfile, signOut, holdBalance }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
