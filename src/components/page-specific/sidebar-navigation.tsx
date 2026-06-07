"use client"

import * as React from "react"
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Receipt, Import, Brain, ClipboardCheck, Settings, LogOut, Plus, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { auth } from '@/lib/supabase/auth'
import { cn, formatCurrency } from '@/lib/utils'
import { useRecentTransactions } from '@/hooks/use-recent-transactions'

interface SidebarNavigationProps {
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const mobileBarItems = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Review', href: '/review', icon: ClipboardCheck },
]

const moreMenuItems = [
  { name: 'Sources & Imports', href: '/imports', icon: Import, description: 'Emails, statements, payment slips' },
  { name: 'AI Assistant', href: '/ai', icon: Brain, description: 'Chat & journal' },
  { name: 'Settings', href: '/settings/payment-methods', icon: Settings, description: 'Payment methods, tags, vendors' },
]

interface CollapsibleNavSectionProps {
  icon: React.ElementType
  label: string
  sectionHref: string
  defaultOpen: boolean
  children: React.ReactNode
}

function CollapsibleNavSection({ icon: Icon, label, sectionHref, defaultOpen, children }: CollapsibleNavSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 w-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "text-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="ml-8 flex flex-col gap-0.5 mb-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface SubNavLinkProps {
  href: string
  children: React.ReactNode
}

function SubNavLink({ href, children }: SubNavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center px-3 py-1.5 rounded-md text-sm transition-colors duration-200",
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </Link>
  )
}

export function SidebarNavigation({ user }: SidebarNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = React.useState(false)
  const { data: recentTransactions } = useRecentTransactions()

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
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
        <nav className="overflow-y-auto min-h-0 px-3 pt-6 pb-4">
          <div className="flex flex-col gap-0.5">

            {/* Home */}
            <Link
              href="/home"
              aria-current={isActive('/home') ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive('/home')
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Home className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Home</span>
            </Link>

            {/* Transactions — collapsible */}
            <CollapsibleNavSection
              icon={Receipt}
              label="Transactions"
              sectionHref="/transactions"
              defaultOpen={true}
            >
              <SubNavLink href="/transactions?preset=this-month">This Month</SubNavLink>
              <SubNavLink href="/transactions?preset=this-year">This Year</SubNavLink>
              <SubNavLink href="/transactions?preset=all-time">All Transactions</SubNavLink>
            </CollapsibleNavSection>

            {/* Review Queue — collapsible */}
            <CollapsibleNavSection
              icon={ClipboardCheck}
              label="Review Queue"
              sectionHref="/review"
              defaultOpen={true}
            >
              <SubNavLink href="/review">Pending</SubNavLink>
              <SubNavLink href="/review?preset=this-week">This Week</SubNavLink>
              <SubNavLink href="/review?preset=all-time">All Time</SubNavLink>
            </CollapsibleNavSection>

            {/* Sources — collapsible */}
            <CollapsibleNavSection
              icon={Import}
              label="Sources"
              sectionHref="/imports"
              defaultOpen={true}
            >
              <SubNavLink href="/imports">Overview</SubNavLink>
              <SubNavLink href="/imports/emails">Emails</SubNavLink>
              <SubNavLink href="/imports/statements">Statements</SubNavLink>
              <SubNavLink href="/imports/payment-slips">Payment Slips</SubNavLink>
              <SubNavLink href="/imports/history">History</SubNavLink>
            </CollapsibleNavSection>

            {/* AI */}
            <Link
              href="/ai"
              aria-current={isActive('/ai') ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive('/ai')
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Brain className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>AI</span>
            </Link>

          </div>
        </nav>

        {/* Recents — anchored above user footer */}
        {recentTransactions && recentTransactions.length > 0 && (
          <div className="border-t border-border px-3 py-3 overflow-y-auto flex-1 min-h-0">
            <p className="px-3 mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent
            </p>
            <div className="flex flex-col gap-0.5">
              {recentTransactions.map((tx) => {
                const label = tx.vendor?.name || tx.description || 'Transaction'
                return (
                  <Link
                    key={tx.id}
                    href={`/transactions/${tx.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors duration-200 hover:bg-accent group"
                  >
                    <span className="flex-1 min-w-0 text-xs text-muted-foreground group-hover:text-accent-foreground truncate">
                      {label}
                    </span>
                    <span className="text-xs font-medium text-foreground shrink-0 tabular-nums">
                      {formatCurrency(tx.amount, tx.original_currency, { maximumFractionDigits: 0 })}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* User Account Section */}
        <div className="shrink-0 border-t border-border px-3 py-4" role="region" aria-label="User account">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                suppressHydrationWarning
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
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
