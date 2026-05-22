import Link from 'next/link'
import type { AccountModel } from '@/generated/prisma'
import { formatCOP } from '@/lib/format'

const typeLabel: Record<string, string> = {
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  BANCOLOMBIA: 'Bancolombia',
  NUBANK: 'Nubank',
  EFECTIVO: 'Efectivo',
}

type Props = {
  accounts: AccountModel[]
}

export function AccountsRow({ accounts }: Props) {
  return (
    <section className="px-6 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Mis cuentas</p>
        <Link href="/onboarding" className="text-xs text-primary cursor-pointer">
          + Nueva
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="min-w-[140px] rounded-xl bg-card border border-border p-4 space-y-2 shrink-0"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: account.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-muted-foreground truncate">
                {typeLabel[account.tipo] ?? account.tipo}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">{account.nombre}</p>
            <p className="text-sm font-semibold text-foreground">{formatCOP(account.balance)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
