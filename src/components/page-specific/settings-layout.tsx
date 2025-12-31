"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Tag, Store, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { cn } from '@/lib/utils'

interface SettingsLayoutProps {
  children: React.ReactNode
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const navigationItems = [
  {
    name: 'Payment Methods',
    href: '/settings/payment-methods',
    icon: CreditCard,
  },
  {
    name: 'Transaction Tags',
    href: '/settings/tags',
    icon: Tag,
  },
  {
    name: 'Vendors',
    href: '/settings/vendors',
    icon: Store,
  },
  {
    name: 'Emails',
    href: '/settings/emails',
    icon: Mail,
  },
]

export function SettingsLayout({ children, user }: SettingsLayoutProps) {
  const pathname = usePathname()

  // Check if we're on a full-width child page (like duplicate vendors)
  const isFullWidthPage = pathname?.includes('/duplicates')

  // For full-width pages, just render children with sidebar offset
  if (isFullWidthPage) {
    return (
      <div className="min-h-screen bg-background">
        {/* Sidebar Navigation - Desktop only */}
        <SidebarNavigation user={user} />

        {/* Main Content Area with sidebar offset - Full width */}
        <main className="lg:ml-[240px]">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation - Desktop only */}
      <SidebarNavigation user={user} />

      {/* Main Content Area with sidebar offset */}
      <main className="lg:ml-[240px]">
        <div className="flex flex-col gap-6 pb-12 pt-6 md:pt-12 px-6 md:px-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-10 w-10"
          >
            <Link href="/home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
            Settings
          </h1>
        </div>

        {/* Main Content with Side Navigation */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Side Navigation - Desktop */}
          <nav className="hidden md:flex md:flex-col gap-2 md:w-64 flex-shrink-0">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
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

          {/* Mobile Navigation - Horizontal Tabs */}
          <nav className="flex md:hidden gap-2 overflow-x-auto pb-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
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

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
