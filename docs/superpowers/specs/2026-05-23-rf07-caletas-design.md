# RF-07 — Caletas (metas de ahorro)

**Fecha:** 2026-05-23  
**Estado:** Aprobado para implementación

---

## Resumen

Pantalla `/caletas` donde el usuario crea metas de ahorro ("caletas"), ve su progreso y registra aportes. Diseño basado en el prototipo visual `screens.jsx` del usuario.

---

## Sección 1 — UI/UX

### Página `/caletas`

- **Header:** título "Mis caletas" (Nunito/display, 22px bold) + botón primario pequeño "Nueva" a la derecha
- **Glass card — resumen:** total ahorrado en todas las caletas + "de $X meta total" (muted)
- **Lista de CaletaCard:** una por caleta activa, orden por `createdAt` desc
- **Estado vacío:** mensaje "Aún no tienes caletas. ¡Crea tu primera!" + botón CTA

### CaletaCard

- Emoji en caja 42×42 redondeada (`bg: rgba(255,255,255,0.04)`)
- Nombre (fontWeight 600) + "X% completo" (muted, 12px)
- Chevron derecho
- Barra de progreso: 8px alto, fondo `rgba(255,255,255,0.05)`, fill con `color` de la caleta
- Fila inferior: monto ahorrado (bold) + "de $objetivo" (muted)
- Al tocar → abre `CaletaDrawer` en modo detalle/aporte

### CaletaDrawer — Crear (mode: 'create')

Campos:
1. **Nombre** — text input, requerido, max 60 chars
2. **Emoji** — input de texto libre (el usuario escribe o pega un emoji), default "🐷"
3. **Color** — paleta de 6 colores preset: `#00E88F`, `#3B35FF`, `#FFB84D`, `#FF4D6A`, `#7AB8FF`, `#C49BFF`
4. **Monto objetivo** — número en pesos COP (SA convierte ×100 a centavos), requerido, min $1.000
5. **Fecha objetivo** — date picker, opcional
6. **Descripción** — text opcional, max 120 chars

Botón: "Crear caleta" → llama SA `createCaleta`.

### CaletaDrawer — Detalle/Aporte (mode: 'detail')

- Header: emoji + nombre + "X% completo"
- Barra de progreso grande (12px)
- Monto ahorrado / objetivo
- Lista de últimos 5 aportes (monto + nota + fecha)
- Botón primario "Abonar" → transiciona a mode: 'deposit' dentro del mismo drawer

### CaletaDrawer — Aporte (mode: 'deposit')

Campos:
1. **Monto** — número en pesos COP, requerido, min $100
2. **Nota** — text opcional, max 80 chars

Botón: "Abonar" → llama SA `createCaletaDeposit`.

Post-aporte: toast "Aporte registrado ✓", actualiza `montoActual` y recarga lista.

---

## Sección 2 — Arquitectura y datos

### Schema (ya existe en Prisma — no requiere migración)

```prisma
model Caleta {
  id            String    @id @default(cuid())
  userId        String
  nombre        String
  montoObjetivo Int       // centavos COP
  montoActual   Int       @default(0)
  fechaObjetivo DateTime?
  descripcion   String?
  completada    Boolean   @default(false)
  color         String    @default("#0F766E")
  icono         String    @default("piggy-bank")  // usamos campo para emoji
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deposits      CaletaDeposit[]
}

model CaletaDeposit {
  id            String   @id @default(cuid())
  caletaId      String
  monto         Int      // centavos COP
  nota          String?
  transactionId String?  // sin usar en RF-07
  createdAt     DateTime @default(now())
}
```

> El campo `icono` almacena el emoji directamente (string). El default actual "piggy-bank" se ignora para caletas nuevas — siempre se pide al usuario.

### Server Actions

| Archivo | Función | Descripción |
|---------|---------|-------------|
| `caletas/get-caletas.ts` | `getCaletas()` | Fetch de todas las caletas del usuario con últimos 5 aportes |
| `caletas/create-caleta.ts` | `createCaleta(input)` | Crea caleta, valida sesión |
| `caletas/create-caleta-deposit.ts` | `createCaletaDeposit(caletaId, monto, nota?)` | Crea depósito, actualiza `montoActual` y `completada` atómicamente en transacción Prisma |
| `caletas/delete-caleta.ts` | `deleteCaleta(caletaId)` | Elimina caleta con confirmación (cascade deposits) |

`createCaletaDeposit` usa `prisma.$transaction([...])` para:
1. Crear `CaletaDeposit`
2. Incrementar `montoActual` en la caleta
3. Marcar `completada = true` si `montoActual >= montoObjetivo`

### Flujo de datos

```
/caletas (Server Component)
  → getCaletas() [SA — server-side fetch]
  → <CaletasClient caletas={...} /> [Client Component]
      → <CaletaCard /> × N
      → <CaletaDrawer /> (create | detail | deposit)
```

La página es un Server Component que pre-fetcha las caletas. El Client Component maneja el estado del drawer y se refresca con `router.refresh()` tras cada mutación.

---

## Sección 3 — Archivos a crear/modificar

### Crear

```
src/
  app/(dashboard)/caletas/
    page.tsx                          # Server Component, fetch + render
  components/features/caletas/
    caletas-client.tsx                # Client wrapper con estado drawer
    caleta-card.tsx                   # Componente de tarjeta
    caleta-drawer.tsx                 # Drawer create | detail | deposit
  server/actions/caletas/
    get-caletas.ts
    create-caleta.ts
    create-caleta-deposit.ts
    delete-caleta.ts
```

### Modificar

```
src/components/layout/bottom-nav.tsx  # Quitar isPlaceholder check para /caletas
```

---

## Sección 4 — Casos edge

- **Aporte mayor al restante:** permitido, `montoActual` puede superar `montoObjetivo`; `completada` se marca en `true`, card muestra "¡Meta cumplida! 🎉" y barra al 100% sin overflow visual
- **Sin cuentas:** Caletas no requieren cuenta — los aportes son registros independientes (sin `transactionId` en RF-07)
- **Caleta vacía (montoActual = 0):** barra de progreso al 0% — no mostrar "0%", mostrar "Sin aportes aún"
- **Delete:** solo en modo detalle, confirmar antes (patrón igual al TransactionDrawer)
