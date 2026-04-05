import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'

interface PageShellProps {
  children: React.ReactNode
  user: {
    fullName: string
    email: string
    initials: string
  }
}

export function PageShell({ children, user }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNavigation user={user} />
      <main className="lg:ml-[240px]">
        <div className="flex flex-col gap-6 pb-20 lg:pb-12 pt-6 md:pt-8 px-4 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  )
}
