import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { MainNavigation } from '@/components/page-specific/main-navigation'
import { ChatInterface } from '@/components/page-specific/chat-interface'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name || ''
  const lastName = profile?.last_name || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || profile?.email || ''
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || (profile?.email?.[0]?.toUpperCase() ?? '')

  return (
    <div className="min-h-screen bg-background">
      <SidebarNavigation
        user={{
          fullName,
          email: profile?.email || user.email || '',
          initials,
        }}
      />

      <main className="lg:ml-[240px]">
        <div className="flex flex-col gap-4 pb-0 pt-6 md:pt-12 px-6 md:px-10">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
                Chat
              </h1>
            </div>
            <div className="lg:hidden">
              <MainNavigation />
            </div>
          </div>

          <ChatInterface />
        </div>
      </main>
    </div>
  )
}
