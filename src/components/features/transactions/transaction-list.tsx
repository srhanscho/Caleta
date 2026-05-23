'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { TransactionDrawer, type TransactionWithRefs } from './transaction-drawer'
import { CategoryIcon } from './category-icon'

type AccountOption = { id: string; nombre: string; tipo: string; color: string }
type CategoryOption = { id: string; nombre: string; tipo: string }

type DrawerState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; transaction: TransactionWithRefs }

type Props = {
  transactions: TransactionWithRefs[]
  accounts: AccountOption[]
  categories: CategoryOption[]
}

function formatCOP(centavos: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centavos / 100)
}

function formatRelativeDate(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
}

export function TransactionList({ transactions, accounts, categories }: Props) {
  const router = useRouter()
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false })

  const drawerKey = drawerState.open
    ? drawerState.mode === 'edit'
      ? drawerState.transaction.id
      : 'create'
    : 'closed'

  return (
    <>
      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          Aún no tienes transacciones. Toca + para agregar una.
        </p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((tx) => {
            const isIncome = tx.tipo === 'INCOME'
            return (
              <li key={tx.id}>
                <button
                  type="button"
                  onClick={() =>
                    setDrawerState({ open: true, mode: 'edit', transaction: tx })
                  }
                  className="flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left transition-colors active:bg-secondary"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ background: tx.category.color + '26', color: tx.category.color }}
                    aria-hidden="true"
                  >
                    <CategoryIcon name={tx.category.icono} />
                  </span>
                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="text-sm text-foreground truncate">
                      {tx.descripcion ?? tx.category.nombre}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tx.account.nombre} · {formatRelativeDate(tx.fecha)}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium shrink-0 ${
                      isIncome ? '' : 'text-destructive'
                    }`}
                    style={isIncome ? { color: '#22C55E' } : undefined}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCOP(Math.abs(tx.monto))}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setDrawerState({ open: true, mode: 'create' })}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg text-primary-foreground z-40"
        aria-label="Nueva transacción"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Drawer */}
      <TransactionDrawer
        key={drawerKey}
        open={drawerState.open}
        mode={drawerState.open ? drawerState.mode : 'create'}
        transaction={
          drawerState.open && drawerState.mode === 'edit'
            ? drawerState.transaction
            : undefined
        }
        accounts={accounts}
        categories={categories}
        onClose={() => setDrawerState({ open: false })}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
