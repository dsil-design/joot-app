"use client"

import * as React from "react"
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Receipt, Import, Brain, ClipboardCheck, Settings, LogOut, Plus, MoreHorizontal, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { auth } from '@/lib/supabase/auth'
import { cn } from '@/lib/utils'

interface SidebarNavigationProps {
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const sidebarItems = [
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
    name: 'Review Queue',
    href: '/review',
    icon: ClipboardCheck,
  },
  {
    name: 'Sources',
    href: '/imports',
    icon: Import,
  },
  {
    name: 'AI',
    href: '/ai',
    icon: Brain,
  },
]

const mobileBarItems = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  // Center FAB slot handled separately
  { name: 'Review', href: '/review', icon: ClipboardCheck },
  // "More" handled separately
]

const moreMenuItems = [
  { name: 'Sources & Imports', href: '/imports', icon: Import, description: 'Emails, statements, payment slips' },
  { name: 'AI Assistant', href: '/ai', icon: Brain, description: 'Chat & journal' },
  { name: 'Settings', href: '/settings/payment-methods', icon: Settings, description: 'Payment methods, tags, vendors' },
]

export function SidebarNavigation({ user }: SidebarNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href)
  }

  const isMoreActive = moreMenuItems.some(item =>
    item.href === '/settings/payment-methods'
      ? pathname?.startsWith('/settings')
      : isActive(item.href)
  )

  const handleSignOut = async () => {
    await auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className="hidden lg:flex fixed left-0 top-0 h-screen w-[240px] flex-col bg-background border-r border-border z-30"
      >
        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto px-3 pt-6">
          <div className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Account Section */}
        <div className="border-t border-border px-3 py-4" role="region" aria-label="User account">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                suppressHydrationWarning
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-zinc-100 text-zinc-950 text-xs font-semibold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <span className="text-sm font-medium text-foreground truncate">
                    {user.fullName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Off</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile bottom app bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pb-[env(safe-area-inset-bottom)] bg-background"
        style={{ overflow: 'visible' }}
      >
        <nav
          role="navigation"
          aria-label="Main navigation"
          className="relative flex items-end border-t h-16"
        >
          {/* Left tabs: Home, Transactions */}
          {mobileBarItems.slice(0, 2).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 h-full text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}

          {/* Center FAB: Add Transaction */}
          <div className="flex flex-1 items-center justify-center h-full">
            <Link
              href="/add-transaction"
              className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform ring-4 ring-background"
              aria-label="Add transaction"
            >
              <Plus className="h-7 w-7" />
            </Link>
          </div>

          {/* Right tabs: Review, More */}
          {mobileBarItems.slice(2).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 h-full text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 h-full text-[10px] font-medium transition-colors",
              isMoreActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-6 w-6" aria-hidden="true" />
            More
          </button>
        </nav>
      </div>

      {/* More menu bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="px-6 pb-2">
            <SheetTitle className="text-lg">More</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col">
            {moreMenuItems.map((item) => {
              const Icon = item.icon
              const active = item.href === '/settings/payment-methods'
                ? pathname?.startsWith('/settings')
                : isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 transition-colors",
                    active
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
