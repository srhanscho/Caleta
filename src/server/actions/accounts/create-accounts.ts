'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, AccountType } from '@/types'

// Plain string union — el cliente envía strings, la action castea a AccountType internamente
type AccountInput = {
  tipo: string
  nombre: string
  balance: number // pesos COP enteros — se multiplica × 100 para guardar centavos
}

export async function createAccounts(
  accounts: AccountInput[]
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  if (accounts.length === 0) {
    return { success: true, data: undefined }
  }

  try {
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    })

    if (!prismaUser) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    await prisma.$transaction(
      accounts.map((a) =>
        prisma.account.create({
          data: {
            userId: prismaUser.id,
            tipo: a.tipo as AccountType,
            nombre: a.nombre,
            balance: a.balance * 100,
          },
        })
      )
    )

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al guardar las cuentas' }
  }
}
