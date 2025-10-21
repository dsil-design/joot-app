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
import type { MonthlyTrendData } from '@/lib/utils/monthly-summary'
import { formatCurrency } from '@/lib/utils'

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[]
  height?: number
}

export function MonthlyTrendChart({ data, height = 300 }: MonthlyTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-zinc-50 rounded-lg border border-zinc-200"
      >
        <p className="text-sm text-zinc-400">No data available</p>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#71717a', fontSize: 12 }}
          tickLine={{ stroke: '#e4e4e7' }}
        />
        <YAxis
          tick={{ fill: '#71717a', fontSize: 12 }}
          tickLine={{ stroke: '#e4e4e7' }}
          tickFormatter={(value) => {
            if (value >= 1000) {
              return `$${(value / 1000).toFixed(1)}k`
            }
            return formatCurrency(value, 'USD')
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [formatCurrency(value, 'USD'), '']}
          labelStyle={{ color: '#18181b', fontWeight: 500 }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ fill: '#16a34a', r: 3 }}
          activeDot={{ r: 5 }}
          name="Income"
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="#dc2626"
          strokeWidth={2}
          dot={{ fill: '#dc2626', r: 3 }}
          activeDot={{ r: 5 }}
          name="Expenses"
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 3 }}
          activeDot={{ r: 5 }}
          name="Net"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
