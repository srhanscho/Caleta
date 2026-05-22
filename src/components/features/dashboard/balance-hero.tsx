import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCOP } from '@/lib/format'

type Props = {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
}

export function BalanceHero({ totalBalance, monthlyIncome, monthlyExpenses }: Props) {
  return (
    <section className="bg-card px-6 py-8 space-y-4">
      <p className="text-sm text-muted-foreground">Balance total</p>
      <p className="text-3xl font-bold text-foreground">{formatCOP(totalBalance)}</p>
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} aria-hidden="true" />
          <span className="text-sm text-foreground">{formatCOP(monthlyIncome)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDownRight className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <span className="text-sm text-foreground">{formatCOP(monthlyExpenses)}</span>
        </div>
      </div>
    </section>
  )
}
