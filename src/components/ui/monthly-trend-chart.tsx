'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useTheme } from 'next-themes'
import type { MonthlyTrendData } from '@/lib/utils/monthly-summary'
import { formatCurrency } from '@/lib/utils'

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[]
  height?: number
}

const LIGHT = {
  grid: '#e4e4e7',
  tick: '#71717b',
  tooltipBg: '#ffffff',
  tooltipLabel: '#09090b',
  income: '#00a63e',
  expenses: '#e7000b',
  net: '#155dfc',
}

const DARK = {
  grid: '#3f3f46',
  tick: '#9f9fa9',
  tooltipBg: '#18181b',
  tooltipLabel: '#fafafa',
  income: '#00c951',
  expenses: '#fb2c36',
  net: '#2b7fff',
}

export function MonthlyTrendChart({ data, height = 300 }: MonthlyTrendChartProps) {
  const { resolvedTheme } = useTheme()
  const c = resolvedTheme === 'dark' ? DARK : LIGHT

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-muted rounded-lg border border-border"
      >
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 10,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis
          dataKey="month"
          tick={{ fill: c.tick, fontSize: 12 }}
          tickLine={{ stroke: c.grid }}
        />
        <YAxis
          tick={{ fill: c.tick, fontSize: 12 }}
          tickLine={{ stroke: c.grid }}
          tickFormatter={(value) => {
            if (value >= 1000) {
              return `$${(value / 1000).toFixed(1)}k`
            }
            return formatCurrency(value, 'USD')
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: c.tooltipBg,
            border: `1px solid ${c.grid}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [formatCurrency(value, 'USD'), '']}
          labelStyle={{ color: c.tooltipLabel, fontWeight: 500 }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke={c.income}
          strokeWidth={2}
          dot={{ fill: c.income, r: 3 }}
          activeDot={{ r: 5 }}
          name="Income"
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke={c.expenses}
          strokeWidth={2}
          dot={{ fill: c.expenses, r: 3 }}
          activeDot={{ r: 5 }}
          name="Expenses"
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke={c.net}
          strokeWidth={2}
          dot={{ fill: c.net, r: 3 }}
          activeDot={{ r: 5 }}
          name="Net"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
