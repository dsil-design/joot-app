"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { format, addMonths, addWeeks, addDays } from "date-fns"
import { MoreVertical, Edit, Trash2, Calendar, Repeat } from "lucide-react"
import type { TransactionTemplate } from "@/lib/types/recurring-transactions"

export interface TemplateCardProps {
  template: TransactionTemplate
  onToggleActive?: (id: string, isActive: boolean) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

/**
 * Card component for transaction template display
 * Shows template details with active/inactive toggle and actions
 */
export function TemplateCard({
  template,
  onToggleActive,
  onEdit,
  onDelete,
  className,
}: TemplateCardProps) {
  const {
    id,
    name,
    vendor,
    amount,
    original_currency,
    transaction_type,
    frequency,
    is_active,
    start_date,
    payment_method,
    tags,
  } = template

  const currencySymbol = getCurrencySymbolSync(original_currency)
  const nextOccurrences = calculateNextOccurrences(template)

  return (
    <Card
      className={cn(
        "transition-all",
        is_active ? "border-zinc-200 hover:shadow-md" : "border-zinc-100 opacity-60",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Template Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm text-zinc-900 truncate">{name}</h3>
              <Badge
                variant={transaction_type === "expense" ? "destructive" : "default"}
                className="text-[10px] shrink-0"
              >
                {transaction_type}
              </Badge>
              {!is_active && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  Inactive
                </Badge>
              )}
            </div>
            {vendor && <p className="text-xs text-zinc-500">{vendor.name}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Active Toggle */}
            {onToggleActive && (
              <Switch
                checked={is_active}
                onCheckedChange={(checked) => onToggleActive(id, checked)}
                aria-label={is_active ? "Deactivate template" : "Activate template"}
              />
            )}

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(id)}>
                    <Edit className="size-4 mr-2" />
                    Edit Template
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(id)} className="text-red-600">
                    <Trash2 className="size-4 mr-2" />
                    Delete Template
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 space-y-3">
        {/* Amount */}
        <div>
          <span
            className={cn(
              "text-2xl font-semibold",
              transaction_type === "income" ? "text-green-600" : "text-red-600"
            )}
          >
            {currencySymbol}
            {amount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Frequency Info */}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Repeat className="size-3" />
          <span className="capitalize">{getFrequencyLabel(template)}</span>
        </div>

        {/* Payment Method & Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {payment_method && (
            <Badge variant="outline" className="text-xs">
              {payment_method.name}
            </Badge>
          )}
          {tags?.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs"
              style={{
                borderColor: tag.color,
                color: tag.color,
              }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>

        {/* Next Occurrences */}
        {is_active && nextOccurrences.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
              <Calendar className="size-3" />
              <span>Next occurrences:</span>
            </div>
            <div className="space-y-1">
              {nextOccurrences.map((date, index) => (
                <div key={index} className="text-xs text-zinc-700">
                  {format(date, "MMM d, yyyy")}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Get human-readable frequency label
 */
function getFrequencyLabel(template: TransactionTemplate): string {
  const { frequency, frequency_interval, day_of_month, day_of_week } = template

  switch (frequency) {
    case "monthly":
      return day_of_month ? `Monthly on day ${day_of_month}` : "Monthly"
    case "bi-weekly":
      return day_of_week !== null
        ? `Bi-weekly on ${getDayName(day_of_week)}`
        : "Bi-weekly"
    case "weekly":
      return day_of_week !== null ? `Weekly on ${getDayName(day_of_week)}` : "Weekly"
    case "quarterly":
      return day_of_month ? `Quarterly on day ${day_of_month}` : "Quarterly"
    case "annually":
      return day_of_month ? `Annually on day ${day_of_month}` : "Annually"
    case "custom":
      return `Every ${frequency_interval} days`
    default:
      return frequency
  }
}

/**
 * Get day name from day of week number
 */
function getDayName(dayOfWeek: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[dayOfWeek] || ""
}

/**
 * Calculate next 3 occurrences based on template settings
 */
function calculateNextOccurrences(template: TransactionTemplate): Date[] {
  const {
    frequency,
    frequency_interval,
    day_of_month,
    day_of_week,
    start_date,
    end_date,
  } = template

  const occurrences: Date[] = []
  let currentDate = new Date(start_date)
  const endDateTime = end_date ? new Date(end_date) : null

  for (let i = 0; i < 3; i++) {
    let nextDate: Date

    switch (frequency) {
      case "monthly":
        nextDate = addMonths(currentDate, i)
        if (day_of_month) {
          nextDate = new Date(
            nextDate.getFullYear(),
            nextDate.getMonth(),
            Math.min(day_of_month, getDaysInMonth(nextDate))
          )
        }
        break

      case "quarterly":
        nextDate = addMonths(currentDate, i * 3)
        if (day_of_month) {
          nextDate = new Date(
            nextDate.getFullYear(),
            nextDate.getMonth(),
            Math.min(day_of_month, getDaysInMonth(nextDate))
          )
        }
        break

      case "annually":
        nextDate = addMonths(currentDate, i * 12)
        if (day_of_month) {
          nextDate = new Date(
            nextDate.getFullYear(),
            nextDate.getMonth(),
            Math.min(day_of_month, getDaysInMonth(nextDate))
          )
        }
        break

      case "bi-weekly":
        nextDate = addWeeks(currentDate, i * 2)
        if (day_of_week !== null && day_of_week !== undefined) {
          nextDate = getNextDayOfWeek(nextDate, day_of_week)
        }
        break

      case "weekly":
        nextDate = addWeeks(currentDate, i)
        if (day_of_week !== null && day_of_week !== undefined) {
          nextDate = getNextDayOfWeek(nextDate, day_of_week)
        }
        break

      case "custom":
        nextDate = addDays(currentDate, i * frequency_interval)
        break

      default:
        nextDate = addMonths(currentDate, i)
    }

    // Check if within end date range
    if (endDateTime && nextDate > endDateTime) {
      break
    }

    // Only add future dates
    if (nextDate >= new Date()) {
      occurrences.push(nextDate)
    }
  }

  return occurrences.slice(0, 3)
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getNextDayOfWeek(date: Date, targetDayOfWeek: number): Date {
  const currentDayOfWeek = date.getDay()
  const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7
  return addDays(date, daysUntilTarget)
}
