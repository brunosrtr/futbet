import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="card p-10 text-center">
      <p className="text-4xl">🥅</p>
      <p className="mt-2 text-muted">Bola fora! Página não encontrada.</p>
      <Link href="/" className="btn-primary mt-4">Voltar aos jogos</Link>
    </div>
  )
}
