'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Status card variants for the Import Dashboard
 * - pending: Amber - emails awaiting user review
 * - waiting: Blue - THB receipts waiting for USD statement match
 * - success: Green - successfully matched/imported transactions
 * - info: Gray - general information (future use)
 */
export type ImportStatusCardVariant = 'pending' | 'waiting' | 'success' | 'info'

export interface ImportStatusCardProps {
  /** Card title displayed in the header */
  title: string
  /** Numeric value to display - null indicates loading state */
  value: number | null
  /** Description text shown below the value */
  description: string
  /** Visual variant determining colors and icon */
  variant: ImportStatusCardVariant
  /** Navigation destination when card is clicked */
  href: string
  /** Optional custom icon (default based on variant) */
  icon?: React.ElementType
  /** Accessible label for screen readers */
  'aria-label'?: string
}

const variantConfig = {
  pending: {
    border: 'border-l-4 border-l-amber-500',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    bgHover: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
    focusRing: 'focus-within:ring-amber-500',
  },
  waiting: {
    border: 'border-l-4 border-l-blue-500',
    icon: Clock,
    iconColor: 'text-blue-500',
    bgHover: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
    focusRing: 'focus-within:ring-blue-500',
  },
  success: {
    border: 'border-l-4 border-l-green-500',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    bgHover: 'hover:bg-green-50/50 dark:hover:bg-green-950/20',
    focusRing: 'focus-within:ring-green-500',
  },
  info: {
    border: 'border-l-4 border-l-gray-400',
    icon: AlertCircle,
    iconColor: 'text-gray-400',
    bgHover: 'hover:bg-gray-50/50 dark:hover:bg-gray-950/20',
    focusRing: 'focus-within:ring-gray-500',
  },
} as const

/**
 * ImportStatusCard - Reusable status card component for the Import Dashboard
 *
 * Displays a count metric with icon, title, and description.
 * Clickable to navigate to filtered views.
 * Supports loading skeleton state when value is null.
 *
 * @example
 * ```tsx
 * <ImportStatusCard
 *   title="Pending Review"
 *   value={42}
 *   description="Emails awaiting review"
 *   variant="pending"
 *   href="/imports/review?status=pending"
 * />
 * ```
 */
export function ImportStatusCard({
  title,
  value,
  description,
  variant,
  href,
  icon: CustomIcon,
  'aria-label': ariaLabel,
}: ImportStatusCardProps) {
  const config = variantConfig[variant]
  const Icon = CustomIcon ?? config.icon
  const isLoading = value === null

  const accessibleLabel = ariaLabel ?? `${title}: ${isLoading ? 'Loading' : value} - ${description}. Click to view details.`

  return (
    <Link
      href={href}
      aria-label={accessibleLabel}
      className={cn(
        'block rounded-lg',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        config.focusRing
      )}
    >
      <Card
        className={cn(
          'cursor-pointer transition-colors duration-200',
          config.border,
          config.bgHover
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', config.iconColor)} aria-hidden="true" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1" aria-live="polite">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <span>{value.toLocaleString()}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

/**
 * ImportStatusCardSkeleton - Loading placeholder for ImportStatusCard
 *
 * Use when the entire card structure needs to be a skeleton
 * (vs just the value being null in ImportStatusCard)
 */
export function ImportStatusCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-16 mb-1" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  )
}
