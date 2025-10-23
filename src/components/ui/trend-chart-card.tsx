'use client'

import * as React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import { TimePeriodToggle, type TimePeriod } from '@/components/ui/time-period-toggle'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface TrendDataPoint {
  date: string
  income: number
  expenses: number
  net: number
}

interface TrendChartCardProps {
  // Support both old and new API for backward compatibility
  dataByPeriod?: Record<TimePeriod, TrendDataPoint[]>
  data?: TrendDataPoint[] // Legacy prop - will be ignored if dataByPeriod is provided
  title?: string
  subtitle?: string
  defaultPeriod?: TimePeriod
  height?: number
  className?: string
  onPeriodChange?: (period: TimePeriod) => void
}

interface LegendItem {
  value: string
  color: string
  label: string
  visible: boolean
}

export function TrendChartCard({
  dataByPeriod,
  data,
  title = 'Financial Performance',
  subtitle,
  defaultPeriod = 'ytd',
  height = 300,
  className,
  onPeriodChange,
}: TrendChartCardProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<TimePeriod>(defaultPeriod)
  const [hoveredLine, setHoveredLine] = React.useState<string | null>(null)
  const [visibleLines, setVisibleLines] = React.useState<Record<string, boolean>>({
    income: true,
    expenses: true,
    net: true,
  })

  const handlePeriodChange = React.useCallback(
    (period: TimePeriod) => {
      setSelectedPeriod(period)
      onPeriodChange?.(period)
    },
    [onPeriodChange]
  )

  const toggleLineVisibility = React.useCallback((lineKey: string) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }))
  }, [])

  // Get data for the selected period
  // If dataByPeriod is provided, use it (new API - pre-calculated server-side)
  // Otherwise fall back to legacy data prop (old API - shows all data without period filtering)
  const currentData = React.useMemo(() => {
    if (dataByPeriod) {
      return dataByPeriod[selectedPeriod] || []
    }
    // Legacy mode: just return all data regardless of selected period
    return data || []
  }, [dataByPeriod, data, selectedPeriod])

  // Detect breakpoint for responsive design
  const [breakpoint, setBreakpoint] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 768) setBreakpoint('mobile')
      else if (width < 1024) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate adaptive X-axis label interval
  const xAxisInterval = React.useMemo(() => {
    const dataLength = currentData.length

    if (breakpoint === 'mobile') {
      // Mobile: show 4-6 labels max
      return Math.ceil(dataLength / 5)
    }

    if (breakpoint === 'tablet') {
      // Tablet: show 6-8 labels
      return Math.ceil(dataLength / 7)
    }

    // Desktop: adaptive based on time period
    if (selectedPeriod === 'all' && dataLength > 60) {
      return 12 // Show yearly labels
    } else if (selectedPeriod === '5y') {
      return 6 // Show semi-annual labels
    } else if (['2y', '3y'].includes(selectedPeriod)) {
      return 3 // Show quarterly labels
    }

    return 0 // Show all labels for YTD and 1Y
  }, [currentData.length, breakpoint, selectedPeriod])

  // Calculate Y-axis domain - simple auto scaling
  const yAxisDomain = React.useMemo(() => {
    return [0, 'auto'] as const
  }, [])

  // Custom tooltip component - memoized to prevent recreation
  const CustomTooltip = React.useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg backdrop-blur-sm">
        <div className="mb-2 text-xs font-semibold text-foreground">{label}</div>
        <div className="space-y-1.5">
          {payload.map((entry: any) => {
            if (!visibleLines[entry.dataKey]) return null

            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs font-medium text-muted-foreground capitalize">
                    {entry.dataKey}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(entry.value, 'USD')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [visibleLines])

  // Custom legend component - memoized to prevent recreation
  const CustomLegend = React.useCallback(() => {
    const legendItems: LegendItem[] = [
      { value: 'income', color: '#00a63e', label: 'Income', visible: visibleLines.income },
      { value: 'expenses', color: '#e7000b', label: 'Expenses', visible: visibleLines.expenses },
      { value: 'net', color: '#155dfc', label: 'Net', visible: visibleLines.net },
    ]

    return (
      <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
        {legendItems.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={item.visible}
            aria-label={`Toggle ${item.label} line visibility`}
            onClick={() => toggleLineVisibility(item.value)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 transition-all duration-150',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              !item.visible && 'opacity-50'
            )}
          >
            <div
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span
              className={cn(
                'text-xs font-medium text-foreground',
                !item.visible && 'line-through'
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    )
  }, [visibleLines, toggleLineVisibility])

  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {subtitle && (
          <div className="text-xs font-normal text-muted-foreground">{subtitle}</div>
        )}
        {/* Only show time period toggle if dataByPeriod is provided */}
        {dataByPeriod && (
          <CardAction>
            <TimePeriodToggle value={selectedPeriod} onChange={handlePeriodChange} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {!currentData || currentData.length === 0 ? (
          <div
            style={{ height }}
            className="flex items-center justify-center rounded-lg bg-muted"
          >
            <p className="text-sm text-muted-foreground">No data available for this period</p>
          </div>
        ) : (
        <div style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={currentData}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 5,
            }}
            onMouseMove={(state: any) => {
              if (state?.isTooltipActive && state?.activePayload) {
                // Determine which line is being hovered based on proximity
                if (state.activePayload.length > 0) {
                  setHoveredLine(state.activePayload[0].dataKey)
                }
              } else {
                setHoveredLine(null)
              }
            }}
            onMouseLeave={() => setHoveredLine(null)}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00a63e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00a63e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e7000b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#e7000b" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#155dfc" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#155dfc" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis
              dataKey="date"
              interval={xAxisInterval}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: breakpoint === 'mobile' ? 10 : 12 }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              angle={breakpoint === 'mobile' ? -45 : 0}
              textAnchor={breakpoint === 'mobile' ? 'end' : 'middle'}
              height={breakpoint === 'mobile' ? 60 : 30}
            />
            <YAxis
              domain={yAxisDomain}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `$${(value / 1000).toFixed(1)}k`
                }
                return formatCurrency(value, 'USD')
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />

            {/* Income Area */}
            {visibleLines.income && (
              <Area
                type="monotone"
                dataKey="income"
                stroke="#00a63e"
                strokeWidth={hoveredLine === 'income' ? 3.5 : 2.5}
                fill="url(#incomeGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#00a63e' }}
                opacity={hoveredLine === null || hoveredLine === 'income' ? 1 : 0.3}
                isAnimationActive={false}
              />
            )}

            {/* Expenses Area */}
            {visibleLines.expenses && (
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#e7000b"
                strokeWidth={hoveredLine === 'expenses' ? 3.5 : 2.5}
                fill="url(#expensesGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#e7000b' }}
                opacity={hoveredLine === null || hoveredLine === 'expenses' ? 1 : 0.3}
                isAnimationActive={false}
              />
            )}

            {/* Net Area */}
            {visibleLines.net && (
              <Area
                type="monotone"
                dataKey="net"
                stroke="#155dfc"
                strokeWidth={hoveredLine === 'net' ? 3.5 : 2.5}
                fill="url(#netGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#155dfc' }}
                strokeDasharray="5 5"
                opacity={hoveredLine === null || hoveredLine === 'net' ? 1 : 0.3}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        </div>
        )}
      </CardContent>
      <CustomLegend />
    </Card>
  )
}
