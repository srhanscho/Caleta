import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { TransactionList } from '@/components/features/transactions/transaction-list'

export default async function TransaccionesPage() {
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()
  if (!supabaseUser) redirect('/login')

  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })
  if (!prismaUser) redirect('/login')

  const [transactions, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: prismaUser.id },
      include: { category: true, account: true },
      orderBy: { fecha: 'desc' },
    }),
    prisma.account.findMany({
      where: { userId: prismaUser.id, activa: true },
      select: { id: true, nombre: true, tipo: true, color: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId: prismaUser.id }, { userId: null }] },
      select: { id: true, nombre: true, tipo: true },
      orderBy: { nombre: 'asc' },
    }),
  ])

  return (
    <main className="pb-24 px-4 pt-6">
      <h1 className="text-xl font-semibold text-foreground mb-4 px-2">
        Transacciones
      </h1>
      <TransactionList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
      />
    </main>
  )
}
