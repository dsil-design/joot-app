'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Search, History, Settings, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Quick Action Button Component
export interface QuickActionProps {
  /** Label for the action button */
  title: string
  /** Lucide icon to display */
  icon: LucideIcon
  /** Navigation target */
  href: string
  /** Button style variant */
  variant?: 'primary' | 'secondary'
  /** Accessible label for screen readers */
  'aria-label'?: string
}

export function QuickActionButton({
  title,
  icon: Icon,
  href,
  variant = 'secondary',
  'aria-label': ariaLabel,
}: QuickActionProps) {
  const isPrimary = variant === 'primary'

  return (
    <Link href={href} aria-label={ariaLabel || title}>
      <Card
        className={cn(
          'cursor-pointer transition-all h-full',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          isPrimary
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
            : 'hover:bg-muted/50 border-border'
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
          <Icon
            className={cn('h-6 w-6', isPrimary ? 'text-primary-foreground' : 'text-muted-foreground')}
            aria-hidden="true"
          />
          <span className={cn('text-sm font-medium text-center', isPrimary ? 'text-primary-foreground' : '')}>
            {title}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

// Default quick actions for the imports dashboard
export const defaultQuickActions: QuickActionProps[] = [
  {
    title: 'Upload Statement',
    icon: Upload,
    href: '/imports/statements',
    variant: 'primary',
    'aria-label': 'Upload a credit card or bank statement',
  },
  {
    title: 'Review Queue',
    icon: Search,
    href: '/imports/review',
    variant: 'secondary',
    'aria-label': 'Review pending email transactions',
  },
  {
    title: 'View History',
    icon: History,
    href: '/imports/history',
    variant: 'secondary',
    'aria-label': 'View import activity history',
  },
  {
    title: 'Import Settings',
    icon: Settings,
    href: '/settings',
    variant: 'secondary',
    'aria-label': 'Configure import settings',
  },
]

export interface QuickActionsGridProps {
  /** Custom actions to display (defaults to standard import actions) */
  actions?: QuickActionProps[]
  /** Section title */
  title?: string
  /** Whether to show the section title */
  showTitle?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Quick Actions Grid component for the Import Dashboard.
 *
 * Displays a 2x2 grid of action buttons on desktop,
 * and a single column (stacked) layout on mobile.
 *
 * Per the wireframe specification:
 * - Desktop: 2x2 grid (4 items in 2 rows of 2)
 * - Mobile: 1x4 stacked (single column)
 */
export function QuickActionsGrid({
  actions = defaultQuickActions,
  title = 'Quick Actions',
  showTitle = true,
  className,
}: QuickActionsGridProps) {
  return (
    <section className={className} aria-labelledby={showTitle ? 'quick-actions-title' : undefined}>
      {showTitle && (
        <h2 id="quick-actions-title" className="text-lg font-semibold mb-4">
          {title}
        </h2>
      )}
      {/*
        Grid layout per wireframe:
        - Mobile (default): 1 column (stacked vertically)
        - Desktop (md+): 2x2 grid
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => (
          <QuickActionButton
            key={action.href}
            title={action.title}
            icon={action.icon}
            href={action.href}
            variant={action.variant}
            aria-label={action['aria-label']}
          />
        ))}
      </div>
    </section>
  )
}

// Skeleton loading state for the Quick Actions grid
export function QuickActionsGridSkeleton({ showTitle = true }: { showTitle?: boolean }) {
  return (
    <section>
      {showTitle && <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse" />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="h-6 w-6 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default QuickActionsGrid
