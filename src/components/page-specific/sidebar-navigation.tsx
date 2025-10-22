"use client"

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Receipt, Settings, BookOpen, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { auth } from '@/lib/supabase/auth'
import { cn } from '@/lib/utils'

interface SidebarNavigationProps {
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const navigationItems = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
  },
  {
    name: 'All Transactions',
    href: '/transactions',
    icon: Receipt,
  },
]

export function SidebarNavigation({ user }: SidebarNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href)
  }

  const handleSignOut = async () => {
    await auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className="hidden lg:flex fixed left-0 top-0 h-screen w-[240px] flex-col bg-background border-r border-border z-30"
    >
      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto px-3 pt-6">
        <div className="flex flex-col gap-1">
          {navigationItems.map((item) => {
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
            <DropdownMenuItem onClick={() => router.push('/docs')}>
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Design System Documentation</span>
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
  )
}
