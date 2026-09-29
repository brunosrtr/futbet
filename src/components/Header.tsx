import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Gift, LogOut, Plus, Receipt, Trophy, Home } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { errMsg, money } from '../lib/format'

export const NAV = [
  { to: '/', label: 'Jogos', icon: Home },
  { to: '/criar', label: 'Criar jogo', icon: Plus },
  { to: '/minhas-apostas', label: 'Minhas apostas', icon: Receipt },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
]

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-bg">⚽</span>
      <span>FUT<span className="text-brand">BET</span></span>
    </Link>
  )
}

export default function Header() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const bonusReady =
    !!profile && (!profile.last_bonus_at || Date.now() - new Date(profile.last_bonus_at).getTime() > 86_400_000)

  async function claimBonus() {
    const { error } = await supabase.rpc('claim_daily_bonus')
    if (error) toast.error(errMsg(error))
    else toast.success('Bônus diário resgatado: + FC 100,00 🎁')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-panel-2 text-brand' : 'text-slate-300 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {profile ? (
            <>
              <button
                onClick={claimBonus}
                title={bonusReady ? 'Resgatar bônus diário' : 'Bônus já resgatado hoje'}
                className={`relative grid h-10 w-10 place-items-center rounded-lg border border-line bg-panel transition hover:border-gold/60 ${
                  bonusReady ? 'text-gold' : 'text-slate-500'
                }`}
              >
                <Gift size={18} />
                {bonusReady && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-gold" />}
              </button>
              <div className="rounded-lg border border-line bg-panel px-3 py-1.5 text-right leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{profile.username}</div>
                <div className="font-display text-lg font-bold text-brand">{money(profile.balance)}</div>
              </div>
              <button
                onClick={async () => { await signOut(); navigate('/') }}
                title="Sair"
                className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-panel text-slate-400 transition hover:text-white"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/entrar" className="btn-ghost">Entrar</Link>
              <Link to="/entrar?modo=cadastro" className="btn-primary hidden sm:inline-flex">Criar conta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
