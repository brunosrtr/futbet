import type { Metadata } from 'next'
import { Suspense } from 'react'
import Login from '@/views/Login'

export const metadata: Metadata = { title: 'Entrar' }

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  )
}
