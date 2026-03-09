"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface SubNavItem {
  name: string
  href: string
  icon: LucideIcon
}

interface SubNavigationProps {
  items: SubNavItem[]
  /** If true, the root item (first) only matches exact path. Default true. */
  exactRootMatch?: boolean
}

export function SubNavigation({ items, exactRootMatch = true }: SubNavigationProps) {
  const pathname = usePathname()

  const isActive = (href: string, index: number) => {
    if (exactRootMatch && index === 0) {
      return pathname === href
    }
    return pathname?.startsWith(href) ?? false
  }

  return (
    <>
      {/* Desktop - Vertical side navigation */}
      <nav className="hidden md:flex md:flex-col gap-2 md:w-64 flex-shrink-0">
        {items.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.href, index)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Mobile - Horizontal tabs */}
      <nav className="flex md:hidden gap-2 overflow-x-auto pb-2">
        {items.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.href, index)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
