import type { Metadata } from 'next'
import Crash from '@/views/casino/Crash'

export const metadata: Metadata = { title: 'Foguetinho' }

export default function Page() {
  return <Crash />
}
