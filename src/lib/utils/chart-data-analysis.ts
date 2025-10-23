import type { TrendDataPoint } from '@/components/ui/trend-chart-card'

export interface OutlierInfo {
  date: string
  value: number
  type: 'income' | 'expenses' | 'net'
  percentAboveAverage: number
  isExtreme: boolean // >300% above average
}

export interface ChartDataAnalysis {
  outliers: OutlierInfo[]
  hasExtremeOutliers: boolean
  suggestedYAxisMax: number
  averageIncome: number
  averageExpenses: number
  averageNet: number
  percentile95Income: number
  percentile95Expenses: number
}

/**
 * Calculate percentile value from an array of numbers
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Analyze chart data to detect outliers and calculate statistics
 */
export function analyzeChartData(data: TrendDataPoint[]): ChartDataAnalysis {
  if (data.length === 0) {
    return {
      outliers: [],
      hasExtremeOutliers: false,
      suggestedYAxisMax: 0,
      averageIncome: 0,
      averageExpenses: 0,
      averageNet: 0,
      percentile95Income: 0,
      percentile95Expenses: 0,
    }
  }

  // Calculate averages
  const totalIncome = data.reduce((sum, d) => sum + d.income, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0)
  const totalNet = data.reduce((sum, d) => sum + d.net, 0)

  const averageIncome = totalIncome / data.length
  const averageExpenses = totalExpenses / data.length
  const averageNet = totalNet / data.length

  // Calculate 95th percentiles
  const incomeValues = data.map(d => d.income)
  const expenseValues = data.map(d => d.expenses)

  const percentile95Income = calculatePercentile(incomeValues, 95)
  const percentile95Expenses = calculatePercentile(expenseValues, 95)

  // Detect outliers (>150% above average)
  const outliers: OutlierInfo[] = []

  data.forEach(point => {
    // Check income outliers
    if (point.income > averageIncome * 1.5) {
      outliers.push({
        date: point.date,
        value: point.income,
        type: 'income',
        percentAboveAverage: ((point.income / averageIncome - 1) * 100),
        isExtreme: point.income > averageIncome * 3,
      })
    }

    // Check expense outliers
    if (point.expenses > averageExpenses * 1.5) {
      outliers.push({
        date: point.date,
        value: point.expenses,
        type: 'expenses',
        percentAboveAverage: ((point.expenses / averageExpenses - 1) * 100),
        isExtreme: point.expenses > averageExpenses * 3,
      })
    }
  })

  const hasExtremeOutliers = outliers.some(o => o.isExtreme)

  // Suggest Y-axis max based on 95th percentile
  // Add 10% padding for visual breathing room
  const suggestedYAxisMax = Math.max(percentile95Income, percentile95Expenses) * 1.1

  return {
    outliers,
    hasExtremeOutliers,
    suggestedYAxisMax,
    averageIncome,
    averageExpenses,
    averageNet,
    percentile95Income,
    percentile95Expenses,
  }
}

/**
 * Filter outliers from chart data
 */
export function filterOutliers(
  data: TrendDataPoint[],
  analysis: ChartDataAnalysis
): TrendDataPoint[] {
  if (!analysis.hasExtremeOutliers) return data

  const extremeOutlierDates = new Set(
    analysis.outliers.filter(o => o.isExtreme).map(o => o.date)
  )

  return data.filter(point => !extremeOutlierDates.has(point.date))
}
