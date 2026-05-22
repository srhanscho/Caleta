'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, Camera, PiggyBank, User } from 'lucide-react'

const tabs = [
  { label: 'Inicio', icon: Home, href: '/dashboard' },
  { label: 'Transacciones', icon: ArrowLeftRight, href: '/transacciones' },
  { label: 'Caletas', icon: PiggyBank, href: '/caletas' },
  { label: 'Perfil', icon: User, href: '/perfil' },
] as const

type Tab = (typeof tabs)[number]

function NavTab({ label, icon: Icon, href, isActive }: Tab & { isActive: boolean }) {
  const isPlaceholder = href !== '/dashboard'

  if (isPlaceholder) {
    return (
      <button
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
      href={href}
      className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors cursor-pointer ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="text-[10px]">{label}</span>
    </Link>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-border bg-card">
      {tabs.slice(0, 2).map((tab) => (
        <NavTab key={tab.href} {...tab} isActive={pathname === tab.href} />
      ))}

      {/* Tab central — escanear comprobante */}
      <Link
        href="/scan"
        className="flex flex-1 flex-col items-center py-2"
        aria-label="Escanear comprobante"
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            pathname === '/scan' ? 'bg-primary/80' : 'bg-primary'
          }`}
        >
          <Camera className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
        </span>
      </Link>

      {tabs.slice(2).map((tab) => (
        <NavTab key={tab.href} {...tab} isActive={pathname === tab.href} />
      ))}
    </nav>
  )
}
