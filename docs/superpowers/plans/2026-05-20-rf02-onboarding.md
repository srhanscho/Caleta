# RF-02 Onboarding — Agregar Cuentas Iniciales

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After login, redirect users with no accounts to `/onboarding` where they can add wallets (Nequi, Daviplata, etc.) with initial balances before accessing the dashboard.

**Architecture:** `/onboarding` lives at the root level (NOT inside `(dashboard)`) to avoid an infinite redirect loop — the `(dashboard)/layout.tsx` redirects there when accounts = 0, but the layout only runs for routes inside the `(dashboard)` group. The middleware is updated to protect `/onboarding` with auth. The `(dashboard)/layout.tsx` upserts the Prisma user (resilient to webhook failures) and redirects to `/onboarding` when no accounts exist.

**Tech Stack:** Next.js 15 App Router, Prisma 7 (PrismaPg adapter), Supabase SSR, Tailwind v4, React `useState` (no react-hook-form — dynamic rows are simpler with plain state).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/middleware.ts` | Modify | Add `/onboarding` to protected routes |
| `src/app/(dashboard)/layout.tsx` | Modify | Upsert Prisma user + redirect to `/onboarding` if no accounts |
| `src/server/actions/accounts/create-accounts.ts` | Create | Server Action: create multiple accounts in one Prisma transaction |
| `src/app/onboarding/layout.tsx` | Create | Centered card layout (same style as auth) |
| `src/app/onboarding/page.tsx` | Create | Server Component: redirect to `/dashboard` if has accounts, else render form |
| `src/components/features/accounts/onboarding-form.tsx` | Create | Client Component: dynamic rows of (tipo, nombre, balance) |

---

## Task 1: Server Action — createAccounts

**Files:**
- Create: `src/server/actions/accounts/create-accounts.ts`

- [ ] **Step 1: Create the server action file**

```typescript
// src/server/actions/accounts/create-accounts.ts
'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, AccountType } from '@/types'

// Plain string union — el cliente envía strings, la action castea a AccountType internamente
type AccountInput = {
  tipo: string
  nombre: string
  balance: number // pesos COP enteros — se multiplica × 100 para guardar centavos
}

export async function createAccounts(
  accounts: AccountInput[]
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  if (accounts.length === 0) {
    return { success: true, data: undefined }
  }

  try {
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    })

    if (!prismaUser) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    await prisma.$transaction(
      accounts.map((a) =>
        prisma.account.create({
          data: {
            userId: prismaUser.id,
            tipo: a.tipo as AccountType,
            nombre: a.nombre,
            balance: a.balance * 100,
          },
        })
      )
    )

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al guardar las cuentas' }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors. If there are errors, check that `@/lib/prisma`, `@/lib/supabase/server`, and `@/types` paths are correct.

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/accounts/create-accounts.ts
git commit -m "feat: add createAccounts server action"
```

---

## Task 2: Update Middleware to Protect /onboarding

**Files:**
- Modify: `src/middleware.ts`

The current middleware only redirects unauthenticated users away from `/dashboard/**`. We need to also protect `/onboarding`.

- [ ] **Step 1: Update the middleware**

Replace the content of `src/middleware.ts` with:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api).*)'],
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: protect /onboarding route in middleware"
```

---

## Task 3: Update (dashboard)/layout.tsx

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

This layout runs for every route inside `(dashboard)` (i.e. `/dashboard/**`). It upserts the Prisma user and redirects to `/onboarding` if the user has no active accounts. Since `/onboarding` is at the root level (not inside `(dashboard)`), this does NOT cause an infinite loop.

- [ ] **Step 1: Rewrite the layout**

```typescript
// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

  // Upsert ensures the Prisma user exists even if the webhook failed
  const prismaUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    create: {
      supabaseId: user.id,
      email: user.email!,
      name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
    },
    update: {},
    include: { accounts: { where: { activa: true } } },
  })

  if (prismaUser.accounts.length === 0) {
    redirect('/onboarding')
  }

  return <div className="min-h-screen bg-background">{children}</div>
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build completes without errors. If TypeScript complains about `user_metadata` types, add `as string | undefined` casts as shown above.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/layout.tsx"
git commit -m "feat: upsert prisma user and redirect to onboarding if no accounts"
```

---

## Task 4: OnboardingForm Client Component

**Files:**
- Create: `src/components/features/accounts/onboarding-form.tsx`

This is the heart of the UI — a dynamic list of account rows the user can add/remove before submitting.

Note: The account type values are defined locally as plain strings to avoid importing Prisma-generated modules in a client component (which would include Node.js-only code).

- [ ] **Step 1: Create the component**

```typescript
// src/components/features/accounts/onboarding-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { createAccounts } from '@/server/actions/accounts/create-accounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AccountTypeValue =
  | 'NEQUI'
  | 'DAVIPLATA'
  | 'BANCOLOMBIA'
  | 'NUBANK'
  | 'EFECTIVO'
  | 'OTRO'

const ACCOUNT_TYPES: { value: AccountTypeValue; label: string; defaultName: string }[] = [
  { value: 'NEQUI', label: 'Nequi', defaultName: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata', defaultName: 'Daviplata' },
  { value: 'BANCOLOMBIA', label: 'Bancolombia', defaultName: 'Bancolombia' },
  { value: 'NUBANK', label: 'Nu', defaultName: 'Nu' },
  { value: 'EFECTIVO', label: 'Efectivo', defaultName: 'Efectivo' },
  { value: 'OTRO', label: 'Otro', defaultName: 'Mi cuenta' },
]

type AccountRow = {
  id: string
  tipo: AccountTypeValue
  nombre: string
  balance: string
}

const inputClass =
  'bg-[#18181B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#A1A1AA] focus-visible:ring-[#0D9488]'

const selectClass =
  'bg-[#18181B] border border-[#27272A] text-[#FAFAFA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] h-10 w-full'

export function OnboardingForm() {
  const router = useRouter()
  const [rows, setRows] = useState<AccountRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tipo: 'NEQUI',
        nombre: 'Nequi',
        balance: '',
      },
    ])
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateRow(
    id: string,
    field: 'tipo' | 'nombre' | 'balance',
    value: string
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        if (field === 'tipo') {
          const tipo = value as AccountTypeValue
          const defaultName =
            ACCOUNT_TYPES.find((t) => t.value === tipo)?.defaultName ?? ''
          return { ...r, tipo, nombre: defaultName }
        }
        return { ...r, [field]: value }
      })
    )
  }

  async function handleSave() {
    setIsLoading(true)
    setError(null)

    const accounts = rows.map((r) => ({
      tipo: r.tipo,
      nombre: r.nombre.trim() || (ACCOUNT_TYPES.find((t) => t.value === r.tipo)?.defaultName ?? r.tipo),
      balance: parseInt(r.balance) || 0,
    }))

    const result = await createAccounts(accounts)

    if (!result.success) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
  }

  function handleSkip() {
    router.push('/dashboard')
  }

  return (
    <div className="space-y-6">
      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="flex gap-2 items-start">
              <select
                value={row.tipo}
                onChange={(e) => updateRow(row.id, 'tipo', e.target.value)}
                disabled={isLoading}
                className={selectClass}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Input
                value={row.nombre}
                onChange={(e) => updateRow(row.id, 'nombre', e.target.value)}
                placeholder="Nombre"
                disabled={isLoading}
                className={inputClass}
              />
              <Input
                value={row.balance}
                onChange={(e) => updateRow(row.id, 'balance', e.target.value)}
                placeholder="$ Balance"
                type="number"
                min="0"
                disabled={isLoading}
                className={`${inputClass} w-32 shrink-0`}
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={isLoading}
                className="mt-2 text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer shrink-0"
                aria-label="Quitar cuenta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm text-[#0D9488] hover:underline cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Agregar cuenta
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Guardar y continuar'
          )}
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isLoading}
          className="w-full text-sm text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/accounts/onboarding-form.tsx
git commit -m "feat: add OnboardingForm component for account setup"
```

---

## Task 5: Onboarding Page and Layout

**Files:**
- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/page.tsx`

The layout reuses the same centered card style as `(auth)/layout.tsx`. The page redirects to `/dashboard` if the user already has accounts.

- [ ] **Step 1: Create the onboarding layout**

```typescript
// src/app/onboarding/layout.tsx
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4 py-12">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create the onboarding page**

```typescript
// src/app/onboarding/page.tsx
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { OnboardingForm } from '@/components/features/accounts/onboarding-form'

export const metadata: Metadata = { title: 'Configura tus cuentas' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { accounts: { where: { activa: true } } },
  })

  // If user already has accounts, skip onboarding
  if (prismaUser && prismaUser.accounts.length > 0) {
    redirect('/dashboard')
  }

  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-8 shadow-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-[#FAFAFA]">
          ¿Qué cuentas manejas?
        </h1>
        <p className="text-sm text-[#A1A1AA]">
          Agrega tus billeteras y su saldo actual. Puedes editar esto después.
        </p>
      </div>
      <OnboardingForm />
    </div>
  )
}
```

- [ ] **Step 3: Verify full build**

```bash
pnpm build
```

Expected: build completes, route table shows `/onboarding` as a dynamic route (`ƒ`).

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/layout.tsx src/app/onboarding/page.tsx
git commit -m "feat: add /onboarding page with account setup flow"
```

---

## Task 6: Manual Test + Deploy

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test the redirect flow**

Open `http://localhost:3000`. Log in with an account that has no accounts in the DB (or clear the accounts table in Prisma Studio: `pnpm prisma studio`).

Expected: after login, you land on `/onboarding`, not `/dashboard`.

- [ ] **Step 3: Test adding accounts**

Click `Agregar cuenta`. Add 2-3 rows (Nequi, Daviplata, etc.) with balances. Click `Guardar y continuar`.

Expected: accounts created, redirect to `/dashboard`.

- [ ] **Step 4: Test that onboarding is skipped on next login**

Log out and log in again.

Expected: go directly to `/dashboard` (has accounts now).

- [ ] **Step 5: Test "Saltar por ahora"**

Create a new test user (or delete all accounts via Prisma Studio). Log in → lands on `/onboarding`. Click `Saltar por ahora`.

Expected: goes to `/dashboard` with no accounts. Next login goes back to `/onboarding`.

- [ ] **Step 6: Push and deploy**

```bash
git push origin main
```

Expected: Vercel deploys successfully, all flows work in production.
