'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { createTransaction } from '@/server/actions/transactions/create-transaction'
import { updateTransaction } from '@/server/actions/transactions/update-transaction'
import { deleteTransaction } from '@/server/actions/transactions/extract-transaction'
import type { TransactionModel, CategoryModel, AccountModel, TransactionType } from '@/generated/prisma'

export type TransactionWithRefs = TransactionModel & {
  category: CategoryModel
  account: AccountModel
}

type AccountOption = { id: string; nombre: string; tipo: string; color: string }
type CategoryOption = { id: string; nombre: string; tipo: string }

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  transaction?: TransactionWithRefs
  accounts: AccountOption[]
  categories: CategoryOption[]
  onClose: () => void
  onSuccess: () => void
}

const typeLabel: Record<TransactionType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
}

const TODAY = new Date().toISOString().split('T')[0]

export function TransactionDrawer({
  open,
  mode,
  transaction,
  accounts,
  categories,
  onClose,
  onSuccess,
}: Props) {
  const [tipo, setTipo] = useState<TransactionType>(transaction?.tipo ?? 'EXPENSE')
  const [monto, setMonto] = useState(
    transaction ? String(transaction.monto / 100) : ''
  )
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? accounts[0]?.id ?? ''
  )
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [fecha, setFecha] = useState(
    transaction ? new Date(transaction.fecha).toISOString().split('T')[0] : TODAY
  )
  const [descripcion, setDescripcion] = useState(transaction?.descripcion ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [, startTransition] = useTransition()

  const filteredCategories = categories.filter(
    (c) => c.tipo === (tipo === 'INCOME' ? 'INCOME' : 'EXPENSE')
  )

  function handleTipoChange(newTipo: TransactionType) {
    setTipo(newTipo)
    const newFilter = newTipo === 'INCOME' ? 'INCOME' : 'EXPENSE'
    const current = categories.find((c) => c.id === categoryId)
    if (current && current.tipo !== newFilter) setCategoryId('')
  }

  function handleClose() {
    setConfirmDelete(false)
    onClose()
  }

  function handleSave() {
    const montoNum = parseFloat(monto)
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!accountId) { toast.error('Selecciona una cuenta'); return }
    if (!categoryId) { toast.error('Selecciona una categoría'); return }
    if (!fecha) { toast.error('Selecciona una fecha'); return }

    const input = {
      tipo,
      monto: montoNum,
      accountId,
      categoryId,
      fecha,
      descripcion: descripcion || undefined,
    }

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createTransaction(input)
          : await updateTransaction(transaction!.id, input)

      if (!result.success) { toast.error(result.error); return }

      toast.success(mode === 'create' ? 'Transacción creada' : 'Transacción actualizada')
      onSuccess()
      handleClose()
    })
  }

  function handleDelete() {
    if (!transaction) return
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Transacción eliminada')
      onSuccess()
      handleClose()
    })
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {mode === 'create' ? 'Nueva transacción' : 'Editar transacción'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Tipo */}
          <div className="flex gap-2">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTipoChange(t)}
                className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
                  tipo === t
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground'
                }`}
              >
                {typeLabel[t]}
              </button>
            ))}
          </div>

          {/* Monto */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Monto (COP)</label>
            <input
              type="number"
              min="1"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground text-lg font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Cuenta */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cuenta</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecciona una categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={120}
              placeholder="¿En qué gastaste?"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Guardar */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Guardar
          </button>

          {/* Eliminar — modo edición */}
          {mode === 'edit' && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-xl border border-destructive py-3 text-sm font-semibold text-destructive"
            >
              Eliminar
            </button>
          )}

          {mode === 'edit' && confirmDelete && (
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                ¿Seguro? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-border py-3 text-sm text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
