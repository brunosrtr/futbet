'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV, isActivePath } from './Header'

export default function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-bg/95 backdrop-blur-xl md:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          href={to}
          className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
            isActivePath(pathname, to) ? 'text-brand' : 'text-slate-400'
          }`}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  )
}
