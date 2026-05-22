import type { Transaction, Category, Account } from '@/generated/prisma'
import { formatCOP, formatRelativeDate } from '@/lib/format'

type TransactionWithRefs = Transaction & {
  category: Category
  account: Account
}

type Props = {
  transactions: TransactionWithRefs[]
}

export function RecentTransactions({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <section className="px-6 py-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Movimientos recientes</p>
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aún no tienes movimientos. Agrega tu primera transacción.
        </p>
      </section>
    )
  }

  return (
    <section className="px-6 py-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Movimientos recientes</p>
      <ul className="space-y-3">
        {transactions.map((tx) => {
          const isIncome = tx.tipo === 'INCOME'
          const sign = isIncome ? '+' : '-'
          const amountColor = isIncome ? '#22C55E' : undefined

          return (
            <li key={tx.id} className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
                style={{ background: tx.category.color + '26' }}
                aria-hidden="true"
              >
                {tx.category.icono}
              </span>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm text-foreground truncate">
                  {tx.descripcion ?? tx.category.nombre}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(tx.fecha)}
                </span>
              </div>
              <span
                className={`text-sm font-medium shrink-0 ${isIncome ? '' : 'text-destructive'}`}
                style={isIncome ? { color: '#22C55E' } : undefined}
              >
                {sign}{formatCOP(Math.abs(tx.monto))}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
