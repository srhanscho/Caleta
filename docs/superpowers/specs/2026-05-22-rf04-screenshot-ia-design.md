# RF-04 Screenshots + IA — Spec de Diseño
**Fecha:** 2026-05-22
**Estado:** Aprobado por usuario

---

## Resumen

El usuario sube una foto de un comprobante (Nequi, Daviplata, Bancolombia, Nubank, PSE) desde la app. Un Server Action recibe la imagen, la envía a Claude via `generateObject`, extrae los datos de la transacción, sube la imagen a Supabase Storage, y guarda la transacción en DB. El cliente muestra un toast "Transacción guardada · Deshacer" con 5 segundos para revertir.

---

## Sección 1 — UI Flow (aprobada en sesión anterior)

El tab central del bottom nav (`/scan`) tiene 3 estados secuenciales:

**Estado 1 — Selección de cuenta**
Chips horizontales con las cuentas activas del usuario. El usuario toca una para seleccionarla (resaltada). Solo puede continuar con una cuenta seleccionada.

**Estado 2 — Captura de imagen**
`<input type="file" accept="image/*" capture="environment" />` con preview de la imagen seleccionada y botón "Analizar".

**Estado 3 — Procesando**
Spinner con texto "Analizando comprobante..." → al completar, toast "Transacción guardada · Deshacer" (5 segundos) → reset a Estado 1.

---

## Sección 2 — Data Flow

Arquitectura: **Todo en Server Action via FormData** (sin API route, sin upload desde cliente).

```
[Cliente]
  FormData { file: File, accountId: string }
        ↓
[Server Action: extractTransaction]
  1. Leer buffer del archivo
  2. Convertir a base64 → generateObject con Claude
  3. Subir buffer a Supabase Storage (bucket: screenshots, path: {userId}/{Date.now()}.{ext})
  4. Crear Transaction en DB con sourceImageUrl + confidenceScore
  5. return { success: true, data: transaction }
        ↓
[Cliente]
  Toast "Transacción guardada · Deshacer" por 5 segundos
  Si undo → llamar SA deleteTransaction(id)
  Reset a Estado 1
```

**Por qué esta opción:** una sola llamada del cliente, no quedan imágenes huérfanas en storage si falla el análisis, consistente con el patrón SA del proyecto.

---

## Sección 3 — Extracción IA

### Schema Zod

```typescript
const ExtractionSchema = z.object({
  legible: z.boolean(),
  monto: z.number().positive(),       // pesos COP entero; SA multiplica ×100 para centavos
  tipo: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  fecha: z.string(),                  // ISO 8601
  descripcion: z.string().max(120),
  categoriaSugerida: z.string(),      // nombre exacto de la lista pasada al prompt
  confidenceScore: z.number().min(0).max(1),
})
```

### Prompt

El SA consulta categorías del usuario (sistema + propias) antes de llamar a Claude y las incluye en el prompt:

```
Eres un asistente de finanzas personales para colombianos.
Analiza este comprobante de pago y extrae la información de la transacción.

Categorías disponibles: [lista de nombres separados por coma]
Fecha actual: [YYYY-MM-DD] — úsala si el comprobante no muestra año.

Reglas:
- monto: solo el valor transferido/pagado, sin puntos de miles ni símbolos (15500 no $15.500)
- tipo: INCOME si recibes dinero, EXPENSE si lo envías/pagas, TRANSFER entre tus propias cuentas
- fecha: en formato ISO 8601 completo
- categoriaSugerida: debe ser exactamente uno de los nombres de la lista anterior
- si la imagen no es un comprobante financiero legible, devuelve legible: false
- confidenceScore: certeza de la extracción de 0.0 a 1.0
```

### Asignación de categoría

El SA hace `prisma.category.findFirst({ where: { nombre: categoriaSugerida, OR: [{ userId }, { userId: null }] } })`. Si no encuentra match, usa la categoría "Otro" como fallback.

### Manejo de errores

| Caso | Comportamiento |
|------|----------------|
| `legible: false` | `return { success: false, error: "No se pudo leer el comprobante. Intenta con mejor iluminación." }` |
| `confidenceScore < 0.6` | Guarda la transacción normalmente; el confidenceScore queda en DB para uso futuro |
| Error de Claude API | `catch` → `return { success: false, error: "Error al analizar la imagen. Intenta de nuevo." }` |
| Categoría sugerida no encontrada | Fallback a categoría "Otro" del sistema |

---

## Sección 4 — Archivos

### Nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/app/(dashboard)/scan/page.tsx` | Ruta `/scan` — Server Component que carga cuentas activas y renderiza `ScreenshotUpload` |
| `src/components/features/transactions/screenshot-upload.tsx` | `"use client"` — máquina de estados (cuenta → imagen → procesando) |
| `src/server/actions/transactions/extract-transaction.ts` | SA principal — FormData → Claude → Supabase Storage → Prisma; incluye `deleteTransaction(id)` para el undo |
| `src/lib/ai/extract-transaction.ts` | Schema Zod + función `extractFromImage(base64, mimeType, categories)` |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/bottom-nav.tsx` | 4 tabs → 5 tabs; tab central con ícono `Camera` de lucide, sin label, `bg-primary rounded-full` |

### Configuración Supabase (manual, fuera del código)

Crear bucket `screenshots` en el panel de Supabase. Configurar como privado — el SA usa el cliente server con privilegios de servicio. No se necesitan URLs públicas.

---

## Restricciones

- Formatos de imagen aceptados: `image/*` (JPEG, PNG, WEBP, HEIC)
- Tamaño máximo recomendado: no se valida en MVP, Claude soporta hasta ~5MB en base64
- La transacción se guarda siempre que `legible: true`, independientemente del `confidenceScore`
- Error messages en español (regla del proyecto)
- El bucket de Supabase Storage debe estar creado antes de desplegar
