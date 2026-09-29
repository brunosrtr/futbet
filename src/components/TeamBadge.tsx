import { initials, teamColor } from '../lib/format'

export default function TeamBadge({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const c = teamColor(name)
  const cls = size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-9 w-9 text-sm'
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-extrabold ${cls}`}
      style={{ background: `color-mix(in srgb, ${c} 18%, transparent)`, color: c, boxShadow: `inset 0 0 0 2px ${c}` }}
    >
      {initials(name)}
    </span>
  )
}
