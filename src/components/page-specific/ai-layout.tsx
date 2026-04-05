"use client"

import { MessageCircle, Brain } from 'lucide-react'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { PageHeader } from '@/components/page-specific/page-header'
import { SubNavigation, type SubNavItem } from '@/components/page-specific/sub-navigation'

interface AiLayoutProps {
  children: React.ReactNode
  user: {
    fullName: string
    email: string
    initials: string
  }
}

const navigationItems: SubNavItem[] = [
  {
    name: 'Chat',
    href: '/ai/chat',
    icon: MessageCircle,
  },
  {
    name: 'Journal',
    href: '/ai/journal',
    icon: Brain,
  },
]

export function AiLayout({ children, user }: AiLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNavigation user={user} />

      <main className="lg:ml-[240px]">
        <div className="flex flex-col gap-6 pb-20 lg:pb-12 pt-6 md:pt-8 px-4 sm:px-6 lg:px-10">
          <PageHeader title="AI" />

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
