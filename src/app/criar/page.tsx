import type { Metadata } from 'next'
import CreateGame from '@/views/CreateGame'

export const metadata: Metadata = { title: 'Criar jogo' }

export default function Page() {
  return <CreateGame />
}
