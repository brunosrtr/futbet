import type { Metadata } from 'next'
import Roulette from '@/views/casino/Roulette'

export const metadata: Metadata = { title: 'Roleta' }

export default function Page() {
  return <Roulette />
}
