import { NavLink } from 'react-router-dom'
import { NAV } from './Header'

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-bg/95 backdrop-blur-xl md:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${isActive ? 'text-brand' : 'text-slate-400'}`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
