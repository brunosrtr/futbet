import type { Metadata } from 'next'
import Lobby from '@/views/casino/Lobby'

export const metadata: Metadata = { title: 'Cassino' }

export default function Page() {
  return <Lobby />
}
