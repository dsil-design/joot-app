'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import type { TopVendor } from '@/lib/utils/monthly-summary'
import { formatCurrency } from '@/lib/utils'

interface TopVendorsWidgetProps {
  vendors: TopVendor[]
  height?: number
  timeframeLabel?: string
}

// Color palette for vendor bars
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16']

export function TopVendorsWidget({ vendors, height = 250, timeframeLabel = 'Year to Date' }: TopVendorsWidgetProps) {
  if (!vendors || vendors.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-muted rounded-lg border border-border"
      >
        <p className="text-sm text-muted-foreground">No vendor data available</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Summary Stats */}
      <div className="mb-4 text-[12px] text-muted-foreground">
        Showing top {vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'} for {timeframeLabel.toLowerCase()}
      </div>

      {/* Vendor List with Progress Bars */}
      <div className="space-y-4">
        {vendors.map((vendor, index) => (
          <div key={vendor.vendorId || index} className="space-y-1">
            {/* Vendor Name and Amount */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-[14px] font-medium text-foreground">
                  {vendor.vendorName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-foreground">
                  {formatCurrency(vendor.totalAmount, 'USD')}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  ({vendor.percentOfTotal.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${vendor.percentOfTotal}%`,
                  backgroundColor: COLORS[index % COLORS.length]
                }}
              />
            </div>

            {/* Transaction Count */}
            <div className="text-[12px] text-muted-foreground">
              {vendor.transactionCount} {vendor.transactionCount === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
