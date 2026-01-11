"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LayoutDashboard, ClipboardCheck, FileText, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { MainNavigation } from '@/components/page-specific/main-navigation'
import { cn } from '@/lib/utils'

interface ImportsLayoutProps {
  children: React.ReactNode
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/imports',
    icon: LayoutDashboard,
  },
  {
    name: 'Review Queue',
    href: '/imports/review',
    icon: ClipboardCheck,
  },
  {
    name: 'Statements',
    href: '/imports/statements',
    icon: FileText,
  },
  {
    name: 'History',
    href: '/imports/history',
    icon: History,
  },
]

export function ImportsLayout({ children, user }: ImportsLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation - Desktop only */}
      <SidebarNavigation user={user} />

      {/* Main Content Area with sidebar offset */}
      <main className="lg:ml-[240px]">
        <div className="flex flex-col gap-6 pb-12 pt-6 md:pt-12 px-6 md:px-10">
          {/* Header */}
          <div className="flex flex-col gap-4 w-full">
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
                Imports
              </h1>
            </div>
            {/* Navigation Bar - Mobile/Tablet only */}
            <div className="lg:hidden">
              <MainNavigation />
            </div>
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
