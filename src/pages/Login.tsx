import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { errMsg } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Header'

const translate = (m: string) =>
  m.includes('Invalid login') ? 'Email ou senha incorretos'
  : m.includes('already registered') ? 'Este email já tem conta'
  : m.includes('Password should') ? 'A senha precisa ter pelo menos 6 caracteres'
  : m.includes('Email not confirmed') ? 'Confirme seu email antes de entrar'
  : m

export default function Login() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(params.get('modo') === 'cadastro' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()

  if (session) return <Navigate to="/" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signup') {
        const u = username.trim()
        if (!/^[a-zA-Z0-9_.]{3,20}$/.test(u)) throw new Error('Apelido: 3 a 20 caracteres (letras, números, _ ou .)')
        const { data: taken } = await supabase.from('profiles').select('id').ilike('username', u).maybeSingle()
        if (taken) throw new Error('Esse apelido já está em uso')
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username: u } } })
        if (error) throw error
        if (!data.session) {
          toast.success('Conta criada! Confira seu email para confirmar.')
          setMode('login')
          return
        }
        toast.success(`Bem-vindo, ${u}! Você ganhou FC 1.000 🎉`)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      navigate('/')
    } catch (err) {
      toast.error(translate(errMsg(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-[#1a2a0f] to-panel p-6 text-center">
          <div className="flex justify-center"><Logo /></div>
          <p className="mt-2 text-sm text-slate-300">
            {mode === 'signup' ? 'Crie sua conta e ganhe FC 1.000 fictícios pra começar.' : 'Bora pra resenha.'}
          </p>
        </div>
        <div className="grid grid-cols-2 border-y border-line">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-3 text-sm font-bold uppercase tracking-wide transition ${mode === m ? 'border-b-2 border-brand text-brand' : 'text-muted hover:text-white'}`}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {mode === 'signup' && (
            <div>
              <label className="label">Apelido</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: neymar_da_varzea" className="input" required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required autoComplete="email" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
          <button disabled={busy} className="btn-primary w-full py-3">
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta e ganhar FC 1.000'}
          </button>
          <p className="text-center text-[11px] text-muted">Site de diversão entre amigos. Nenhum dinheiro real é usado.</p>
        </form>
      </div>
    </div>
  )
}
