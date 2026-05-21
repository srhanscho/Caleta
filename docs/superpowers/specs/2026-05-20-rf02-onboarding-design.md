# RF-02 Onboarding — Agregar Cuentas Iniciales

## Objetivo

Guiar al usuario recién registrado para que configure sus cuentas (Nequi, Daviplata, Bancolombia, etc.) con sus balances actuales antes de acceder al dashboard. El onboarding también se activa si el usuario no tiene ninguna cuenta registrada.

## Arquitectura

### Ruta

`/onboarding` dentro del route group `(dashboard)` — heredada protección de auth del middleware existente.

### Lógica de redirección

El **`(dashboard)/layout.tsx`** (Server Component) controla las redirecciones:
- Obtiene el usuario de Supabase Auth
- **Upsert** del `User` en Prisma por `supabaseId` (crea si no existe — resiliente a fallos del webhook)
- Si `accounts.length === 0` → `redirect('/onboarding')`

La **`/onboarding/page.tsx`** hace el chequeo inverso:
- Si el usuario ya tiene cuentas → `redirect('/dashboard')` (evita regresar al onboarding tras configurar)

### Flujo completo

```
login exitoso
  → GET /dashboard
  → (dashboard)/layout.tsx — checa accounts
  → 0 cuentas → redirect /onboarding
  → usuario llena el form (0..N cuentas)
  → "Guardar y continuar" → Server Action createAccounts → redirect /dashboard
  → "Saltar por ahora" → router.push('/dashboard') sin llamar la action
```

## Componentes

### `src/app/(dashboard)/onboarding/page.tsx`
Server Component. Verifica que el usuario no tenga cuentas (redirect si tiene). Renderiza el layout de card centrado y el `OnboardingForm`.

### `src/components/features/accounts/onboarding-form.tsx`
Client Component (`'use client'`). Formulario dinámico con lista de filas de cuentas. Maneja estado local con `useState`.

### `src/server/actions/accounts/create-accounts.ts`
Server Action (`'use server'`). Recibe array de cuentas, crea todas en una transacción de Prisma.

## UI — OnboardingForm

Card centrada (mismo estilo dark de `/login`). Encabezado con título y subtítulo.

Cada fila de cuenta:
```
[Tipo ▼]  [Nombre]  [$ Balance]  [× quitar]
```

- **Tipo**: select con opciones `NEQUI | DAVIPLATA | BANCOLOMBIA | NUBANK | EFECTIVO | OTRO`
- **Nombre**: texto, se pre-llena al elegir tipo (ej. `NEQUI` → `"Nequi"`), editable
- **Balance**: número entero en COP (ej. `150000`); la action multiplica × 100 para guardar centavos
- **× quitar**: elimina la fila

Botón `+ Agregar otra cuenta` agrega una fila vacía al final.

Acciones al fondo:
- `Guardar y continuar` — llama `createAccounts`, redirige a `/dashboard`
- `Saltar por ahora` — `router.push('/dashboard')` directo, sin action

## Server Action — createAccounts

```typescript
type AccountInput = {
  tipo: AccountType   // enum del schema
  nombre: string
  balance: number     // COP entero, sin centavos
}

async function createAccounts(accounts: AccountInput[]): Promise<ActionResult<void>>
```

Lógica:
1. `createClient()` → `supabase.auth.getUser()` — verifica sesión
2. `prisma.user.findUnique({ where: { supabaseId: user.id } })` — obtiene userId Prisma (el upsert ya ocurrió en el layout, aquí solo se busca)
3. Si array vacío → `return { success: true }` (el usuario saltó)
4. `prisma.$transaction([...accounts.map(a => prisma.account.create({ data: { userId, tipo: a.tipo, nombre: a.nombre, balance: a.balance * 100 } }))])` 
5. `return { success: true }`

Errores: si no hay sesión → `{ success: false, error: 'No autorizado' }`. Si falla la DB → `{ success: false, error: 'Error al guardar las cuentas' }`.

## Nombres por defecto por tipo

| Tipo | Nombre por defecto |
|------|-------------------|
| NEQUI | Nequi |
| DAVIPLATA | Daviplata |
| BANCOLOMBIA | Bancolombia |
| NUBANK | Nu |
| EFECTIVO | Efectivo |
| OTRO | Mi cuenta |

## Cambios en archivos existentes

- **`src/app/(dashboard)/layout.tsx`**: agregar lógica de redirección (Supabase + Prisma query)
- **`src/types/index.ts`**: `AccountType` ya se re-exporta desde Prisma — disponible para el form

## Archivos nuevos

- `src/app/(dashboard)/onboarding/page.tsx`
- `src/components/features/accounts/onboarding-form.tsx`
- `src/server/actions/accounts/create-accounts.ts`
