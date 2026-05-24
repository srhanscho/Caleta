'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Sparkles } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { createTransaction } from '@/server/actions/transactions/create-transaction'
import { updateTransaction } from '@/server/actions/transactions/update-transaction'
import { deleteTransaction } from '@/server/actions/transactions/extract-transaction'
import { suggestCategory } from '@/server/actions/transactions/suggest-category'
import type { TransactionModel, CategoryModel, AccountModel, TransactionType } from '@/generated/prisma'

export type TransactionWithRefs = TransactionModel & {
  category: CategoryModel
  account: AccountModel
}

type AccountOption = { id: string; nombre: string; tipo: string; color: string }
type CategoryOption = { id: string; nombre: string; tipo: string }

type SuggestionState = 'idle' | 'loading' | { categoryId: string; nombre: string }

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
  const [isPending, startTransition] = useTransition()
  const [suggestion, setSuggestion] = useState<SuggestionState>('idle')

  const filteredCategories = categories.filter(
    (c) => c.tipo === (tipo === 'INCOME' ? 'INCOME' : 'EXPENSE')
  )

  function handleTipoChange(newTipo: TransactionType) {
    setTipo(newTipo)
    const newFilter = newTipo === 'INCOME' ? 'INCOME' : 'EXPENSE'
    const current = categories.find((c) => c.id === categoryId)
    if (current && current.tipo !== newFilter) setCategoryId('')
    setSuggestion('idle')
  }

  function handleSuggest() {
    if (!descripcion.trim() || tipo === 'TRANSFER') return
    setSuggestion('loading')
    startTransition(async () => {
      const result = await suggestCategory(descripcion, tipo)
      if (result.success) {
        setSuggestion(result.data)
      } else {
        setSuggestion('idle')
        toast.error(result.error)
      }
    })
  }

  function handleDescripcionBlur() {
    if (descripcion.trim() && !categoryId && tipo !== 'TRANSFER' && suggestion === 'idle') {
      handleSuggest()
    }
  }

  function acceptSuggestion(s: { categoryId: string; nombre: string }) {
    setCategoryId(s.categoryId)
    setSuggestion('idle')
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Categoría</label>
              {tipo !== 'TRANSFER' && descripcion.trim() && (
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={suggestion === 'loading' || isPending}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-primary disabled:opacity-50"
                >
                  {suggestion === 'loading' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Sugerir
                </button>
              )}
            </div>

            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setSuggestion('idle') }}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecciona una categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {typeof suggestion === 'object' && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="flex-1 text-xs text-foreground">
                  ¿Es <span className="font-semibold">{suggestion.nombre}</span>?
                </span>
                <button
                  type="button"
                  onClick={() => acceptSuggestion(suggestion)}
                  className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground"
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestion('idle')}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  No
                </button>
              </div>
            )}
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
              onBlur={handleDescripcionBlur}
              maxLength={120}
              placeholder="¿En qué gastaste?"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Guardar */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : 'Guardar'}
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
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  {isPending ? 'Eliminando...' : 'Sí, eliminar'}
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
