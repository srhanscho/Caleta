# Caleta — AI Context File

> Read this file at the start of every session. It is the single source of truth for project decisions.

## Project Summary

**Caleta** is a personal finance PWA for young Colombians (students, first-job crowd). The differentiator: users upload screenshots from Nequi, Daviplata, Bancolombia, Nubank, or PSE receipts, and an AI agent extracts transactions, categorizes them, and generates monthly insights in plain Spanish.

"Caletas" are savings goals (e.g., "Viaje a Cartagena — $800.000 para diciembre").

**Academic context:** 20% of the third corte. Also intended as portfolio work.

---

## Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Framework | Next.js | 15.x | RSC by default; better performance for data-heavy pages |
| Language | TypeScript | 5.x strict | Catch errors at compile time, not in prod |
| Styles | Tailwind CSS | v4 | CSS-first approach, no config file needed |
| UI Components | shadcn/ui | v4 (base-nova) | Accessible components, Tailwind v4 compatible |
| ORM | Prisma | 7.x | Type-safe queries, great DX, Supabase compatible |
| Database | Supabase PostgreSQL | — | Free tier, built-in auth, storage, RLS — one platform |
| Auth | Supabase Auth | — | Handles email/password + OAuth, works with Prisma via userId |
| Storage | Supabase Storage | — | Stores screenshot images uploaded by users |
| AI Provider | Vercel AI SDK + @ai-sdk/anthropic | ai 6.x | Streaming, tool calls, unified API |
| AI Model | claude-sonnet-4-6 | — | Best multimodal model for reading financial screenshots |
| PWA | @ducanh2912/next-pwa | 10.x | Most maintained next-pwa fork |
| Package manager | pnpm | 11.x | Faster than npm/yarn, strict peer deps |
| Deploy | Vercel | — | Zero-config Next.js deploy |

---

## Architecture Decisions

### Server Components by Default
Every component is a Server Component unless it needs interactivity (`"use client"`). Data fetching happens in Server Components; mutations happen via Server Actions.

### Server Actions Over API Routes
Use `src/server/actions/` for all mutations (create transaction, add to caleta, etc.). API routes (`src/app/api/`) are reserved for:
- Webhooks (e.g., Supabase Auth webhook to sync user to Prisma)
- Streaming AI responses (where Server Actions don't work)

### Money Storage in Centavos
All monetary amounts are stored as `Int` (centavos COP) to avoid floating-point precision errors.
- User enters: `$15.500` → stored as `1550000`
- Display: divide by 100, format with `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`

### User Sync Strategy
Supabase manages auth. When a user signs up, a webhook (or auth trigger) creates a corresponding `User` record in our Prisma `public.users` table using `supabaseId` as the link.

### AI Isolation
All AI logic lives in `src/lib/ai/`. Features import from there. This keeps AI dependencies in one place and makes swapping models easy.

### Prisma 7 Client Location
Prisma 7 generates the client to `src/generated/prisma/` (not `node_modules`). Import Prisma types from there:
```typescript
import { PrismaClient } from '../generated/prisma'
import type { User, Transaction } from '../generated/prisma'
```
The `prisma.config.ts` file (root level) handles database URL configuration (reads from `DATABASE_URL` env var).

---

## Domain Model

```
User
  ├── Account[]      — wallets (Nequi, Daviplata, etc.)
  ├── Category[]     — custom categories (system categories have userId=null)
  ├── Transaction[]  — every income/expense/transfer
  ├── Caleta[]       — savings goals
  │     └── CaletaDeposit[]  — deposit history per caleta
  └── Insight[]      — monthly AI-generated analysis
```

### Key field notes
- `Transaction.monto` — Int, centavos COP
- `Transaction.sourceImageUrl` — Supabase Storage URL if transaction came from screenshot
- `Transaction.confidenceScore` — Float 0–1, AI confidence in extraction
- `Category.userId` — null means system/predefined category; non-null means user-created
- `Caleta.montoActual` — updated on each `CaletaDeposit` creation

---

## Folder Structure

```
src/
  app/
    (auth)/            # login, register — unauthenticated routes
    (dashboard)/       # protected routes — require auth
    api/               # webhooks, streaming endpoints only
  components/
    ui/                # shadcn/ui generated components (never edit manually)
    features/          # feature-specific components grouped by domain
      accounts/
      caletas/
      insights/
      transactions/
  generated/
    prisma/            # Prisma 7 generated client (auto-generated, do not edit)
  lib/
    prisma.ts          # Prisma singleton
    supabase/
      client.ts        # browser client
      server.ts        # server client (RSC / Server Actions)
    ai/
      index.ts         # shared Anthropic provider + DEFAULT_MODEL constant
  server/
    actions/           # Server Actions by domain
      accounts/
      caletas/
      insights/
      transactions/
  types/
    index.ts           # shared types, enum re-exports
  hooks/               # custom React hooks (client-side)
prisma/
  schema.prisma
  seed.ts
prisma.config.ts       # Prisma 7 config (DB URL, schema path)
public/
  manifest.json        # PWA manifest
  icons/               # icon-192x192.png and icon-512x512.png go here
```

---

## Code Conventions

### Naming
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase`
- Server Actions: `camelCase`, prefix with verb (`createTransaction`, `updateCaleta`)
- Types/Interfaces: `PascalCase`, no `I` prefix
- Constants: `SCREAMING_SNAKE_CASE`
- Env vars: `SCREAMING_SNAKE_CASE`, server-only vars never prefixed with `NEXT_PUBLIC_`

### TypeScript
- `strict: true` always
- No `any` — use `unknown` + type guards or Prisma generated types
- Import types with `import type { }` for type-only imports
- Prisma types imported from `@/generated/prisma` (not `@prisma/client`)

### Components
- Prefer Server Components — add `"use client"` only when needed
- `"use client"` components are small, leaf components
- Props typed inline or with a local `Props` type (not exported unless reused)

### Server Actions
```typescript
'use server'
import { prisma } from '@/lib/prisma'
import type { ActionResult } from '@/types'

export async function createSomething(data: InputType): Promise<ActionResult<OutputType>> {
  try {
    // verify session first
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: 'Mensaje de error en español' }
  }
}
```

### Tailwind v4 Color Usage
Use semantic token classes (`bg-primary`, `text-foreground`, `border-border`, etc.) — never hardcode hex values in className. CSS variables are defined in `globals.css`.

### Comments
- Comments only for non-obvious WHY, not WHAT
- No docstrings, no multi-line comment blocks

---

## Pending Features (RF)

- [ ] RF-01: Registro e inicio de sesión (email/password + Google OAuth)
- [ ] RF-02: Onboarding — agregar cuentas iniciales y balance
- [ ] RF-03: Dashboard principal con resumen financiero
- [ ] RF-04: Subida de screenshots → extracción de transacciones con IA
- [ ] RF-05: CRUD manual de transacciones
- [ ] RF-06: Categorización automática de transacciones
- [ ] RF-07: Caletas — crear metas de ahorro y hacer aportes
- [ ] RF-08: Insights mensuales generados por IA
- [ ] RF-09: Historial y búsqueda de transacciones
- [ ] RF-10: Configuración de cuentas y perfil
- [ ] RF-11: PWA — funcionalidad offline básica

---

## Rules (never break these)

1. **Never commit secrets.** All API keys go in `.env.local` (gitignored). `.env.example` has placeholders only.
2. **Always use strict TypeScript.** No `any`, no `@ts-ignore` without a comment explaining why.
3. **Amounts always in centavos.** Never store COP as float.
4. **Server Actions > API routes** for mutations.
5. **`src/components/ui/` is shadcn-owned.** Never manually edit generated shadcn files; re-run the generator if changes are needed.
6. **`src/generated/prisma/` is Prisma-owned.** Never manually edit. Re-run `pnpm prisma generate` after schema changes.
7. **Auth check in every server action.** Verify the user session before touching the database.
8. **Error messages in Spanish.** This app is for Colombian users.

---

## Common Commands

```bash
pnpm dev                          # start dev server
pnpm build                        # production build
pnpm prisma generate              # regenerate Prisma client after schema changes
pnpm prisma migrate dev --name X  # create + apply a new migration
pnpm prisma db seed               # seed predefined categories
pnpm prisma studio                # open Prisma Studio (DB browser)
pnpm dlx shadcn@latest add button # add a shadcn component
pnpm format                       # format all files with Prettier
```
