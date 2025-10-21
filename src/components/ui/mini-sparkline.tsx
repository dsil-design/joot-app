'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { DailySpend } from '@/lib/utils/monthly-summary'

interface MiniSparklineProps {
  data: DailySpend[]
  color?: string
  height?: number
}

export function MiniSparkline({ data, color = '#ef4444', height = 32 }: MiniSparklineProps) {
  if (!data || data.length === 0) {
    return <div style={{ height }} className="bg-zinc-100 rounded" />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="amount"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
