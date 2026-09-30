import type { Metadata } from 'next'
import Slots from '@/views/casino/Slots'

export const metadata: Metadata = { title: 'Caça-níquel' }

export default function Page() {
  return <Slots />
}
