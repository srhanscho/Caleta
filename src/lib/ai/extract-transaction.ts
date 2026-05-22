import { generateObject } from 'ai'
import { z } from 'zod'
import { google, DEFAULT_MODEL } from '@/lib/ai/index'

const ExtractionSchema = z.object({
  legible: z.boolean(),
  monto: z.number().min(0),
  tipo: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  fecha: z.string(),
  descripcion: z.string().max(120),
  categoriaSugerida: z.string(),
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
    model: google(DEFAULT_MODEL),
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
