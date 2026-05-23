'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { ActionResult } from '@/types'
import type { TransactionModel, TransactionType } from '@/generated/prisma'

type CreateInput = {
  tipo: TransactionType
  monto: number       // pesos COP — SA multiplica ×100
  accountId: string
  categoryId: string
  fecha: string       // YYYY-MM-DD
  descripcion?: string
}

export async function createTransaction(
  input: CreateInput
): Promise<ActionResult<TransactionModel>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

  if (input.monto <= 0) return { success: false, error: 'El monto debe ser mayor a 0' }

  const montoCentavos = Math.round(input.monto * 100)
  const balanceDelta =
    input.tipo === 'INCOME' ? montoCentavos : input.tipo === 'EXPENSE' ? -montoCentavos : 0

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: prismaUser.id,
          accountId: input.accountId,
          categoryId: input.categoryId,
          monto: montoCentavos,
          tipo: input.tipo,
          fecha: new Date(input.fecha),
          descripcion: input.descripcion ?? null,
        },
      })
      if (balanceDelta !== 0) {
        await tx.account.update({
          where: { id: input.accountId },
          data: { balance: { increment: balanceDelta } },
        })
      }
      return created
    })

    return { success: true, data: transaction }
  } catch {
    return { success: false, error: 'Error al guardar la transacción' }
  }
}
