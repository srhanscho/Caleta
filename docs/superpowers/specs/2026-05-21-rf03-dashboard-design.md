# RF-03 Dashboard Principal — Spec de Diseño
**Fecha:** 2026-05-21
**Estado:** Aprobado por usuario

---

## Resumen

Dashboard principal de Caleta con layout Hero Balance + Área Chart. Incluye rebrand completo de teal → azul eléctrico. Bottom nav fijo para navegación principal de la PWA.

---

## 1. Rebrand de Colores

Reemplaza el palette actual (teal/verde) por navy oscuro + azul eléctrico en `src/app/globals.css`.

| Token CSS | Valor oklch | Descripción |
|-----------|-------------|-------------|
| `--background` | `oklch(0.08 0.025 265)` | Navy casi negro — fondo general |
| `--card` | `oklch(0.13 0.035 265)` | Navy oscuro — cards y paneles |
| `--primary` | `oklch(0.58 0.25 265)` | Azul eléctrico — botones, acentos |
| `--primary-foreground` | `oklch(0.98 0.005 265)` | Blanco hueso — texto sobre primary |
| `--secondary` | `oklch(0.18 0.04 265)` | Navy medio — cards secundarias |
| `--secondary-foreground` | `oklch(0.78 0.08 265)` | Azul claro — texto sobre secondary |
| `--muted` | `oklch(0.22 0.03 265)` | Navy suave |
| `--muted-foreground` | `oklch(0.62 0.04 265)` | Gris azulado — texto secundario |
| `--accent` | `oklch(0.18 0.04 265)` | Igual a secondary |
| `--accent-foreground` | `oklch(0.85 0.08 265)` | Texto sobre accent |
| `--destructive` | `oklch(0.55 0.22 27)` | Rojo — errores y gastos |
| `--destructive-foreground` | `oklch(0.98 0 0)` | Blanco — texto sobre destructive |
| `--border` | `oklch(0.20 0.035 265)` | Borde sutil |
| `--input` | `oklch(0.20 0.035 265)` | Fondo inputs |
| `--ring` | `oklch(0.58 0.25 265)` | Focus ring — azul eléctrico |
| `--radius` | `0.75rem` | Sin cambio |

**Verde funcional:** `#22C55E` hardcodeado únicamente para montos de ingreso (`+$xxx`). Es convención financiera universal — no es color de marca.

**Hardcoded en auth components:** Los componentes de auth usan colores hardcoded (`bg-[#18181B]`, `border-[#27272A]`). Actualizar a navy equivalente: `bg-[#0D1117]`, `border-[#1E2A3A]`.

---

## 2. Logos

Archivos copiados a `/public/`:

| Archivo | Uso |
|---------|-----|
| `/public/logo-icon.png` | Isotipo "C" — header (24×24px), favicon, PWA icon |
| `/public/logo.png` | Logotipo completo (C + Caleta) — login, splash |
| `/public/logo-text.png` | Solo wordmark — alternativa para header ancho |

Todos en blanco hueso (`#F5EDD8`) sobre fondo transparente — visibles sobre cualquier fondo oscuro.

---

## 3. Layout del Dashboard

### Estructura de la página (`/dashboard`)

```
[Header]
  - Logo isotipo (24px) + "Caleta" texto
  - Avatar circular con inicial del usuario (derecha)

[Hero Section]  ← bg-card, padding generoso
  - Label "Balance total" (muted-foreground, sm)
  - Monto total (3xl bold, foreground) — suma de balances activos
  - Row: [↑ Ingresos $xxx.xxx] [↓ Gastos $xxx.xxx]
    chips con ícono ArrowUpRight (verde #22C55E) y ArrowDownRight (destructive)

[Spending Chart Section]
  - Header: "Gastos del mes" + selector de mes (label, no dropdown por ahora)
  - Recharts AreaChart: gastos acumulados por día del mes actual
  - Gradiente azul eléctrico → transparente
  - Sin ejes visibles, solo tooltip on hover
  - Height: 140px

[Accounts Row]
  - Header: "Mis cuentas" + botón "+ Nueva" (text button, primary color)
  - Scroll horizontal de AccountCard:
    - Nombre cuenta + tipo (Nequi, Daviplata, etc.)
    - Balance en COP
    - Color dot del account.color
  - "+ Nueva" navega a /onboarding (reutiliza flujo existente)

[Recent Transactions]
  - Header: "Movimientos recientes"
  - Lista de últimas 5 transacciones:
    - Ícono de categoría (círculo coloreado con category.color)
    - Descripción o nombre de categoría
    - Fecha relativa (hoy, ayer, lun, etc.)
    - Monto (+/- con color)
  - Si no hay transacciones: empty state "Aún no tienes movimientos. Agrega tu primera transacción."
  - Sin "Ver todas" por ahora (RF-05 no existe todavía)

[Spacer pb-20]  ← espacio para bottom nav
```

### Bottom Nav (layout fijo)

Componente `BottomNav` añadido al `(dashboard)/layout.tsx`. Fijo en `bottom-0`, `z-50`.

| Tab | Ícono | Ruta | Estado |
|-----|-------|------|--------|
| Inicio | `Home` (Lucide) | `/dashboard` | Activo |
| Transacciones | `ArrowLeftRight` | `/transacciones` | Placeholder (RF-05) |
| Caletas | `PiggyBank` | `/caletas` | Placeholder (RF-07) |
| Perfil | `User` | `/perfil` | Placeholder (RF-10) |

Tab activo: color primary (azul eléctrico). Inactivo: muted-foreground. Fondo: bg-card con border-t border-border.

Tabs placeholder muestran un toast "Próximamente" al hacer clic.

---

## 4. Datos requeridos

Un solo fetch en el Server Component `DashboardPage` con el `userId` del usuario autenticado.

```typescript
// Queries paralelas via Promise.all:

// 1. Balance total
prisma.account.aggregate({
  where: { userId, activa: true },
  _sum: { balance: true }
})

// 2. Ingresos del mes
prisma.transaction.aggregate({
  where: { userId, tipo: 'INCOME', fecha: { gte: startOfMonth, lte: endOfMonth } },
  _sum: { monto: true }
})

// 3. Gastos del mes
prisma.transaction.aggregate({
  where: { userId, tipo: 'EXPENSE', fecha: { gte: startOfMonth, lte: endOfMonth } },
  _sum: { monto: true }
})

// 4. Gastos por día (para chart)
prisma.transaction.groupBy({
  by: ['fecha'],
  where: { userId, tipo: 'EXPENSE', fecha: { gte: startOfMonth, lte: endOfMonth } },
  _sum: { monto: true },
  orderBy: { fecha: 'asc' }
})

// 5. Cuentas activas
prisma.account.findMany({
  where: { userId, activa: true },
  orderBy: { createdAt: 'asc' }
})

// 6. Últimas 5 transacciones
prisma.transaction.findMany({
  where: { userId },
  include: { category: true, account: true },
  orderBy: { fecha: 'desc' },
  take: 5
})
```

**Transformaciones:**
- Montos de centavos → COP: `(monto / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })`
- Datos del chart: agrupar por día del mes (día 1–31), rellenar días sin gastos con 0
- Fecha relativa: función helper `formatRelativeDate(date)` → "hoy", "ayer", "lun 19 may"

---

## 5. Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/app/globals.css` | Modificar | Rebrand colores |
| `src/app/(auth)/login/page.tsx` | Modificar | Logo completo, colores navy |
| `src/components/features/auth/auth-form.tsx` | Modificar | Colores hardcoded → navy |
| `src/components/features/auth/google-button.tsx` | Modificar | Colores hardcoded → navy |
| `src/app/(dashboard)/layout.tsx` | Modificar | Agregar BottomNav |
| `src/app/(dashboard)/dashboard/page.tsx` | Reemplazar | Server Component con fetch de datos |
| `src/components/layout/bottom-nav.tsx` | Crear | Bottom nav fijo |
| `src/components/features/dashboard/balance-hero.tsx` | Crear | Balance + chips ingresos/gastos |
| `src/components/features/dashboard/spending-chart.tsx` | Crear | Recharts AreaChart (client) |
| `src/components/features/dashboard/accounts-row.tsx` | Crear | Scroll horizontal cuentas |
| `src/components/features/dashboard/recent-transactions.tsx` | Crear | Lista últimas 5 |
| `src/lib/format.ts` | Crear | formatCOP(), formatRelativeDate() |

**Dependencia nueva:** `recharts` — instalar con `pnpm add recharts`

---

## 6. Fuera de alcance (este RF)

- Navegación funcional de tabs Transacciones / Caletas / Perfil (RF-05, RF-07, RF-10)
- Filtro por mes en el chart (solo mes actual por ahora)
- Selector de rango de fechas
- Push notifications
- Empty states elaborados (solo texto simple)
