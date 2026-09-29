import type { Metadata } from 'next'
import Ranking from '@/views/Ranking'

export const metadata: Metadata = { title: 'Ranking' }

export default function Page() {
  return <Ranking />
}
