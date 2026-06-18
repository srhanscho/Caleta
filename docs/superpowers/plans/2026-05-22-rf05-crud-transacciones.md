# RF-05 CRUD Manual de Transacciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/transacciones` con lista completa, FAB para crear, drawer para crear/editar/eliminar transacciones manualmente, con actualización atómica del balance de cuenta.

**Architecture:** Server Component carga transacciones + cuentas + categorías en paralelo y las pasa a `TransactionList` (Client Component). El drawer es un componente separado `TransactionDrawer` con dos modos. Cada mutación llama una Server Action con `prisma.$transaction` y termina con `router.refresh()`.

**Tech Stack:** Next.js 15 Server Components + Server Actions, Prisma 7 (`prisma.$transaction`), shadcn Drawer (vaul), sonner toast, Tailwind v4, lucide-react.

---

## File Structure

| Acción | Archivo | Responsabilidad |
|--------|---------|----------------|
| Crear | `src/server/actions/transactions/create-transaction.ts` | SA crear TX + ajustar balance atómicamente |
| Crear | `src/server/actions/transactions/update-transaction.ts` | SA actualizar TX + revertir/aplicar balance |
| Modificar | `src/server/actions/transactions/extract-transaction.ts` | Extender `deleteTransaction` para revertir balance |
| Crear | `src/app/(dashboard)/transacciones/page.tsx` | Server Component — carga datos, renderiza página |
| Crear | `src/components/features/transactions/transaction-list.tsx` | Client Component — lista + FAB + estado drawer |
| Crear | `src/components/features/transactions/transaction-drawer.tsx` | Client Component — formulario crear/editar |
| Modificar | `src/components/layout/bottom-nav.tsx` | Activar tab Transacciones como link real |

---

## Task 1: Instalar shadcn Drawer

**Files:**
- Crear: `src/components/ui/drawer.tsx` (generado por shadcn)

- [ ] **Paso 1: Instalar Drawer via shadcn**

  ```bash
  pnpm dlx shadcn@latest add drawer
  ```

  Responde `y` si pregunta por sobreescribir. Crea `src/components/ui/drawer.tsx` (usa vaul internamente).

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit**

  ```bash
  git add src/components/ui/drawer.tsx package.json pnpm-lock.yaml
  git commit -m "feat: install shadcn drawer component"
  ```

---

## Task 2: Extender deleteTransaction con revert de balance

**Files:**
- Modificar: `src/server/actions/transactions/extract-transaction.ts`

- [ ] **Paso 1: Reemplazar la función `deleteTransaction`**

  Reemplaza únicamente la función `deleteTransaction` (líneas 99–117) con:

  ```typescript
  export async function deleteTransaction(id: string): Promise<ActionResult<void>> {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

    try {
      const tx = await prisma.transaction.findUnique({
        where: { id, userId: prismaUser.id },
        select: { tipo: true, monto: true, accountId: true },
      })
      if (!tx) return { success: false, error: 'Transacción no encontrada' }

      const revert =
        tx.tipo === 'INCOME' ? -tx.monto : tx.tipo === 'EXPENSE' ? tx.monto : 0

      await prisma.$transaction(async (prismaTx) => {
        await prismaTx.transaction.delete({ where: { id } })
        if (revert !== 0) {
          await prismaTx.account.update({
            where: { id: tx.accountId },
            data: { balance: { increment: revert } },
          })
        }
      })

      return { success: true, data: undefined }
    } catch {
      return { success: false, error: 'Error al eliminar la transacción' }
    }
  }
  ```

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit**

  ```bash
  git add src/server/actions/transactions/extract-transaction.ts
  git commit -m "feat: extend deleteTransaction to revert account balance"
  ```

---

## Task 3: createTransaction Server Action

**Files:**
- Crear: `src/server/actions/transactions/create-transaction.ts`

- [ ] **Paso 1: Crear el archivo**

  ```typescript
  // src/server/actions/transactions/create-transaction.ts
  'use server'

  import { createClient } from '@/lib/supabase/server'
  import { prisma } from '@/lib/prisma'
  import type { ActionResult } from '@/types'
  import type { TransactionModel, TransactionType } from '@/generated/prisma'

  type CreateInput = {
    tipo: TransactionType
    monto: number       // pesos COP — SA multiplica ×100
    accountId: string
    categoryId: string
    fecha: string       // YYYY-MM-DD
    descripcion?: string
  }

  export async function createTransaction(
    input: CreateInput
  ): Promise<ActionResult<TransactionModel>> {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

    if (input.monto <= 0) return { success: false, error: 'El monto debe ser mayor a 0' }

    const montoCentavos = Math.round(input.monto * 100)
    const balanceDelta =
      input.tipo === 'INCOME' ? montoCentavos : input.tipo === 'EXPENSE' ? -montoCentavos : 0

    try {
      const transaction = await prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            userId: prismaUser.id,
            accountId: input.accountId,
            categoryId: input.categoryId,
            monto: montoCentavos,
            tipo: input.tipo,
            fecha: new Date(input.fecha),
            descripcion: input.descripcion ?? null,
          },
        })
        if (balanceDelta !== 0) {
          await tx.account.update({
            where: { id: input.accountId },
            data: { balance: { increment: balanceDelta } },
          })
        }
        return created
      })

      return { success: true, data: transaction }
    } catch {
      return { success: false, error: 'Error al guardar la transacción' }
    }
  }
  ```

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit**

  ```bash
  git add src/server/actions/transactions/create-transaction.ts
  git commit -m "feat: add createTransaction server action with atomic balance update"
  ```

---

## Task 4: updateTransaction Server Action

**Files:**
- Crear: `src/server/actions/transactions/update-transaction.ts`

- [ ] **Paso 1: Crear el archivo**

  ```typescript
  // src/server/actions/transactions/update-transaction.ts
  'use server'

  import { createClient } from '@/lib/supabase/server'
  import { prisma } from '@/lib/prisma'
  import type { ActionResult } from '@/types'
  import type { TransactionModel, TransactionType } from '@/generated/prisma'

  type UpdateInput = {
    tipo: TransactionType
    monto: number       // pesos COP — SA multiplica ×100
    accountId: string
    categoryId: string
    fecha: string       // YYYY-MM-DD
    descripcion?: string
  }

  function delta(tipo: TransactionType, montoCentavos: number): number {
    if (tipo === 'INCOME') return montoCentavos
    if (tipo === 'EXPENSE') return -montoCentavos
    return 0
  }

  export async function updateTransaction(
    id: string,
    input: UpdateInput
  ): Promise<ActionResult<TransactionModel>> {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

    if (input.monto <= 0) return { success: false, error: 'El monto debe ser mayor a 0' }

    try {
      const old = await prisma.transaction.findUnique({
        where: { id, userId: prismaUser.id },
        select: { tipo: true, monto: true, accountId: true },
      })
      if (!old) return { success: false, error: 'Transacción no encontrada' }

      const newMontoCentavos = Math.round(input.monto * 100)
      const oldDelta = delta(old.tipo, old.monto)
      const newDelta = delta(input.tipo, newMontoCentavos)

      const transaction = await prisma.$transaction(async (tx) => {
        if (oldDelta !== 0) {
          await tx.account.update({
            where: { id: old.accountId },
            data: { balance: { increment: -oldDelta } },
          })
        }
        if (newDelta !== 0) {
          await tx.account.update({
            where: { id: input.accountId },
            data: { balance: { increment: newDelta } },
          })
        }
        return tx.transaction.update({
          where: { id },
          data: {
            accountId: input.accountId,
            categoryId: input.categoryId,
            monto: newMontoCentavos,
            tipo: input.tipo,
            fecha: new Date(input.fecha),
            descripcion: input.descripcion ?? null,
          },
        })
      })

      return { success: true, data: transaction }
    } catch {
      return { success: false, error: 'Error al actualizar la transacción' }
    }
  }
  ```

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit**

  ```bash
  git add src/server/actions/transactions/update-transaction.ts
  git commit -m "feat: add updateTransaction server action with atomic balance revert+apply"
  ```

---

## Task 5: Activar tab Transacciones en BottomNav

**Files:**
- Modificar: `src/components/layout/bottom-nav.tsx`

- [ ] **Paso 1: Cambiar la condición `isPlaceholder`**

  En `src/components/layout/bottom-nav.tsx`, línea 17, reemplaza:

  ```typescript
  const isPlaceholder = href !== '/dashboard'
  ```

  por:

  ```typescript
  const isPlaceholder = href !== '/dashboard' && href !== '/transacciones'
  ```

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit**

  ```bash
  git add src/components/layout/bottom-nav.tsx
  git commit -m "feat: activate Transacciones tab in BottomNav"
  ```

---

## Task 6: TransactionDrawer component

**Files:**
- Crear: `src/components/features/transactions/transaction-drawer.tsx`

- [ ] **Paso 1: Crear el archivo**

  ```tsx
  // src/components/features/transactions/transaction-drawer.tsx
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
  ```

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit**

  ```bash
  git add src/components/features/transactions/transaction-drawer.tsx
  git commit -m "feat: add TransactionDrawer component with create/edit/delete modes"
  ```

---

## Task 7: TransactionList component + página /transacciones

**Files:**
- Crear: `src/components/features/transactions/transaction-list.tsx`
- Crear: `src/app/(dashboard)/transacciones/page.tsx`

- [ ] **Paso 1: Crear `transaction-list.tsx`**

  ```tsx
  // src/components/features/transactions/transaction-list.tsx
  'use client'

  import { useState } from 'react'
  import { useRouter } from 'next/navigation'
  import { Plus } from 'lucide-react'
  import { TransactionDrawer, type TransactionWithRefs } from './transaction-drawer'
  import { formatCOP, formatRelativeDate } from '@/lib/format'
  import type { AccountModel, CategoryModel } from '@/generated/prisma'

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

        {/* Drawer — key fuerza remount al cambiar de transacción */}
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
  ```

- [ ] **Paso 2: Crear `src/app/(dashboard)/transacciones/page.tsx`**

  ```tsx
  // src/app/(dashboard)/transacciones/page.tsx
  import { redirect } from 'next/navigation'
  import { createClient } from '@/lib/supabase/server'
  import { prisma } from '@/lib/prisma'
  import { TransactionList } from '@/components/features/transactions/transaction-list'

  export default async function TransaccionesPage() {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    if (!supabaseUser) redirect('/login')

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })
    if (!prismaUser) redirect('/login')

    const [transactions, accounts, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: prismaUser.id },
        include: { category: true, account: true },
        orderBy: { fecha: 'desc' },
      }),
      prisma.account.findMany({
        where: { userId: prismaUser.id, activa: true },
        select: { id: true, nombre: true, tipo: true, color: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.category.findMany({
        where: { OR: [{ userId: prismaUser.id }, { userId: null }] },
        select: { id: true, nombre: true, tipo: true },
        orderBy: { nombre: 'asc' },
      }),
    ])

    return (
      <main className="pb-24 px-4 pt-6">
        <h1 className="text-xl font-semibold text-foreground mb-4 px-2">
          Transacciones
        </h1>
        <TransactionList
          transactions={transactions}
          accounts={accounts}
          categories={categories}
        />
      </main>
    )
  }
  ```

- [ ] **Paso 3: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 4: Commit**

  ```bash
  git add src/components/features/transactions/transaction-list.tsx src/app/(dashboard)/transacciones/page.tsx
  git commit -m "feat: add TransactionList component and /transacciones page"
  ```

---

## Task 8: Prueba manual en Vercel

- [ ] **Paso 1: Push y esperar deploy**

  ```bash
  git push origin main
  ```

- [ ] **Paso 2: Verificar tab Transacciones**

  Abre `caleta-six.vercel.app/dashboard` → el tab "Transacciones" en el bottom nav debe navegar a `/transacciones` (ya no muestra "Próximamente").

- [ ] **Paso 3: Verificar flujo crear**

  1. Tocar el FAB `+` → se abre el drawer desde abajo
  2. Seleccionar tipo (Gasto por defecto)
  3. Ingresar monto, cuenta, categoría, fecha
  4. Tocar "Guardar" → toast "Transacción creada" → drawer se cierra → lista se actualiza

- [ ] **Paso 4: Verificar flujo editar**

  1. Tocar cualquier item de la lista → se abre el drawer con datos precargados
  2. Cambiar algún campo → "Guardar" → toast "Transacción actualizada"

- [ ] **Paso 5: Verificar flujo eliminar**

  1. Abrir drawer de edición → tocar "Eliminar"
  2. Aparece confirmación "¿Seguro?" → tocar "Sí, eliminar"
  3. Toast "Transacción eliminada" → lista actualizada

- [ ] **Paso 6: Verificar balance en dashboard**

  Crear un gasto → ir al dashboard → confirmar que el balance de la cuenta disminuyó.
