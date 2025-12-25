"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

interface MobileFabProps {
  href?: string
  onClick?: () => void
  className?: string
}

/**
 * Mobile Floating Action Button for adding transactions.
 * Fixed to bottom-right corner, always visible on mobile regardless of filter state.
 */
export function MobileFab({
  href = "/add-transaction",
  onClick,
  className = ""
}: MobileFabProps) {
  const fabClasses = `
    fixed bottom-20 right-4 z-50
    flex items-center justify-center
    w-14 h-14
    bg-primary hover:bg-primary/90
    text-white
    rounded-full
    shadow-lg hover:shadow-xl
    transition-all duration-200
    active:scale-95
    ${className}
  `.trim().replace(/\s+/g, ' ')

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={fabClasses}
        aria-label="Add transaction"
      >
        <Plus className="w-6 h-6" />
      </button>
    )
  }

  return (
    <Link
      href={href}
      className={fabClasses}
      aria-label="Add transaction"
    >
      <Plus className="w-6 h-6" />
    </Link>
  )
}
