'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DuplicateVendorsAlertProps {
  duplicateCount?: number
  className?: string
}

export function DuplicateVendorsAlert({
  duplicateCount,
  className
}: DuplicateVendorsAlertProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push('/settings/vendors/duplicates')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Review duplicate vendors"
      className={cn(
        // Base styles
        "group relative w-full rounded-lg border cursor-pointer",
        "transition-all duration-200 outline-none",

        // Layout
        "grid grid-cols-[auto_1fr_auto] gap-x-4 items-start px-4 py-3.5",

        // Colors - Default state
        "bg-amber-50 border-amber-200",

        // Hover state
        "hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm",

        // Active state
        "active:scale-[0.995]",

        // Focus state (keyboard)
        "focus-visible:ring-2 focus-visible:ring-amber-400/50",

        className
      )}
    >
      {/* Icon */}
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />

      {/* Content */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="font-semibold text-sm text-amber-900 leading-tight">
          Duplicate vendors detected
        </div>
        <div className="font-normal text-sm text-amber-800/90 leading-relaxed">
          We found potential duplicate vendors in your account.
          Consolidating duplicates helps maintain accurate spending data.
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-1.5 self-center shrink-0">
        <span className="font-medium text-sm text-amber-700 group-hover:text-amber-900 whitespace-nowrap transition-colors underline underline-offset-2">
          Review and manage duplicates
        </span>
        <ArrowRight className="h-4 w-4 text-amber-700 group-hover:text-amber-900 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  )
}
