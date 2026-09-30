'use client'

import Link from 'next/link'

export default function LoginGate() {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <span className="text-4xl">🔒</span>
      <p className="text-muted">Entre na sua conta para jogar. Você ganha MJ$ 1.000 ao se cadastrar.</p>
      <div className="flex gap-2">
        <Link href="/entrar" className="btn-ghost">Entrar</Link>
        <Link href="/entrar?modo=cadastro" className="btn-primary">Criar conta</Link>
      </div>
    </div>
  )
}
