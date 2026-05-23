'use client'

import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCOP } from '@/lib/format'

type DayData = {
  day: number
  total: number
}

type Props = {
  data: DayData[]
  monthLabel: string
}

export function SpendingChart({ data, monthLabel }: Props) {
  return (
    <section className="px-6 py-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Gasto acumulado</p>
        <span className="text-xs text-muted-foreground capitalize">{monthLabel}</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.58 0.25 265)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="oklch(0.58 0.25 265)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: 'oklch(0.60 0.02 265)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip
            contentStyle={{
              background: 'oklch(0.13 0.035 265)',
              border: '1px solid oklch(0.20 0.035 265)',
              borderRadius: '0.5rem',
              fontSize: '12px',
              color: 'oklch(0.95 0.01 265)',
            }}
            formatter={(value) => [formatCOP(Number(value)), 'Acumulado']}
            labelFormatter={(label) => `Día ${label}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="oklch(0.58 0.25 265)"
            strokeWidth={2}
            fill="url(#spendGradient)"
            dot={false}
            activeDot={{ r: 4, fill: 'oklch(0.58 0.25 265)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  )
}
