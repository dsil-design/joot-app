"use client"

import * as React from "react"
import { SidebarNavigation } from "@/components/page-specific/sidebar-navigation"
import { MainNavigation } from "@/components/page-specific/main-navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { createClient } from "@/lib/supabase/client"

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  showMobileNav?: boolean
  className?: string
}

export function MainLayout({
  children,
  showSidebar = true,
  showMobileNav = false,
  className = ""
}: MainLayoutProps) {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = React.useState<{
    fullName: string
    email: string
    initials: string
  } | null>(null)

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      const fullName = data?.first_name && data?.last_name
        ? `${data.first_name} ${data.last_name}`
        : data?.first_name || data?.last_name || user.email || "User"

      const getInitials = (firstName?: string | null, lastName?: string | null): string => {
        if (firstName && lastName) {
          return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
        }
        if (firstName) return firstName.charAt(0).toUpperCase()
        if (lastName) return lastName.charAt(0).toUpperCase()
        return "U"
      }

      const initials = getInitials(data?.first_name, data?.last_name)

      setUserProfile({
        fullName,
        email: user.email || '',
        initials
      })
    }

    fetchUserProfile()
  }, [user])

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar Navigation - Desktop only */}
      {showSidebar && userProfile && (
        <SidebarNavigation user={userProfile} />
      )}

      {/* Main Content Area with sidebar offset */}
      <main className={showSidebar ? "lg:ml-[240px]" : ""}>
        {/* Mobile/Tablet Navigation - Optional */}
        {showMobileNav && (
          <div className="lg:hidden">
            <MainNavigation />
          </div>
        )}

        {/* Page Content */}
        <div className={className}>
          {children}
        </div>
      </main>
    </div>
  )
}
