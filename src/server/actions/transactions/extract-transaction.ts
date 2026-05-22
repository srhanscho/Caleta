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
