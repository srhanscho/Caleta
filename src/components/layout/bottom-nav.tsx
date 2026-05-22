'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, PiggyBank, User } from 'lucide-react'

const tabs = [
  { label: 'Inicio', icon: Home, href: '/dashboard' },
  { label: 'Transacciones', icon: ArrowLeftRight, href: '/transacciones' },
  { label: 'Caletas', icon: PiggyBank, href: '/caletas' },
  { label: 'Perfil', icon: User, href: '/perfil' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card">
      {tabs.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href
        const isPlaceholder = href !== '/dashboard'

        if (isPlaceholder) {
          return (
            <button
              key={href}
              type="button"
              onClick={() => alert('Próximamente')}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground transition-colors cursor-pointer"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px]">{label}</span>
            </button>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors cursor-pointer ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
