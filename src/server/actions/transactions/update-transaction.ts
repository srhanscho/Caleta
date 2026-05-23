'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { ActionResult } from '@/types'
import type { TransactionModel, TransactionType } from '@/generated/prisma'

type UpdateInput = {
  tipo: TransactionType
  monto: number       // pesos COP — SA multiplica ×100
  accountId: string
  categoryId: string
  fecha: string       // YYYY-MM-DD
  descripcion?: string
}

function delta(tipo: TransactionType, montoCentavos: number): number {
  if (tipo === 'INCOME') return montoCentavos
  if (tipo === 'EXPENSE') return -montoCentavos
  return 0
}

export async function updateTransaction(
  id: string,
  input: UpdateInput
): Promise<ActionResult<TransactionModel>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!prismaUser) return { success: false, error: 'Usuario no encontrado' }

  if (input.monto <= 0) return { success: false, error: 'El monto debe ser mayor a 0' }

  try {
    const old = await prisma.transaction.findUnique({
      where: { id, userId: prismaUser.id },
      select: { tipo: true, monto: true, accountId: true },
    })
    if (!old) return { success: false, error: 'Transacción no encontrada' }

    const newMontoCentavos = Math.round(input.monto * 100)
    const oldDelta = delta(old.tipo, old.monto)
    const newDelta = delta(input.tipo, newMontoCentavos)

    const transaction = await prisma.$transaction(async (tx) => {
      if (oldDelta !== 0) {
        await tx.account.update({
          where: { id: old.accountId },
          data: { balance: { increment: -oldDelta } },
        })
      }
      if (newDelta !== 0) {
        await tx.account.update({
          where: { id: input.accountId },
          data: { balance: { increment: newDelta } },
        })
      }
      return tx.transaction.update({
        where: { id },
        data: {
          accountId: input.accountId,
          categoryId: input.categoryId,
          monto: newMontoCentavos,
          tipo: input.tipo,
          fecha: new Date(input.fecha),
          descripcion: input.descripcion ?? null,
        },
      })
    })

    return { success: true, data: transaction }
  } catch {
    return { success: false, error: 'Error al actualizar la transacción' }
  }
}
