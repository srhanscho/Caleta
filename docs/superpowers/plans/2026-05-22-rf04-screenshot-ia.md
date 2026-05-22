# RF-04 Screenshots + IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al usuario fotografiar un comprobante de pago y que la IA extraiga y guarde la transacción automáticamente.

**Architecture:** Server Action recibe un `FormData` con el archivo e `accountId`. Convierte a base64 → `generateObject` con Claude → sube imagen a Supabase Storage → crea `Transaction` en DB. El cliente muestra un toast "Transacción guardada · Deshacer" (5 s).

**Tech Stack:** Next.js 15 Server Actions, Vercel AI SDK v6 (`generateObject`), `@ai-sdk/anthropic`, Zod v4, Supabase Storage, Prisma 7, sonner (toast), Tailwind v4, lucide-react.

---

## File Structure

| Acción | Archivo | Responsabilidad |
|--------|---------|----------------|
| Crear | `src/lib/ai/extract-transaction.ts` | Schema Zod + función `extractFromImage` que llama a Claude |
| Crear | `src/server/actions/transactions/extract-transaction.ts` | SA principal + `deleteTransaction` para undo |
| Crear | `src/app/(dashboard)/scan/page.tsx` | Ruta `/scan` — carga cuentas activas, renderiza componente |
| Crear | `src/components/features/transactions/screenshot-upload.tsx` | Client component con 3 estados de UI |
| Modificar | `src/components/layout/bottom-nav.tsx` | 4 tabs → 5 tabs con Camera en el centro |
| Modificar | `src/app/layout.tsx` | Agregar `<Toaster />` de sonner |

---

## Task 0: Configuración manual — bucket Supabase Storage

> Este task no requiere código. Hacerlo antes de desplegar.

- [ ] **Paso 1: Crear bucket en Supabase**

  1. Ir a [app.supabase.com](https://app.supabase.com) → tu proyecto → Storage → New bucket
  2. Name: `screenshots`
  3. Public bucket: **OFF** (privado)
  4. Guardar

- [ ] **Paso 2: Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté en `.env.local` y en Vercel**

  El key está en Supabase → Project Settings → API → `service_role`. Debe existir en `.env.local` y en las variables de entorno de Vercel.

---

## Task 1: Instalar sonner + agregar Toaster al layout

**Files:**
- Crear: `src/components/ui/sonner.tsx` (generado por shadcn)
- Modificar: `src/app/layout.tsx`

- [ ] **Paso 1: Instalar sonner via shadcn**

  ```bash
  pnpm dlx shadcn@latest add sonner
  ```

  Responde `y` si pregunta por sobreescribir. Crea `src/components/ui/sonner.tsx`.

- [ ] **Paso 2: Agregar `<Toaster />` al root layout**

  Modificar `src/app/layout.tsx`:

  ```tsx
  import type { Metadata, Viewport } from 'next'
  import { IBM_Plex_Sans } from 'next/font/google'
  import { Toaster } from '@/components/ui/sonner'
  import './globals.css'

  const ibmPlexSans = IBM_Plex_Sans({
    variable: '--font-ibm-plex-sans',
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
  })

  export const metadata: Metadata = {
    title: {
      default: 'Caleta',
      template: '%s | Caleta',
    },
    description: 'Gestiona tus finanzas personales con IA',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Caleta',
    },
  }

  export const viewport: Viewport = {
    themeColor: '#0F766E',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  }

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode
  }>) {
    return (
      <html lang="es" className={`${ibmPlexSans.variable} dark h-full antialiased`}>
        <body className="min-h-full flex flex-col font-[family-name:var(--font-ibm-plex-sans)]">
          {children}
          <Toaster position="top-center" richColors />
        </body>
      </html>
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
  git add src/app/layout.tsx src/components/ui/sonner.tsx
  git commit -m "feat: install sonner and add Toaster to root layout"
  ```

---

## Task 2: Módulo AI — extractFromImage

**Files:**
- Crear: `src/lib/ai/extract-transaction.ts`

- [ ] **Paso 1: Crear el archivo**

  ```typescript
  // src/lib/ai/extract-transaction.ts
  import { generateObject } from 'ai'
  import { z } from 'zod'
  import { anthropic, DEFAULT_MODEL } from '@/lib/ai/index'

  const ExtractionSchema = z.object({
    legible: z.boolean(),
    monto: z.number().min(0),        // pesos COP; SA multiplica ×100 para centavos
    tipo: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    fecha: z.string(),               // ISO 8601
    descripcion: z.string().max(120),
    categoriaSugerida: z.string(),   // nombre exacto de la lista pasada al prompt
    confidenceScore: z.number().min(0).max(1),
  })

  export type ExtractionResult = z.infer<typeof ExtractionSchema>

  export async function extractFromImage(
    base64: string,
    mimeType: string,
    categoryNames: string[]
  ): Promise<ExtractionResult> {
    const today = new Date().toISOString().split('T')[0]
    const prompt = `Eres un asistente de finanzas personales para colombianos.
  Analiza este comprobante de pago y extrae la información de la transacción.

  Categorías disponibles: ${categoryNames.join(', ')}
  Fecha actual: ${today} — úsala si el comprobante no muestra año.

  Reglas:
  - monto: solo el valor transferido/pagado, sin puntos de miles ni símbolos (15500 no $15.500)
  - tipo: INCOME si recibes dinero, EXPENSE si lo envías/pagas, TRANSFER entre tus propias cuentas
  - fecha: en formato ISO 8601 completo
  - categoriaSugerida: debe ser exactamente uno de los nombres de la lista anterior
  - si la imagen no es un comprobante financiero legible, devuelve legible: false con monto: 0
  - confidenceScore: certeza de la extracción de 0.0 a 1.0`

    const { object } = await generateObject({
      model: anthropic(DEFAULT_MODEL),
      schema: ExtractionSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64}`,
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    return object
  }
  ```

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit**

  ```bash
  git add src/lib/ai/extract-transaction.ts
  git commit -m "feat: add AI extraction module with Zod schema and generateObject"
  ```

---

## Task 3: Server Actions — extractTransaction + deleteTransaction

**Files:**
- Crear: `src/server/actions/transactions/extract-transaction.ts`

- [ ] **Paso 1: Crear el archivo**

  ```typescript
  // src/server/actions/transactions/extract-transaction.ts
  'use server'

  import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
  import { createClient } from '@/lib/supabase/server'
  import { prisma } from '@/lib/prisma'
  import { extractFromImage } from '@/lib/ai/extract-transaction'
  import type { ActionResult } from '@/types'
  import type { TransactionModel } from '@/generated/prisma'

  function getExt(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
    }
    return map[mimeType] ?? 'jpg'
  }

  export async function extractTransaction(
    formData: FormData
  ): Promise<ActionResult<TransactionModel>> {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

    const file = formData.get('file') as File | null
    const accountId = formData.get('accountId') as string | null
    if (!file || !accountId) return { success: false, error: 'Datos incompletos' }

    try {
      // 1. Leer buffer y convertir a base64
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'

      // 2. Cargar categorías del usuario (sistema + propias)
      const categories = await prisma.category.findMany({
        where: { OR: [{ userId: prismaUser.id }, { userId: null }] },
        select: { id: true, nombre: true },
      })
      const categoryNames = categories.map((c) => c.nombre)

      // 3. Extraer con Claude
      const extraction = await extractFromImage(base64, mimeType, categoryNames)

      if (!extraction.legible) {
        return {
          success: false,
          error: 'No se pudo leer el comprobante. Intenta con mejor iluminación.',
        }
      }

      // 4. Subir imagen a Supabase Storage
      const adminClient = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const ext = getExt(mimeType)
      const storagePath = `${prismaUser.id}/${Date.now()}.${ext}`
      await adminClient.storage.from('screenshots').upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

      // 5. Resolver categoría — fallback a "Otro" si no hay match
      const category =
        categories.find((c) => c.nombre === extraction.categoriaSugerida) ??
        categories.find((c) => c.nombre === 'Otro')

      if (!category) return { success: false, error: 'Categoría no encontrada' }

      // 6. Guardar transacción en DB
      const transaction = await prisma.transaction.create({
        data: {
          userId: prismaUser.id,
          accountId,
          categoryId: category.id,
          monto: Math.round(extraction.monto * 100),
          tipo: extraction.tipo,
          fecha: new Date(extraction.fecha),
          descripcion: extraction.descripcion,
          sourceImageUrl: `screenshots/${storagePath}`,
          confidenceScore: extraction.confidenceScore,
        },
      })

      return { success: true, data: transaction }
    } catch {
      return { success: false, error: 'Error al analizar la imagen. Intenta de nuevo.' }
    }
  }

  export async function deleteTransaction(id: string): Promise<ActionResult<void>> {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

    try {
      await prisma.transaction.delete({
        where: { id, userId: prismaUser.id },
      })
      return { success: true, data: undefined }
    } catch {
      return { success: false, error: 'Error al deshacer la transacción' }
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
  git commit -m "feat: add extractTransaction and deleteTransaction server actions"
  ```

---

## Task 4: Actualizar BottomNav — agregar tab Camera central

**Files:**
- Modificar: `src/components/layout/bottom-nav.tsx`

- [ ] **Paso 1: Reemplazar el contenido del archivo**

  ```tsx
  // src/components/layout/bottom-nav.tsx
  'use client'

  import Link from 'next/link'
  import { usePathname } from 'next/navigation'
  import { Home, ArrowLeftRight, Camera, PiggyBank, User } from 'lucide-react'

  const tabs = [
    { label: 'Inicio', icon: Home, href: '/dashboard' },
    { label: 'Transacciones', icon: ArrowLeftRight, href: '/transacciones' },
    { label: 'Caletas', icon: PiggyBank, href: '/caletas' },
    { label: 'Perfil', icon: User, href: '/perfil' },
  ] as const

  type Tab = (typeof tabs)[number]

  function NavTab({ label, icon: Icon, href, isActive }: Tab & { isActive: boolean }) {
    const isPlaceholder = href !== '/dashboard'

    if (isPlaceholder) {
      return (
        <button
          type="button"
          onClick={() => alert('Próximamente')}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground transition-colors cursor-pointer"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px]">{label}</span>
        </button>
      )
    }

    return (
      <Link
        href={href}
        className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors cursor-pointer ${
          isActive ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="text-[10px]">{label}</span>
      </Link>
    )
  }

  export function BottomNav() {
    const pathname = usePathname()

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-border bg-card">
        {tabs.slice(0, 2).map((tab) => (
          <NavTab key={tab.href} {...tab} isActive={pathname === tab.href} />
        ))}

        {/* Tab central — escanear comprobante */}
        <Link
          href="/scan"
          className="flex flex-1 flex-col items-center py-2"
          aria-label="Escanear comprobante"
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              pathname === '/scan' ? 'bg-primary/80' : 'bg-primary'
            }`}
          >
            <Camera className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
          </span>
        </Link>

        {tabs.slice(2).map((tab) => (
          <NavTab key={tab.href} {...tab} isActive={pathname === tab.href} />
        ))}
      </nav>
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
  git add src/components/layout/bottom-nav.tsx
  git commit -m "feat: update BottomNav with 5 tabs and Camera center tab"
  ```

---

## Task 5: Ruta /scan — Server Component

**Files:**
- Crear: `src/app/(dashboard)/scan/page.tsx`

- [ ] **Paso 1: Crear el archivo**

  ```tsx
  // src/app/(dashboard)/scan/page.tsx
  import { redirect } from 'next/navigation'
  import { createClient } from '@/lib/supabase/server'
  import { prisma } from '@/lib/prisma'
  import { ScreenshotUpload } from '@/components/features/transactions/screenshot-upload'

  export default async function ScanPage() {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    if (!supabaseUser) redirect('/login')

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })
    if (!prismaUser) redirect('/login')

    const accounts = await prisma.account.findMany({
      where: { userId: prismaUser.id, activa: true },
      select: { id: true, nombre: true, tipo: true, color: true },
      orderBy: { createdAt: 'asc' },
    })

    return (
      <main className="pb-24 px-6 pt-8">
        <h1 className="text-xl font-semibold text-foreground mb-6">Escanear comprobante</h1>
        <ScreenshotUpload accounts={accounts} />
      </main>
    )
  }
  ```

  > **Nota:** El componente `ScreenshotUpload` se crea en el Task 6. TypeScript fallará hasta entonces — está bien.

- [ ] **Paso 2: Commit** (después de completar Task 6)

  Hacerlo junto con el commit del Task 6.

---

## Task 6: Componente ScreenshotUpload

**Files:**
- Crear: `src/components/features/transactions/screenshot-upload.tsx`

- [ ] **Paso 1: Crear el archivo**

  ```tsx
  // src/components/features/transactions/screenshot-upload.tsx
  'use client'

  import { useState, useTransition, useRef } from 'react'
  import { Camera, Loader2 } from 'lucide-react'
  import { toast } from 'sonner'
  import {
    extractTransaction,
    deleteTransaction,
  } from '@/server/actions/transactions/extract-transaction'

  type Account = {
    id: string
    nombre: string
    tipo: string
    color: string
  }

  type Props = {
    accounts: Account[]
  }

  type UIState = 'select-account' | 'select-image' | 'processing'

  const typeLabel: Record<string, string> = {
    NEQUI: 'Nequi',
    DAVIPLATA: 'Daviplata',
    BANCOLOMBIA: 'Bancolombia',
    NUBANK: 'Nubank',
    EFECTIVO: 'Efectivo',
    OTRO: 'Otro',
  }

  export function ScreenshotUpload({ accounts }: Props) {
    const [uiState, setUiState] = useState<UIState>('select-account')
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)

    function reset() {
      setUiState('select-account')
      setSelectedAccountId(null)
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function handleAccountSelect(id: string) {
      setSelectedAccountId(id)
      setUiState('select-image')
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }

    function handleAnalyze() {
      if (!imageFile || !selectedAccountId) return
      setUiState('processing')

      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('accountId', selectedAccountId)

      startTransition(async () => {
        const result = await extractTransaction(formData)

        if (!result.success) {
          toast.error(result.error)
          setUiState('select-image')
          return
        }

        const transactionId = result.data.id

        toast.success('Transacción guardada', {
          duration: 5000,
          action: {
            label: 'Deshacer',
            onClick: () => {
              startTransition(async () => {
                const undoResult = await deleteTransaction(transactionId)
                if (!undoResult.success) toast.error(undoResult.error)
              })
            },
          },
        })

        reset()
      })
    }

    // ── Estado 1: selección de cuenta ────────────────────────────────────────
    if (uiState === 'select-account') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecciona la cuenta del comprobante
          </p>
          <div className="flex flex-wrap gap-3">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => handleAccountSelect(account.id)}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors active:scale-95"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: account.color }}
                  aria-hidden="true"
                />
                {account.nombre}
                <span className="text-xs text-muted-foreground">
                  {typeLabel[account.tipo] ?? account.tipo}
                </span>
              </button>
            ))}
          </div>
        </div>
      )
    }

    // ── Estado 3: procesando ─────────────────────────────────────────────────
    if (uiState === 'processing') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Analizando comprobante...</p>
        </div>
      )
    }

    // ── Estado 2: selección de imagen ────────────────────────────────────────
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

    return (
      <div className="space-y-6">
        {selectedAccount && (
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: selectedAccount.color }}
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">{selectedAccount.nombre}</span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-xs text-primary"
            >
              Cambiar
            </button>
          </div>
        )}

        <label
          htmlFor="screenshot"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-10 cursor-pointer transition-colors active:bg-secondary"
        >
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Vista previa del comprobante"
              className="max-h-64 rounded-xl object-contain"
            />
          ) : (
            <>
              <Camera className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground text-center">
                Toca para subir o tomar una foto del comprobante
              </p>
            </>
          )}
        </label>
        <input
          id="screenshot"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!imageFile}
          className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          Analizar
        </button>
      </div>
    )
  }
  ```

- [ ] **Paso 2: Verificar TypeScript**

  ```bash
  pnpm tsc --noEmit
  ```

  Esperado: sin errores.

- [ ] **Paso 3: Commit** (incluir también el scan/page.tsx del Task 5)

  ```bash
  git add src/components/features/transactions/screenshot-upload.tsx src/app/(dashboard)/scan/page.tsx
  git commit -m "feat: add ScreenshotUpload component and /scan route"
  ```

---

## Task 7: Prueba manual en el navegador

- [ ] **Paso 1: Iniciar el servidor de desarrollo**

  ```bash
  pnpm dev
  ```

- [ ] **Paso 2: Verificar bottom nav**

  Ir a `http://localhost:3000/dashboard`. Comprobar que el bottom nav ahora tiene 5 tabs y el tab central muestra un círculo con ícono de cámara.

- [ ] **Paso 3: Verificar flujo completo**

  1. Tocar el tab Camera → navega a `/scan`
  2. Estado 1: aparecen chips con las cuentas activas del usuario
  3. Tocar una cuenta → avanza al Estado 2
  4. Tocar el área dashed → se abre el selector de archivos (en móvil abre la cámara)
  5. Seleccionar una imagen → aparece preview
  6. Tocar "Analizar" → Estado 3 con spinner "Analizando comprobante..."
  7. Al completar: toast "Transacción guardada" con botón "Deshacer" → vuelve al Estado 1
  8. Tocar "Deshacer" en el toast → la transacción se elimina

- [ ] **Paso 4: Verificar caso de error**

  Subir una imagen que NO sea un comprobante (ej. foto de perfil) → debe aparecer toast rojo "No se pudo leer el comprobante..."

- [ ] **Paso 5: Verificar en Prisma Studio que la transacción se guardó correctamente**

  ```bash
  pnpm prisma studio
  ```

  Ir a la tabla `Transaction` y verificar que `sourceImageUrl`, `confidenceScore`, `categoryId`, `monto`, `tipo`, y `fecha` tengan valores correctos.
