import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface ComparisonMetricProps {
  value: number
  changeDirection: 'up' | 'down' | 'neutral'
  changePercent: number
  label: string
  variant?: 'default' | 'inverse' // For expenses, 'up' is bad (red), for income, 'up' is good (green)
}

export function ComparisonMetric({
  value,
  changeDirection,
  changePercent,
  label,
  variant = 'default'
}: ComparisonMetricProps) {
  // Determine color based on direction and variant
  let colorClass = 'text-zinc-500'
  if (changeDirection !== 'neutral') {
    if (variant === 'default') {
      // Default: up is good (green), down is bad (red)
      colorClass = changeDirection === 'up' ? 'text-green-600' : 'text-red-600'
    } else {
      // Inverse: up is bad (red), down is good (green) - for expenses
      colorClass = changeDirection === 'up' ? 'text-red-600' : 'text-green-600'
    }
  }

  const Icon = changeDirection === 'up' ? ArrowUp : changeDirection === 'down' ? ArrowDown : Minus

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[12px] font-medium ${colorClass} flex items-center gap-0.5`}>
        <Icon className="size-3" />
        {Math.abs(changePercent).toFixed(1)}%
      </span>
      <span className="text-[12px] font-normal text-zinc-400">
        {label}
      </span>
    </div>
  )
}
