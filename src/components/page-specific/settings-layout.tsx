"use client"

import { usePathname } from 'next/navigation'
import { CreditCard, Tag, Store, Mail } from 'lucide-react'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { PageHeader } from '@/components/page-specific/page-header'
import { SubNavigation, type SubNavItem } from '@/components/page-specific/sub-navigation'

interface SettingsLayoutProps {
  children: React.ReactNode
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const navigationItems: SubNavItem[] = [
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

  // Full-width child pages (like duplicate vendors) skip sub-navigation
  const isFullWidthPage = pathname?.includes('/duplicates')

  if (isFullWidthPage) {
    return (
      <div className="min-h-screen bg-background">
        <SidebarNavigation user={user} />
        <main className="lg:ml-[240px]">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNavigation user={user} />

      <main className="lg:ml-[240px]">
        <div className="flex flex-col gap-6 pb-20 lg:pb-12 pt-6 md:pt-8 px-4 sm:px-6 lg:px-10">
          <PageHeader title="Settings" />

          {/* Main Content with Side Navigation */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <SubNavigation items={navigationItems} exactRootMatch={false} />

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
