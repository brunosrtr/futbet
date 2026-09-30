import type { Metadata } from 'next'
import Mines from '@/views/casino/Mines'

export const metadata: Metadata = { title: 'Mines' }

export default function Page() {
  return <Mines />
}
