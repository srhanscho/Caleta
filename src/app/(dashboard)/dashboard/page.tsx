import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { BalanceHero } from '@/components/features/dashboard/balance-hero'
import { SpendingChart } from '@/components/features/dashboard/spending-chart'
import { AccountsRow } from '@/components/features/dashboard/accounts-row'
import { RecentTransactions } from '@/components/features/dashboard/recent-transactions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) redirect('/login')

  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })

  if (!prismaUser) redirect('/login')

  const userId = prismaUser.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [balanceAgg, incomeAgg, expensesAgg, accounts, recentTransactions, expenseTxs] =
    await Promise.all([
      prisma.account.aggregate({
        where: { userId, activa: true },
        _sum: { balance: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, tipo: 'INCOME', fecha: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { monto: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, tipo: 'EXPENSE', fecha: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { monto: true },
      }),
      prisma.account.findMany({
        where: { userId, activa: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.transaction.findMany({
        where: { userId },
        include: { category: true, account: true },
        orderBy: { fecha: 'desc' },
        take: 5,
      }),
      prisma.transaction.findMany({
        where: { userId, tipo: 'EXPENSE', fecha: { gte: startOfMonth, lte: endOfMonth } },
        select: { fecha: true, monto: true },
        orderBy: { fecha: 'asc' },
      }),
    ])

  const totalBalance = balanceAgg._sum.balance ?? 0
  const monthlyIncome = incomeAgg._sum.monto ?? 0
  const monthlyExpenses = expensesAgg._sum.monto ?? 0

  const daysInMonth = endOfMonth.getDate()
  const dailyTotals = new Map<number, number>()
  for (const tx of expenseTxs) {
    const day = tx.fecha.getDate()
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + tx.monto)
  }
  const chartData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    total: dailyTotals.get(i + 1) ?? 0,
  }))

  const monthLabel = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const userInitial = (prismaUser.name ?? prismaUser.email).charAt(0).toUpperCase()

  return (
    <main className="pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Image src="/logo-icon.png" alt="Caleta" width={28} height={28} priority />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          aria-label={`Perfil de ${prismaUser.name ?? prismaUser.email}`}
        >
          {userInitial}
        </div>
      </header>

      <BalanceHero
        totalBalance={totalBalance}
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
      />
      <SpendingChart data={chartData} monthLabel={monthLabel} />
      <AccountsRow accounts={accounts} />
      <RecentTransactions transactions={recentTransactions} />
    </main>
  )
}
