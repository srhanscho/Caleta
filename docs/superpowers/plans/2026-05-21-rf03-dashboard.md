# RF-03 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the RF-03 dashboard: rebrand to navy/electric-blue, add bottom nav, and show balance hero + spending chart + accounts row + recent transactions.

**Architecture:** Single Server Component page fetches all data in parallel (6 Prisma queries via Promise.all), passes serialized props to presentational child components. One Client Component (SpendingChart) uses Recharts; one Client Component (BottomNav) uses usePathname. All monetary values arrive as centavos integers and are formatted to COP in components via shared formatCOP().

**Tech Stack:** Next.js 15 App Router, Tailwind v4, shadcn/ui base-nova, Prisma 7 + @prisma/adapter-pg, Recharts, Lucide icons, IBM Plex Sans (already loaded).

---

### Task 1: Install recharts + rebrand globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Install recharts**

```bash
cd "C:\Users\hsdea\Documents\practica\ai-practice-app\Caleta"
pnpm add recharts
```

Expected: `+ recharts X.X.X` in output, no errors.

- [ ] **Step 2: Replace globals.css `:root` tokens with navy/electric-blue palette**

Replace the entire `:root { ... }` block (lines 4–26 currently) with:

```css
:root {
  --background: oklch(0.08 0.025 265);
  --foreground: oklch(0.95 0.01 265);
  --card: oklch(0.13 0.035 265);
  --card-foreground: oklch(0.95 0.01 265);
  --popover: oklch(0.13 0.035 265);
  --popover-foreground: oklch(0.95 0.01 265);
  --primary: oklch(0.58 0.25 265);
  --primary-foreground: oklch(0.98 0.005 265);
  --secondary: oklch(0.18 0.04 265);
  --secondary-foreground: oklch(0.78 0.08 265);
  --muted: oklch(0.22 0.03 265);
  --muted-foreground: oklch(0.62 0.04 265);
  --accent: oklch(0.18 0.04 265);
  --accent-foreground: oklch(0.85 0.08 265);
  --destructive: oklch(0.55 0.22 27);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.20 0.035 265);
  --input: oklch(0.20 0.035 265);
  --ring: oklch(0.58 0.25 265);
  --radius: 0.75rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: rebrand color palette to navy/electric-blue"
```

---

### Task 2: Update auth component colors + login logo

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/components/features/auth/auth-form.tsx`
- Modify: `src/components/features/auth/google-button.tsx`

- [ ] **Step 1: Update auth layout background**

In `src/app/(auth)/layout.tsx`, change `bg-[#09090B]` to `bg-background`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Update login page — add logo, update card colors**

Replace `src/app/(auth)/login/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { AuthForm } from '@/components/features/auth/auth-form'
import { GoogleButton } from '@/components/features/auth/google-button'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl space-y-6">
      <div className="flex justify-center">
        <Image src="/logo.png" alt="Caleta" width={140} height={44} priority />
      </div>
      <AuthForm />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton />
      <p className="text-center text-xs text-muted-foreground">
        Al continuar aceptas nuestra{' '}
        <a href="/privacidad" className="underline hover:text-foreground">
          política de privacidad
        </a>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Update auth-form.tsx hardcoded colors**

In `src/components/features/auth/auth-form.tsx`, replace the two constants at the top:

```tsx
const inputClass =
  'bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring'

const labelClass = 'text-foreground'
```

Also replace the card div in the `confirm` step — change `border-[#27272A] bg-[#18181B]` to `border-border bg-card`.

And update the two submit buttons' className from `bg-[#0D9488] hover:bg-[#0F766E]` to `bg-primary hover:bg-primary/90`.

And update the "Cambiar" buttons' color from `text-[#0D9488]` to `text-primary`.

Full updated constants and button classes:
```tsx
// Replace these two lines near the top of AuthForm:
const inputClass =
  'bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring'
const labelClass = 'text-foreground'

// All 3 submit Button className:
className="w-full bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"

// Both "Cambiar" button className:
className="text-xs text-primary hover:underline cursor-pointer ml-2 shrink-0"

// The "Volver al inicio" button className:
className="text-xs text-primary hover:underline cursor-pointer"

// The confirm step card div className:
className="rounded-xl border border-border bg-card p-6 space-y-3"

// serverError paragraphs stay red: className="text-sm text-destructive"
```

- [ ] **Step 4: Update google-button.tsx hardcoded colors**

Replace `src/components/features/auth/google-button.tsx` button className:

```tsx
className="w-full border-border bg-transparent text-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors duration-200"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/"(auth)"/layout.tsx src/app/"(auth)"/login/page.tsx src/components/features/auth/auth-form.tsx src/components/features/auth/google-button.tsx
git commit -m "feat: update auth UI to navy theme + add logo to login"
```

---

### Task 3: Create src/lib/format.ts

**Files:**
- Create: `src/lib/format.ts`

- [ ] **Step 1: Create format utilities**

```typescript
export function formatCOP(centavos: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centavos / 100)
}

export function formatRelativeDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000)

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'

  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/format.ts
git commit -m "feat: add formatCOP and formatRelativeDate utilities"
```

---

### Task 4: Create BottomNav component

**Files:**
- Create: `src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, PiggyBank, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/transacciones', label: 'Movimientos', icon: ArrowLeftRight, placeholder: true },
  { href: '/caletas', label: 'Caletas', icon: PiggyBank, placeholder: true },
  { href: '/perfil', label: 'Perfil', icon: User, placeholder: true },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ href, label, icon: Icon, placeholder }) => {
          const isActive = pathname === href
          return placeholder ? (
            <button
              key={href}
              type="button"
              disabled
              className="flex flex-col items-center gap-1 px-3 py-2 opacity-40 cursor-not-allowed"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add BottomNav to dashboard layout**

In `src/app/(dashboard)/layout.tsx`, import and render BottomNav:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let prismaUser
  try {
    prismaUser = await prisma.user.upsert({
      where: { supabaseId: user.id },
      create: {
        supabaseId: user.id,
        email: user.email ?? `${user.id}@unknown.local`,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
      },
      update: {},
      include: { accounts: { where: { activa: true } } },
    })
  } catch {
    try {
      prismaUser = await prisma.user.update({
        where: { email: user.email! },
        data: { supabaseId: user.id },
        include: { accounts: { where: { activa: true } } },
      })
    } catch {
      redirect('/login')
    }
  }

  if (prismaUser.accounts.length === 0) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/bottom-nav.tsx src/app/"(dashboard)"/layout.tsx
git commit -m "feat: add BottomNav component and wire into dashboard layout"
```

---

### Task 5: Create BalanceHero component

**Files:**
- Create: `src/components/features/dashboard/balance-hero.tsx`

- [ ] **Step 1: Create the component**

Props: `balanceCentavos: number`, `ingresosCentavos: number`, `gastosCentavos: number`, `userName: string | null`.

```tsx
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCOP } from '@/lib/format'

type Props = {
  balanceCentavos: number
  ingresosCentavos: number
  gastosCentavos: number
  userName: string | null
}

export function BalanceHero({ balanceCentavos, ingresosCentavos, gastosCentavos, userName }: Props) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : 'Hola'

  return (
    <div className="bg-card px-6 pt-4 pb-6 space-y-4">
      <p className="text-sm text-muted-foreground">{greeting}</p>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Balance total</p>
        <p className="text-4xl font-bold text-foreground tabular-nums">
          {formatCOP(balanceCentavos)}
        </p>
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2 flex-1">
          <ArrowUpRight className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} />
          <div>
            <p className="text-[10px] text-muted-foreground">Ingresos</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {formatCOP(ingresosCentavos)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2 flex-1">
          <ArrowDownRight className="w-4 h-4 text-destructive shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Gastos</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {formatCOP(gastosCentavos)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/dashboard/balance-hero.tsx
git commit -m "feat: add BalanceHero dashboard component"
```

---

### Task 6: Create SpendingChart component

**Files:**
- Create: `src/components/features/dashboard/spending-chart.tsx`

- [ ] **Step 1: Create the component**

Props: `data: { day: number; total: number }[]` — array of 28–31 entries (one per day of current month), `total` in centavos.

```tsx
'use client'

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCOP } from '@/lib/format'

type DayData = { day: number; total: number }

type Props = {
  data: DayData[]
  mesLabel: string
}

export function SpendingChart({ data, mesLabel }: Props) {
  return (
    <div className="px-6 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Gastos del mes</p>
        <p className="text-xs text-muted-foreground">{mesLabel}</p>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F6EF7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4F6EF7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#6B7DB3' }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(data.length / 4)}
          />
          <Tooltip
            contentStyle={{
              background: '#0F1629',
              border: '1px solid #1E2A40',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F0F4FF',
            }}
            formatter={(value: number) => [formatCOP(value), 'Gastos']}
            labelFormatter={(label) => `Día ${label}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#4F6EF7"
            strokeWidth={2}
            fill="url(#blueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#4F6EF7' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/dashboard/spending-chart.tsx
git commit -m "feat: add SpendingChart Recharts component"
```

---

### Task 7: Create AccountsRow component

**Files:**
- Create: `src/components/features/dashboard/accounts-row.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from 'next/link'
import { formatCOP } from '@/lib/format'
import type { AccountType } from '@/generated/prisma'

type AccountItem = {
  id: string
  nombre: string
  tipo: AccountType
  balance: number
  color: string
}

const TIPO_LABEL: Record<AccountType, string> = {
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  BANCOLOMBIA: 'Bancolombia',
  NUBANK: 'Nubank',
  EFECTIVO: 'Efectivo',
  OTRO: 'Otro',
}

type Props = {
  accounts: AccountItem[]
}

export function AccountsRow({ accounts }: Props) {
  return (
    <div className="px-6 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Mis cuentas</p>
        <Link
          href="/onboarding"
          className="text-xs text-primary hover:underline cursor-pointer"
        >
          + Nueva
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="shrink-0 bg-secondary rounded-2xl p-4 w-40 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: account.color }}
              />
              <span className="text-xs text-muted-foreground truncate">
                {TIPO_LABEL[account.tipo]}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{account.nombre}</p>
            <p className="text-base font-bold text-foreground tabular-nums">
              {formatCOP(account.balance)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/dashboard/accounts-row.tsx
git commit -m "feat: add AccountsRow dashboard component"
```

---

### Task 8: Create RecentTransactions component

**Files:**
- Create: `src/components/features/dashboard/recent-transactions.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { formatCOP, formatRelativeDate } from '@/lib/format'
import type { TransactionType } from '@/generated/prisma'

type TransactionItem = {
  id: string
  monto: number
  tipo: TransactionType
  fecha: Date
  descripcion: string | null
  category: { nombre: string; icono: string; color: string }
}

type Props = {
  transactions: TransactionItem[]
}

export function RecentTransactions({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="px-6 py-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Movimientos recientes</p>
        <p className="text-sm text-muted-foreground py-4 text-center">
          Aún no tienes movimientos. Agrega tu primera transacción.
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Movimientos recientes</p>
      <ul className="space-y-1">
        {transactions.map((tx) => {
          const isIncome = tx.tipo === 'INCOME'
          const sign = isIncome ? '+' : tx.tipo === 'EXPENSE' ? '-' : ''
          const amountColor = isIncome ? '#22C55E' : tx.tipo === 'EXPENSE' ? 'text-destructive' : ''
          return (
            <li
              key={tx.id}
              className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm"
                style={{ backgroundColor: tx.category.color + '33' }}
              >
                <span style={{ color: tx.category.color }}>{tx.category.icono}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {tx.descripcion ?? tx.category.nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeDate(new Date(tx.fecha))}
                </p>
              </div>
              <p
                className="text-sm font-semibold tabular-nums shrink-0"
                style={isIncome ? { color: '#22C55E' } : undefined}
                {...(!isIncome && tx.tipo === 'EXPENSE' ? { className: 'text-sm font-semibold tabular-nums shrink-0 text-destructive' } : {})}
              >
                {sign}{formatCOP(tx.monto)}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

> **Note on amount color:** `isIncome` → inline style `color: '#22C55E'`; `EXPENSE` → `text-destructive` class; `TRANSFER` → default foreground.

Cleaner version without the spread conflict:

```tsx
import { formatCOP, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TransactionType } from '@/generated/prisma'

type TransactionItem = {
  id: string
  monto: number
  tipo: TransactionType
  fecha: Date
  descripcion: string | null
  category: { nombre: string; icono: string; color: string }
}

type Props = {
  transactions: TransactionItem[]
}

export function RecentTransactions({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="px-6 py-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Movimientos recientes</p>
        <p className="text-sm text-muted-foreground py-4 text-center">
          Aún no tienes movimientos. Agrega tu primera transacción.
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Movimientos recientes</p>
      <ul className="space-y-1">
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </ul>
    </div>
  )
}

function TransactionRow({ tx }: { tx: TransactionItem }) {
  const isIncome = tx.tipo === 'INCOME'
  const isExpense = tx.tipo === 'EXPENSE'
  const prefix = isIncome ? '+' : isExpense ? '-' : ''

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm"
        style={{ backgroundColor: tx.category.color + '33' }}
      >
        <span style={{ color: tx.category.color }}>{tx.category.icono}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          {tx.descripcion ?? tx.category.nombre}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeDate(new Date(tx.fecha))}
        </p>
      </div>
      <p
        className={cn(
          'text-sm font-semibold tabular-nums shrink-0',
          isExpense && 'text-destructive'
        )}
        style={isIncome ? { color: '#22C55E' } : undefined}
      >
        {prefix}{formatCOP(tx.monto)}
      </p>
    </li>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/dashboard/recent-transactions.tsx
git commit -m "feat: add RecentTransactions dashboard component"
```

---

### Task 9: Build DashboardPage Server Component

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard page with Server Component**

```tsx
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { BalanceHero } from '@/components/features/dashboard/balance-hero'
import { SpendingChart } from '@/components/features/dashboard/spending-chart'
import { AccountsRow } from '@/components/features/dashboard/accounts-row'
import { RecentTransactions } from '@/components/features/dashboard/recent-transactions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get Prisma user id
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, name: true },
  })
  if (!prismaUser) redirect('/login')

  const userId = prismaUser.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [balanceAgg, ingresosAgg, gastosAgg, accounts, recentTxs, expensesByDay] =
    await Promise.all([
      prisma.account.aggregate({
        where: { userId, activa: true },
        _sum: { balance: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          tipo: 'INCOME',
          fecha: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { monto: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          tipo: 'EXPENSE',
          fecha: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { monto: true },
      }),
      prisma.account.findMany({
        where: { userId, activa: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.transaction.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { fecha: 'desc' },
        take: 5,
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          tipo: 'EXPENSE',
          fecha: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { fecha: true, monto: true },
      }),
    ])

  // Build day-by-day chart data
  const daysInMonth = endOfMonth.getDate()
  const dailyMap = new Map<number, number>()
  for (const tx of expensesByDay) {
    const day = new Date(tx.fecha).getDate()
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + tx.monto)
  }
  const chartData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    total: dailyMap.get(i + 1) ?? 0,
  }))

  const mesLabel = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <main className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Image src="/logo-icon.png" alt="Caleta" width={28} height={28} />
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
          {(prismaUser.name ?? user.email ?? '?')[0].toUpperCase()}
        </div>
      </div>

      <BalanceHero
        balanceCentavos={balanceAgg._sum.balance ?? 0}
        ingresosCentavos={ingresosAgg._sum.monto ?? 0}
        gastosCentavos={gastosAgg._sum.monto ?? 0}
        userName={prismaUser.name}
      />

      <SpendingChart data={chartData} mesLabel={mesLabel} />

      <AccountsRow accounts={accounts} />

      <RecentTransactions
        transactions={recentTxs.map((tx) => ({
          id: tx.id,
          monto: tx.monto,
          tipo: tx.tipo,
          fecha: tx.fecha,
          descripcion: tx.descripcion,
          category: {
            nombre: tx.category.nombre,
            icono: tx.category.icono,
            color: tx.category.color,
          },
        }))}
      />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/"(dashboard)"/dashboard/page.tsx
git commit -m "feat: build DashboardPage Server Component with Prisma data fetching"
```

---

### Task 10: Build check + final commit

- [ ] **Step 1: Run type check**

```bash
cd "C:\Users\hsdea\Documents\practica\ai-practice-app\Caleta"
pnpm tsc --noEmit
```

Expected: no errors. If there are errors, fix them before continuing.

- [ ] **Step 2: Run build**

```bash
pnpm build
```

Expected: build completes successfully. Common issues:
- `recharts` SSR issue → `SpendingChart` must be `'use client'` (already is)
- Date serialization → pass `tx.fecha` as `tx.fecha.toISOString()` and cast back in component if needed
- Image domain issues → `logo-icon.png` and `logo.png` are in `/public/`, no domain config needed for local images

- [ ] **Step 3: Push**

```bash
git push
```

Expected: Vercel auto-deploys from `main`.
