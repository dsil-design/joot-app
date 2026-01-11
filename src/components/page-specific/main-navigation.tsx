"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Receipt, Import, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: Receipt,
  },
  {
    name: 'Imports',
    href: '/imports',
    icon: Import,
  },
  {
    name: 'Settings',
    href: '/settings/payment-methods',
    icon: Settings,
  },
]

export function MainNavigation() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1">
      {navigationItems.map((item) => {
        const Icon = item.icon
        // Check if current path matches or starts with the href (for subroutes)
        const isActive = pathname === item.href ||
          (item.href === '/settings/payment-methods' && pathname?.startsWith('/settings')) ||
          (item.href === '/imports' && pathname?.startsWith('/imports'))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] min-w-[44px] justify-center sm:justify-start",
              isActive
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
