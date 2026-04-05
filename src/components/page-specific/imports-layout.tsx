"use client"

import { LayoutDashboard, FileText, Mail, Clock, Receipt } from 'lucide-react'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { PageHeader } from '@/components/page-specific/page-header'
import { SubNavigation, type SubNavItem } from '@/components/page-specific/sub-navigation'

interface ImportsLayoutProps {
  children: React.ReactNode
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const navigationItems: SubNavItem[] = [
  {
    name: 'Overview',
    href: '/imports',
    icon: LayoutDashboard,
  },
  {
    name: 'Emails',
    href: '/imports/emails',
    icon: Mail,
  },
  {
    name: 'Statements',
    href: '/imports/statements',
    icon: FileText,
  },
  {
    name: 'Payment Slips',
    href: '/imports/payment-slips',
    icon: Receipt,
  },
  {
    name: 'History',
    href: '/imports/history',
    icon: Clock,
  },
]

export function ImportsLayout({ children, user }: ImportsLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNavigation user={user} />

      <main className="lg:ml-[240px]">
        <div className="flex flex-col gap-6 pb-20 lg:pb-12 pt-6 md:pt-8 px-4 sm:px-6 lg:px-10">
          <PageHeader title="Sources" />

          {/* Main Content with Side Navigation */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <SubNavigation items={navigationItems} />

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
