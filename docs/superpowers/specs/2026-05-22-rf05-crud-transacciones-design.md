# RF-05 CRUD Manual de Transacciones — Spec de Diseño
**Fecha:** 2026-05-22
**Estado:** Aprobado por usuario

---

## Resumen

Página `/transacciones` con lista completa de transacciones del usuario. Un FAB `+` abre un drawer para crear. Tocar un item abre el mismo drawer en modo editar, con botón de eliminar. Cada mutación actualiza el balance de la cuenta afectada atómicamente.

---

## Sección 1 — UI Flow

### Página `/transacciones`

Lista de todas las transacciones ordenadas por fecha descendente. Cada item muestra:
- Punto de color de la categoría
- Descripción (o "Sin descripción" si está vacía)
- Nombre de cuenta + fecha relativa
- Monto en COP: verde para INCOME, rojo para EXPENSE/TRANSFER

FAB `+` flotante en esquina inferior derecha, sobre el BottomNav (`bottom-24`).

### Drawer — modo Crear

Se abre desde el FAB. Estado inicial vacío. Campos:
- **Tipo**: 3 chips seleccionables — INCOME / EXPENSE / TRANSFER
- **Monto**: input numérico en pesos COP (entero positivo)
- **Cuenta**: select entre cuentas activas del usuario
- **Categoría**: select filtrado por tipo (INCOME muestra solo categorías INCOME; EXPENSE/TRANSFER muestran categorías EXPENSE)
- **Fecha**: `<input type="date">` con default = hoy
- **Descripción**: text opcional, max 120 chars

Botón "Guardar". Al completar: toast "Transacción creada" + cierra drawer + `router.refresh()`.

### Drawer — modo Editar

Se abre al tocar cualquier item de la lista. Mismos campos precargados con los valores actuales. Botón "Guardar" (actualiza) y botón "Eliminar" (rojo). Al tocar "Eliminar": el botón cambia a un estado de confirmación dentro del mismo drawer — muestra "¿Seguro?" con dos botones: "Sí, eliminar" y "Cancelar". No usar `window.confirm()`. Al eliminar: toast "Transacción eliminada" + cierra drawer + `router.refresh()`.

### Cambio de tipo en el formulario

Si el usuario cambia el tipo y la categoría seleccionada no corresponde al nuevo tipo, se resetea `categoryId` a null (usuario debe elegir de nuevo).

---

## Sección 2 — Arquitectura

### Server Component — `/transacciones`

Carga en paralelo:
- Todas las transacciones del usuario con `include: { category, account }`, ordenadas por `fecha desc`
- Cuentas activas del usuario (`select: { id, nombre, tipo, color }`)
- Categorías del usuario + sistema (`select: { id, nombre, tipo }`)

Pasa las tres listas como props a `TransactionList`.

### Client Component — `TransactionList`

Recibe transacciones, cuentas y categorías. Renderiza:
- Lista de items
- FAB `+`
- `TransactionDrawer` (controlado por estado)

Estado del drawer:
```typescript
type DrawerState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; transaction: TransactionModel & { category: CategoryModel; account: AccountModel } }
```

### Refresh de lista

`router.refresh()` de `next/navigation` después de cada mutación exitosa. Re-ejecuta el Server Component y actualiza la lista sin recargar la página.

### Server Actions

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| `createTransaction` | `src/server/actions/transactions/create-transaction.ts` | Crea TX + ajusta balance en `prisma.$transaction` |
| `updateTransaction` | `src/server/actions/transactions/update-transaction.ts` | Revierte balance anterior + aplica nuevo en `prisma.$transaction` |
| `deleteTransaction` | `src/server/actions/transactions/extract-transaction.ts` | Ya existe — reutilizar |

---

## Sección 3 — Formulario y Validación

| Campo | Tipo | Validación |
|-------|------|-----------|
| `tipo` | `'INCOME' \| 'EXPENSE' \| 'TRANSFER'` | requerido |
| `monto` | número entero > 0 (pesos COP) | requerido, SA multiplica ×100 |
| `accountId` | string | requerido |
| `categoryId` | string | requerido |
| `fecha` | string ISO date | requerido, default hoy |
| `descripcion` | string max 120 | opcional |

### Actualización de balance (atómica con `prisma.$transaction`)

| Operación | Efecto en balance |
|-----------|------------------|
| Crear INCOME | `balance += monto` |
| Crear EXPENSE | `balance -= monto` |
| Crear TRANSFER | sin cambio |
| Editar | revertir efecto anterior → aplicar nuevo efecto |
| Eliminar | revertir efecto de la transacción eliminada |

`deleteTransaction` de RF-04 no actualiza balance — **extender** para que lo haga.

---

## Sección 4 — Archivos

### Nuevos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/(dashboard)/transacciones/page.tsx` | Server Component — carga TX, cuentas, categorías |
| `src/components/features/transactions/transaction-list.tsx` | Client Component — lista + FAB + estado del drawer |
| `src/components/features/transactions/transaction-drawer.tsx` | Client Component — formulario crear/editar |
| `src/server/actions/transactions/create-transaction.ts` | SA crear TX + ajustar balance |
| `src/server/actions/transactions/update-transaction.ts` | SA actualizar TX + ajustar balance |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `src/server/actions/transactions/extract-transaction.ts` | Extender `deleteTransaction` para revertir balance al eliminar |
| `src/components/layout/bottom-nav.tsx` | Activar tab Transacciones (cambiar `alert('Próximamente')` por `Link href="/transacciones"`) |

---

## Restricciones

- Montos siempre en centavos en DB (`monto * 100` al guardar, `/100` al mostrar)
- Error messages en español
- Auth check en cada Server Action antes de tocar la DB
- `prisma.$transaction` obligatorio para operaciones que tocan tanto `Transaction` como `Account.balance`
- Categorías filtradas por tipo en el formulario; resetear `categoryId` si el tipo cambia y hay incompatibilidad
