'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { BetSlipProvider } from '@/context/BetSlipContext'
import { isConfigured } from '@/lib/supabase'
import Header from '@/components/Header'
import MobileNav from '@/components/MobileNav'
import BetSlip from '@/components/BetSlip'

function Setup() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="font-display text-3xl font-bold">MigasBet — configuração</h1>
      <p className="mt-3 text-sm text-slate-400">
        Defina <code className="text-brand">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
        <code className="text-brand">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (arquivo .env local ou variáveis de
        ambiente na Vercel). Veja o README.
      </p>
    </div>
  )
}

export default function Providers({ children }: { children: ReactNode }) {
  const casino = usePathname().startsWith('/cassino')
  if (!isConfigured) return <Setup />
  return (
    <AuthProvider>
      <BetSlipProvider>
        <Header />
        <div className={`mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-6 lg:pb-10 ${casino ? '' : 'lg:grid-cols-[minmax(0,1fr)_340px]'}`}>
          <main className="min-w-0">{children}</main>
          {!casino && <BetSlip />}
        </div>
        <footer className="hidden border-t border-line py-6 text-center text-xs text-muted lg:block">
          MigasBet · diversão entre amigos · moeda fictícia (MJ$), sem dinheiro real
        </footer>
        <MobileNav />
        <Toaster theme="dark" position="top-center" richColors />
      </BetSlipProvider>
    </AuthProvider>
  )
}
