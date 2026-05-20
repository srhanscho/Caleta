# Caleta — Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the complete project scaffolding for Caleta — a personal finance PWA for Colombian students — including Next.js 15, shadcn/ui, Prisma schema, Supabase utilities, AI SDK stubs, next-pwa, CLAUDE.md, and README.

**Architecture:** App Router with server components by default. Auth via Supabase; database via Prisma on Supabase Postgres. AI processing isolated in `src/lib/ai/`. Server Actions handle all mutations; client components only where interactivity is required.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind CSS, shadcn/ui, Prisma, Supabase, Vercel AI SDK, @anthropic-ai/sdk, @ducanh2912/next-pwa, pnpm

---

## File Map

| File | Responsibility |
|------|----------------|
| `package.json` | deps, scripts |
| `tsconfig.json` | strict TS config |
| `next.config.ts` | Next.js + PWA config |
| `.eslintrc.json` | ESLint rules |
| `.prettierrc` | Prettier config |
| `components.json` | shadcn/ui config |
| `src/app/globals.css` | CSS variables + Tailwind |
| `src/lib/utils.ts` | shadcn `cn()` utility |
| `src/lib/prisma.ts` | Prisma singleton client |
| `src/lib/supabase/client.ts` | Supabase browser client |
| `src/lib/supabase/server.ts` | Supabase server client (SSR) |
| `src/lib/ai/index.ts` | AI module stub (no features yet) |
| `src/types/index.ts` | Shared TypeScript types |
| `prisma/schema.prisma` | Full domain model |
| `prisma/seed.ts` | Seed predefined categories |
| `public/manifest.json` | PWA manifest |
| `.env.example` | All required env vars documented |
| `CLAUDE.md` | Persistent AI context file |
| `README.md` | Project documentation |

---

## Task 1: Initialize Next.js 15 Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Run create-next-app with all flags (non-interactive)**

```powershell
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```

Expected: Next.js 15 project scaffolded in current directory with pnpm.

- [ ] **Step 2: Verify project structure**

```powershell
ls src/app
```

Expected output includes: `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`

- [ ] **Step 3: Commit initial scaffold**

```powershell
git add .
git commit -m "chore: initialize Next.js 15 project with App Router and TypeScript"
```

---

## Task 2: Configure Prettier

**Files:**
- Create: `.prettierrc`, `.prettierignore`
- Modify: `package.json` (add format script)

- [ ] **Step 1: Install Prettier and ESLint plugin**

```powershell
pnpm add -D prettier eslint-config-prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: Create `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 3: Create `.prettierignore`**

```
node_modules/
.next/
out/
public/
prisma/migrations/
```

- [ ] **Step 4: Update `.eslintrc.json` to add prettier config**

Replace the file content with:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

- [ ] **Step 5: Add format script to `package.json`**

In the `"scripts"` section, add:
```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "chore: configure Prettier with Tailwind plugin and ESLint integration"
```

---

## Task 3: Configure shadcn/ui with Caleta Theme

**Files:**
- Create: `components.json`, `src/lib/utils.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Install shadcn/ui**

```powershell
pnpm dlx shadcn@latest init -d
```

When prompted (if interactive), choose:
- Style: **Default**
- Base color: **Neutral** (we'll override with CSS vars)
- CSS variables: **Yes**

- [ ] **Step 2: Verify `components.json` was created, then replace its content**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 3: Update `src/app/globals.css` with Caleta color tokens**

Replace the `:root` and `.dark` CSS variable blocks with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 175 77% 26%;         /* #0F766E — verde caleta */
    --primary-foreground: 0 0% 98%;
    --secondary: 175 30% 92%;
    --secondary-foreground: 175 77% 26%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 175 30% 92%;
    --accent-foreground: 175 77% 26%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 175 77% 26%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 175 60% 45%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 175 20% 15%;
    --secondary-foreground: 175 60% 45%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 175 20% 15%;
    --accent-foreground: 175 60% 45%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 175 60% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 4: Verify `src/lib/utils.ts` exists with the `cn` helper**

If it doesn't exist, create it:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "chore: configure shadcn/ui with Caleta verde teal theme"
```

---

## Task 4: Install Prisma and Define Full Schema

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`
- Modify: `package.json` (add prisma seed script)

- [ ] **Step 1: Install Prisma**

```powershell
pnpm add -D prisma
pnpm add @prisma/client
pnpm dlx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Replace `prisma/schema.prisma` with the full domain model**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum AccountType {
  NEQUI
  DAVIPLATA
  BANCOLOMBIA
  NUBANK
  EFECTIVO
  OTRO
}

enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER
}

enum CategoryType {
  INCOME
  EXPENSE
}

// ─── Models ──────────────────────────────────────────────────────────────────

// Mirrors auth.users from Supabase — extended profile
model User {
  id         String   @id @default(cuid())
  supabaseId String   @unique
  email      String   @unique
  name       String?
  avatarUrl  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  accounts     Account[]
  categories   Category[]
  transactions Transaction[]
  caletas      Caleta[]
  insights     Insight[]
}

// Cuentas/billeteras del usuario
model Account {
  id        String      @id @default(cuid())
  userId    String
  nombre    String
  tipo      AccountType
  balance   Int         @default(0) // en centavos COP
  color     String      @default("#0F766E")
  icono     String      @default("wallet")
  activa    Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@index([userId])
}

// Categorías: algunas son del sistema (userId null), otras del usuario
model Category {
  id        String       @id @default(cuid())
  nombre    String
  icono     String
  color     String
  tipo      CategoryType
  userId    String? // null = predefinida del sistema
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  user         User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@unique([nombre, userId])
  @@index([userId])
}

// Transacción individual — unidad básica del sistema
model Transaction {
  id              String          @id @default(cuid())
  userId          String
  accountId       String
  categoryId      String
  monto           Int // en centavos COP
  tipo            TransactionType
  fecha           DateTime
  descripcion     String?
  sourceImageUrl  String? // URL en Supabase Storage si vino de screenshot
  confidenceScore Float? // 0.0–1.0 confianza del IA en la extracción
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  account        Account         @relation(fields: [accountId], references: [id])
  category       Category        @relation(fields: [categoryId], references: [id])
  caletaDeposits CaletaDeposit[]

  @@index([userId])
  @@index([fecha])
  @@index([accountId])
  @@index([categoryId])
}

// Meta de ahorro del usuario
model Caleta {
  id            String    @id @default(cuid())
  userId        String
  nombre        String
  montoObjetivo Int // en centavos COP
  montoActual   Int       @default(0) // en centavos COP
  fechaObjetivo DateTime?
  descripcion   String?
  completada    Boolean   @default(false)
  color         String    @default("#0F766E")
  icono         String    @default("piggy-bank")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  deposits CaletaDeposit[]

  @@index([userId])
}

// Aportes individuales a una caleta — historial de depósitos
model CaletaDeposit {
  id            String   @id @default(cuid())
  caletaId      String
  monto         Int // en centavos COP
  nota          String?
  transactionId String? // opcional: vinculado a una Transaction
  createdAt     DateTime @default(now())

  caleta      Caleta       @relation(fields: [caletaId], references: [id], onDelete: Cascade)
  transaction Transaction? @relation(fields: [transactionId], references: [id])

  @@index([caletaId])
}

// Análisis mensual generado por IA
model Insight {
  id              String   @id @default(cuid())
  userId          String
  mes             Int // 1–12
  anio            Int
  resumen         String   @db.Text
  alertas         Json     @default("[]")
  recomendaciones Json     @default("[]")
  generadoEn      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, mes, anio])
  @@index([userId])
}
```

- [ ] **Step 3: Add prisma seed config to `package.json`**

In the root of `package.json`, add:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Also add to `devDependencies`:
```powershell
pnpm add -D ts-node
```

- [ ] **Step 4: Commit**

```powershell
git add prisma/ package.json
git commit -m "feat: define full Prisma schema with User, Account, Transaction, Caleta, Insight models"
```

---

## Task 5: Create Database and Supabase Utilities

**Files:**
- Create: `src/lib/prisma.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

- [ ] **Step 1: Install Supabase packages**

```powershell
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create `src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: Create `src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Create `src/lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}
```

- [ ] **Step 5: Commit**

```powershell
git add src/lib/
git commit -m "feat: add Prisma singleton client and Supabase SSR utilities"
```

---

## Task 6: Install AI SDK Packages and Create Stub

**Files:**
- Create: `src/lib/ai/index.ts`

- [ ] **Step 1: Install AI packages**

```powershell
pnpm add ai @anthropic-ai/sdk @ai-sdk/anthropic
```

- [ ] **Step 2: Create `src/lib/ai/index.ts`**

```typescript
import { createAnthropic } from '@ai-sdk/anthropic'

// Shared Anthropic provider instance — features import from here
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Default model for all AI features
export const DEFAULT_MODEL = 'claude-sonnet-4-6'
```

- [ ] **Step 3: Commit**

```powershell
git add src/lib/ai/ package.json pnpm-lock.yaml
git commit -m "feat: install Vercel AI SDK with Anthropic provider and create AI module stub"
```

---

## Task 7: Configure next-pwa

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`

- [ ] **Step 1: Install next-pwa**

```powershell
pnpm add @ducanh2912/next-pwa
```

- [ ] **Step 2: Create `public/manifest.json`**

```json
{
  "name": "Caleta — Finanzas Personales",
  "short_name": "Caleta",
  "description": "Gestiona tus finanzas personales con IA. Para jóvenes colombianos.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0F766E",
  "lang": "es-CO",
  "categories": ["finance", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

- [ ] **Step 3: Create placeholder icon directory**

```powershell
New-Item -ItemType Directory -Force public/icons
```

Add a note: real icons (`icon-192x192.png`, `icon-512x512.png`) must be added to `public/icons/` before PWA install works. Use any 192×192 and 512×512 PNG for now.

- [ ] **Step 4: Update `next.config.ts`**

```typescript
import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withPWA(nextConfig)
```

- [ ] **Step 5: Add PWA meta tags to `src/app/layout.tsx`**

In the existing `metadata` export, ensure these fields exist:

```typescript
export const metadata: Metadata = {
  title: {
    default: 'Caleta',
    template: '%s | Caleta',
  },
  description: 'Gestiona tus finanzas personales con IA',
  manifest: '/manifest.json',
  themeColor: '#0F766E',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Caleta',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}
```

- [ ] **Step 6: Commit**

```powershell
git add next.config.ts public/ src/app/layout.tsx package.json pnpm-lock.yaml
git commit -m "feat: configure next-pwa with Caleta manifest and service worker"
```

---

## Task 8: Scaffold Folder Structure and Types

**Files:**
- Create: `src/types/index.ts`
- Create: stub `index.ts` files in each server action group, features components folder

- [ ] **Step 1: Create `src/types/index.ts`**

```typescript
// Re-export Prisma enums so they're available without importing from @prisma/client everywhere
export { AccountType, TransactionType, CategoryType } from '@prisma/client'

// Utility type for form-facing money values (user enters pesos, we store centavos)
export type PesosToCentavos = (pesos: number) => number
export type CentavosToPesos = (centavos: number) => number

// Common API response shape for server actions
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
```

- [ ] **Step 2: Create folder structure stubs**

Create these empty directories (git won't track empty dirs, so add a `.gitkeep`):

```powershell
$dirs = @(
  "src/app/(auth)/login",
  "src/app/(auth)/register",
  "src/app/(dashboard)",
  "src/app/api",
  "src/components/ui",
  "src/components/features/transactions",
  "src/components/features/caletas",
  "src/components/features/insights",
  "src/components/features/accounts",
  "src/server/actions/transactions",
  "src/server/actions/caletas",
  "src/server/actions/accounts",
  "src/server/actions/insights",
  "src/hooks"
)
foreach ($dir in $dirs) {
  New-Item -ItemType Directory -Force $dir | Out-Null
  New-Item -ItemType File -Force "$dir/.gitkeep" | Out-Null
}
```

- [ ] **Step 3: Commit**

```powershell
git add src/types/ src/components/ src/server/ src/hooks/ src/app/
git commit -m "chore: scaffold folder structure with feature directories and shared types"
```

---

## Task 9: Create Environment Files

**Files:**
- Create: `.env.example`
- Verify: `.env.local` is in `.gitignore`

- [ ] **Step 1: Verify `.gitignore` includes `.env.local`**

The Next.js default `.gitignore` already includes `.env*.local`. Verify this is the case:

```powershell
Select-String -Path ".gitignore" -Pattern "\.env"
```

Expected: lines matching `.env*.local`

- [ ] **Step 2: Create `.env.example`**

```bash
# ─── Supabase ────────────────────────────────────────────────────────────────
# From: https://app.supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# ─── Supabase Database (Prisma) ───────────────────────────────────────────────
# From: Supabase → Project Settings → Database → Connection Pooling (Transaction mode)
# Use port 6543 for the pooled URL (Prisma runtime queries)
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# From: Supabase → Project Settings → Database → Connection String (direct)
# Use port 5432 for the direct URL (Prisma migrations)
DIRECT_URL=postgresql://postgres.your-project-ref:your-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# ─── Anthropic ────────────────────────────────────────────────────────────────
# From: https://console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-your-key-here

# ─── Supabase Service Role (server-side only — NEVER expose to client) ────────
# From: Supabase → Project Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

- [ ] **Step 3: Commit**

```powershell
git add .env.example
git commit -m "chore: add .env.example with all required environment variables"
```

---

## Task 10: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `CLAUDE.md` in project root**

```markdown
# Caleta — AI Context File

> Read this file at the start of every session. It is the single source of truth for project decisions.

## Project Summary

**Caleta** is a personal finance PWA for young Colombians (students, first-job crowd). The differentiator: users upload screenshots from Nequi, Daviplata, Bancolombia, Nubank, or PSE receipts, and an AI agent extracts transactions, categorizes them, and generates monthly insights in plain Spanish.

"Caletas" are savings goals (e.g., "Viaje a Cartagena — $800.000 para diciembre").

**Academic context:** 20% of the third corte. Also intended as portfolio work.

---

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | RSC by default; better performance for data-heavy pages |
| Language | TypeScript (strict) | Catch errors at compile time, not in prod |
| Styles | Tailwind CSS + shadcn/ui | Rapid iteration, accessible components, easy theming |
| ORM | Prisma | Type-safe queries, great DX, Supabase compatible |
| Database | Supabase PostgreSQL | Free tier, built-in auth, storage, RLS — one platform |
| Auth | Supabase Auth | Handles email/password + OAuth, works with Prisma via userId |
| Storage | Supabase Storage | Stores screenshot images uploaded by users |
| AI | Anthropic Claude API (via Vercel AI SDK) | Best multimodal model for reading financial screenshots |
| PWA | @ducanh2912/next-pwa | Most maintained next-pwa fork |
| Package manager | pnpm | Faster than npm/yarn, strict peer deps |
| Deploy | Vercel | Zero-config Next.js deploy |

---

## Architecture Decisions

### Server Components by Default
Every component is a Server Component unless it needs interactivity (`"use client"`). Data fetching happens in Server Components; mutations happen via Server Actions.

### Server Actions Over API Routes
Use `src/server/actions/` for all mutations (create transaction, add to caleta, etc.). API routes (`src/app/api/`) are reserved for:
- Webhooks (e.g., Supabase Auth webhook to sync user to Prisma)
- Streaming AI responses (where Server Actions don't work)

### Money Storage in Centavos
All monetary amounts are stored as `Int` (centavos) to avoid floating-point precision errors.
- User enters: `$15.500` → stored as `1550000`
- Display: divide by 100, format with `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`

### User Sync Strategy
Supabase manages auth. When a user signs up, a webhook (or auth trigger) creates a corresponding `User` record in our Prisma `public.users` table using `supabaseId` as the link.

### AI Isolation
All AI logic lives in `src/lib/ai/`. Features import from there. This keeps AI dependencies in one place and makes swapping models easy.

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
  lib/
    prisma.ts          # Prisma singleton
    supabase/
      client.ts        # browser client
      server.ts        # server client (RSC / Server Actions)
    ai/
      index.ts         # shared Anthropic provider
      (feature files added here as features are built)
  server/
    actions/           # Server Actions by domain
      accounts/
      caletas/
      insights/
      transactions/
  types/
    index.ts           # shared types, re-exports
  hooks/               # custom React hooks (client-side)
prisma/
  schema.prisma
  seed.ts
public/
  manifest.json
  icons/
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
- Prisma types (`Transaction`, `User`, etc.) imported from `@prisma/client`

### Components
- Prefer Server Components — add `"use client"` only when needed
- `"use client"` components are small, leaf components
- Props typed inline or with a local `Props` type (not exported unless reused)

### Server Actions
```typescript
"use server"
import { prisma } from "@/lib/prisma"
import type { ActionResult } from "@/types"

export async function createSomething(data: InputType): Promise<ActionResult<OutputType>> {
  try {
    // ...
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Error message in Spanish" }
  }
}
```

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
6. **Auth check in every server action.** Verify the user session before touching the database.
7. **Error messages in Spanish.** This app is for Colombian users.
```

- [ ] **Step 2: Commit**

```powershell
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project context, architecture, and conventions"
```

---

## Task 11: Create README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# Caleta 🌊

Gestión de finanzas personales con IA para jóvenes colombianos.

Sube screenshots de tus apps financieras (Nequi, Daviplata, Bancolombia, Nubank) y deja que la IA registre y categorice tus transacciones automáticamente.

## Stack

- **Next.js 15** — App Router, Server Components, Server Actions
- **TypeScript** — strict mode
- **Tailwind CSS** + **shadcn/ui** — UI
- **Prisma** — ORM (type-safe queries)
- **Supabase** — PostgreSQL, Auth, Storage
- **Anthropic Claude API** (Vercel AI SDK) — extracción y análisis con IA
- **next-pwa** — PWA con soporte offline

## Instalación

### Requisitos previos

- Node.js 20+
- pnpm 9+
- Cuenta en [Supabase](https://supabase.com)
- API Key de [Anthropic](https://console.anthropic.com)

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd Caleta
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales (ver sección [Variables de entorno](#variables-de-entorno)).

### 4. Configurar base de datos

```bash
# Generar el Prisma Client
pnpm prisma generate

# Correr migraciones
pnpm prisma migrate dev --name init

# Sembrar categorías predefinidas
pnpm prisma db seed
```

### 5. Correr en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ver `.env.example` para la lista completa y documentación de cada variable.

| Variable | Dónde obtenerla |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection Pooling |
| `DIRECT_URL` | Supabase → Project Settings → Database → Connection String |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret, server-only) |

## Estructura de carpetas

```
src/
  app/
    (auth)/          # Login, registro
    (dashboard)/     # Rutas protegidas
    api/             # Webhooks y endpoints de streaming
  components/
    ui/              # Componentes shadcn/ui (auto-generados)
    features/        # Componentes por feature
  lib/
    prisma.ts
    supabase/
    ai/
  server/actions/    # Server Actions por dominio
  types/
prisma/
  schema.prisma
  seed.ts
```

## Estado del desarrollo

### Completado
- [x] Scaffolding y configuración del proyecto
- [x] Schema de base de datos completo (Prisma)
- [x] Configuración de Supabase (auth + storage)
- [x] Configuración de Anthropic AI SDK
- [x] PWA manifest y service worker
- [x] Tema visual (verde caleta `#0F766E`)

### Pendiente
- [ ] RF-01: Auth (login/registro con Supabase)
- [ ] RF-02: Onboarding
- [ ] RF-03: Dashboard principal
- [ ] RF-04: Subida de screenshots + extracción IA
- [ ] RF-05: CRUD de transacciones
- [ ] RF-06: Categorización automática
- [ ] RF-07: Caletas (metas de ahorro)
- [ ] RF-08: Insights mensuales con IA
- [ ] RF-09: Historial y búsqueda
- [ ] RF-10: Configuración y perfil
- [ ] RF-11: Funcionalidad offline (PWA)

## Deploy

Deploy automático en Vercel. Conecta el repositorio en [vercel.com](https://vercel.com) y configura las variables de entorno en el dashboard.

## Licencia

MIT
```

- [ ] **Step 2: Commit**

```powershell
git add README.md
git commit -m "docs: add README with setup instructions and project status"
```

---

## Task 12: Create Prisma Seed File

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create `prisma/seed.ts` with predefined categories**

```typescript
import { PrismaClient, CategoryType } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_CATEGORIES: Array<{
  nombre: string
  icono: string
  color: string
  tipo: CategoryType
}> = [
  // ─── Ingresos ─────────────────────────────────────────────────────────────
  { nombre: 'Salario', icono: 'briefcase', color: '#16a34a', tipo: CategoryType.INCOME },
  { nombre: 'Freelance', icono: 'laptop', color: '#2563eb', tipo: CategoryType.INCOME },
  { nombre: 'Transferencia recibida', icono: 'arrow-down-to-line', color: '#0891b2', tipo: CategoryType.INCOME },
  { nombre: 'Arriendo recibido', icono: 'building', color: '#7c3aed', tipo: CategoryType.INCOME },
  { nombre: 'Intereses', icono: 'trending-up', color: '#d97706', tipo: CategoryType.INCOME },
  { nombre: 'Otro ingreso', icono: 'plus-circle', color: '#64748b', tipo: CategoryType.INCOME },
  // ─── Gastos ───────────────────────────────────────────────────────────────
  { nombre: 'Alimentación', icono: 'utensils', color: '#ea580c', tipo: CategoryType.EXPENSE },
  { nombre: 'Transporte', icono: 'bus', color: '#0284c7', tipo: CategoryType.EXPENSE },
  { nombre: 'Entretenimiento', icono: 'gamepad-2', color: '#7c3aed', tipo: CategoryType.EXPENSE },
  { nombre: 'Salud', icono: 'heart-pulse', color: '#dc2626', tipo: CategoryType.EXPENSE },
  { nombre: 'Educación', icono: 'graduation-cap', color: '#0891b2', tipo: CategoryType.EXPENSE },
  { nombre: 'Ropa', icono: 'shirt', color: '#ec4899', tipo: CategoryType.EXPENSE },
  { nombre: 'Servicios públicos', icono: 'zap', color: '#f59e0b', tipo: CategoryType.EXPENSE },
  { nombre: 'Tecnología', icono: 'monitor-smartphone', color: '#64748b', tipo: CategoryType.EXPENSE },
  { nombre: 'Hogar', icono: 'home', color: '#78716c', tipo: CategoryType.EXPENSE },
  { nombre: 'Deudas', icono: 'credit-card', color: '#991b1b', tipo: CategoryType.EXPENSE },
  { nombre: 'Ahorro', icono: 'piggy-bank', color: '#0f766e', tipo: CategoryType.EXPENSE },
  { nombre: 'Otro gasto', icono: 'circle-ellipsis', color: '#94a3b8', tipo: CategoryType.EXPENSE },
]

async function main() {
  console.log('Sembrando categorías del sistema...')

  for (const category of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: { nombre_userId: { nombre: category.nombre, userId: null as unknown as string } },
      update: {},
      create: { ...category, userId: null },
    })
  }

  console.log(`✓ ${SYSTEM_CATEGORIES.length} categorías sembradas`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

> **Note on the seed upsert:** The `@@unique([nombre, userId])` constraint with nullable `userId` requires special handling. If Prisma's upsert fails due to null in unique key, use a `findFirst` + create pattern instead.

- [ ] **Step 2: Commit**

```powershell
git add prisma/seed.ts
git commit -m "feat: add Prisma seed with 18 predefined system categories"
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Next.js 15 + App Router + TypeScript + Tailwind | Task 1 |
| ESLint + Prettier | Task 1 + Task 2 |
| shadcn/ui with `#0F766E` primary color | Task 3 |
| Prisma configured for Supabase | Task 4 |
| All 6 Prisma models (User, Account, Category, Transaction, Caleta, CaletaDeposit, Insight) | Task 4 |
| Vercel AI SDK + @anthropic-ai/sdk | Task 6 |
| next-pwa with manifest | Task 7 |
| Folder structure as spec | Task 8 |
| .env.example documented | Task 9 |
| CLAUDE.md with all required sections | Task 10 |
| README with setup instructions | Task 11 |
| Prisma seed for system categories | Task 12 |
| Supabase utilities (client + server) | Task 5 |

All requirements covered. No gaps found.

### Placeholder Check
No TBD, TODO, or "similar to" placeholders in plan. All code is complete.

### Type Consistency
- `ActionResult<T>` defined in Task 8, matches usage in CLAUDE.md conventions
- `CategoryType` enum used consistently in Task 4 and Task 12
- `@prisma/client` re-exports in `src/types/index.ts` match schema enums

---

## Manual Steps Required After Execution

Before running `pnpm dev`, the user must:

1. **Create a Supabase project** at [app.supabase.com](https://app.supabase.com)
2. **Get API keys** from Supabase Project Settings → API
3. **Get database connection strings** from Supabase Project Settings → Database
4. **Create Anthropic API key** at [console.anthropic.com](https://console.anthropic.com)
5. **Create `.env.local`** from `.env.example` and fill in all values
6. **Run `pnpm prisma migrate dev --name init`** to create tables
7. **Run `pnpm prisma db seed`** to seed categories
8. **Add PWA icons** (192×192 and 512×512 PNGs) to `public/icons/`
9. **Configure Supabase Auth webhook** (later, for user sync to Prisma)
