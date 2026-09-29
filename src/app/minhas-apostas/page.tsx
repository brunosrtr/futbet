import type { Metadata } from 'next'
import MyBets from '@/views/MyBets'

export const metadata: Metadata = { title: 'Minhas apostas' }

export default function Page() {
  return <MyBets />
}
