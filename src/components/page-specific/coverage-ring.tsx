'use client'

interface CoverageRingProps {
  percentage: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeConfig = {
  sm: { px: 48, stroke: 4, fontSize: 'text-xs' },
  md: { px: 80, stroke: 5, fontSize: 'text-base' },
  lg: { px: 120, stroke: 6, fontSize: 'text-xl' },
} as const

export function CoverageRing({ percentage, size = 'md' }: CoverageRingProps) {
  const { px, stroke, fontSize } = sizeConfig[size]
  const radius = (px - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: px, height: px }}>
      <svg width={px} height={px} className="-rotate-90">
        {/* Track */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200"
        />
        {/* Fill */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-green-500 dark:text-green-400 transition-all duration-500"
        />
      </svg>
      <span className={`absolute font-semibold ${fontSize}`}>
        {percentage}%
      </span>
    </div>
  )
}
