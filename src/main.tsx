import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { BetSlipProvider } from './context/BetSlipContext'
import { isConfigured } from './lib/supabase'
import './index.css'

function Setup() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="font-display text-3xl font-bold">FutBet — configuração</h1>
      <p className="mt-3 text-sm text-slate-400">
        Defina <code className="text-brand">VITE_SUPABASE_URL</code> e <code className="text-brand">VITE_SUPABASE_ANON_KEY</code> (arquivo
        .env local ou variáveis de ambiente na Vercel). Veja o README.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <BetSlipProvider>
            <App />
            <Toaster theme="dark" position="top-center" richColors />
          </BetSlipProvider>
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <Setup />
    )}
  </StrictMode>,
)
