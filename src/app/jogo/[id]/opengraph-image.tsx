import { ImageResponse } from 'next/og'
import { fetchGameSummary } from '@/lib/server'
import { fmtOdd, teamColor, initials } from '@/lib/format'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Jogo no FutBet'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const summary = await fetchGameSummary(id).catch(() => null)
  const game = summary?.game
  const main = summary?.main

  const team = (name: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 380, gap: 20 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 150, height: 150, borderRadius: 999,
          border: `6px solid ${teamColor(name)}`, color: teamColor(name), fontSize: 64, fontWeight: 800,
        }}
      >
        {initials(name)}
      </div>
      <div style={{ fontSize: 48, fontWeight: 800, textAlign: 'center', textTransform: 'uppercase' }}>{name}</div>
    </div>
  )

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0b1018', color: '#f1f5f9', padding: 56 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>
            ⚽ FUT<span style={{ color: '#c6ff3d' }}>BET</span>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#8190a8' }}>apostas fictícias entre amigos</div>
        </div>
        {game ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {team(game.home_team)}
              <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, color: '#8190a8' }}>
                {game.status === 'finished' ? `${game.home_score} : ${game.away_score}` : 'VS'}
              </div>
              {team(game.away_team)}
            </div>
            {main && (
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                {main.options.map((o) => (
                  <div key={o.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#182130', border: '2px solid #232e40', borderRadius: 16, padding: '14px 36px', minWidth: 260 }}>
                    <div style={{ fontSize: 24, color: '#8190a8' }}>{o.label}</div>
                    <div style={{ fontSize: 48, fontWeight: 800, color: '#c6ff3d' }}>{fmtOdd(o.odd)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 800 }}>
            O futsal da galera agora tem odds.
          </div>
        )}
      </div>
    ),
    size,
  )
}
