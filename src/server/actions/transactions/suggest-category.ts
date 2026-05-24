'use server'

import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { anthropic, SUGGEST_MODEL } from '@/lib/ai'
import type { ActionResult } from '@/types'
import type { TransactionType } from '@/generated/prisma'

type SuggestionResult = { categoryId: string; nombre: string }

export async function suggestCategory(
  descripcion: string,
  tipo: TransactionType
): Promise<ActionResult<SuggestionResult>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

    // TRANSFER no tiene categoría sugerida
    if (tipo === 'TRANSFER') return { success: false, error: 'Las transferencias no tienen categoría' }

    const tipoCategoria = tipo === 'INCOME' ? 'INCOME' : 'EXPENSE'
    const categories = await prisma.category.findMany({
      where: {
        tipo: tipoCategoria,
        OR: [{ userId: null }, { userId: prismaUser.id }],
      },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    })

    if (categories.length === 0)
      return { success: false, error: 'No hay categorías disponibles' }

    const { object } = await generateObject({
      model: anthropic(SUGGEST_MODEL),
      schema: z.object({
        categoryId: z.string().describe('El ID exacto de la categoría más apropiada'),
      }),
      prompt: `Eres un asistente de finanzas personales para usuarios colombianos. Tu tarea es clasificar una transacción en la categoría más apropiada.

Categorías disponibles (tipo: ${tipoCategoria}):
${categories.map((c) => `- ID: "${c.id}" | Nombre: "${c.nombre}"`).join('\n')}

Transacción a clasificar:
- Descripción: "${descripcion}"
- Tipo: ${tipo === 'INCOME' ? 'Ingreso' : 'Gasto'}

Responde con el ID exacto de la categoría más apropiada. Si ninguna encaja bien, elige la más genérica disponible.`,
    })

    const matched = categories.find((c) => c.id === object.categoryId)
    if (!matched) return { success: false, error: 'No se pudo determinar la categoría' }

    return { success: true, data: { categoryId: matched.id, nombre: matched.nombre } }
  } catch {
    return { success: false, error: 'Error al sugerir categoría' }
  }
}
