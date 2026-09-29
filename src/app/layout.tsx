import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import Providers from './Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const barlow = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-barlow' })

export const metadata: Metadata = {
  title: { default: 'MigasBet — apostas de futsal entre amigos', template: '%s · MigasBet' },
  description: 'Crie jogos de futsal, defina as odds e aposte com os amigos. 100% fictício, sem dinheiro real.',
}

export const viewport: Viewport = { themeColor: '#0b1018' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${barlow.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
