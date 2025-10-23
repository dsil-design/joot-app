import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { MainNavigation } from '@/components/page-specific/main-navigation'
import { AddTransactionFooter } from '@/components/page-specific/add-transaction-footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Import server components
import { UserProfileSection } from './components/UserProfileSection'
import { MonthlyKPISection } from './components/MonthlyKPISection'
import { YTDKPISection } from './components/YTDKPISection'
import { TrendChartSection } from './components/TrendChartSection'
import { TopVendorsSection } from './components/TopVendorsSection'
import { RecentTransactionsSection } from './components/RecentTransactionsSection'

// Import skeleton components
import { MonthlyKPISkeleton, YTDKPISkeleton } from './components/KPISkeleton'
import { TrendChartSkeleton, TopVendorsSkeleton, RecentTransactionsSkeleton } from './components/ChartSkeleton'

// Client components
import { HomePageClientWrapper } from './components/HomePageClientWrapper'

interface HomePageProps {
  searchParams?: Promise<{ error?: string }>
}

// Enable partial prerendering and set revalidation time
export const dynamic = 'force-dynamic' // Ensure fresh data on each visit
export const revalidate = 60 // Revalidate every 60 seconds

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  // Quick auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile data (fast query)
  const userProfile = await UserProfileSection()

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation - Renders immediately */}
      <SidebarNavigation
        user={{
          fullName: userProfile.fullName,
          email: userProfile.userEmail,
          initials: userProfile.userInitials
        }}
      />

      {/* Main Content Area with sidebar offset */}
      <main className="lg:ml-[240px]">
        {/* Error message for unauthorized access */}
        {resolvedSearchParams?.error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="bg-destructive/10 border-destructive text-destructive p-4 shadow-lg max-w-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {resolvedSearchParams.error === 'unauthorized' || resolvedSearchParams.error === 'auth_error'
                    ? 'Access denied. Admin privileges required.'
                    : resolvedSearchParams.error}
                </span>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-destructive hover:text-destructive/80">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Main scrollable content */}
        <div className="flex flex-col gap-6 pb-12 pt-6 md:pt-12 px-6 md:px-10">
          {/* Header with Navigation - Renders immediately */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
                Home
              </h1>
              <HomePageClientWrapper />
            </div>
            {/* Navigation Bar - Mobile/Tablet only */}
            <div className="lg:hidden">
              <MainNavigation />
            </div>
          </div>

          {/* Main Content with Progressive Loading */}
          <div className="flex flex-col gap-4 w-full">
            {/* KPI Section - Combined layout with proper spacing */}
            <div className="flex flex-col gap-4 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-6 gap-4 w-full relative">
                {/* Vertical Divider - Only visible on XL screens between columns 3 and 4 */}
                <div className="hidden xl:flex absolute left-1/2 top-0 bottom-0 items-center justify-center w-4 -ml-2 pointer-events-none">
                  <div className="w-px h-full bg-zinc-200" />
                </div>

                {/* Current Month KPIs - Priority 1 */}
                <div className="lg:col-span-1 xl:col-span-3">
                  <Suspense fallback={<MonthlyKPISkeleton />}>
                    <MonthlyKPISection />
                  </Suspense>
                </div>

                {/* YTD KPIs - Priority 2 */}
                <div className="lg:col-span-1 xl:col-span-3">
                  <Suspense fallback={<YTDKPISkeleton />}>
                    <YTDKPISection />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Trend Chart - Priority 3 */}
            <Suspense fallback={<TrendChartSkeleton />}>
              <TrendChartSection />
            </Suspense>

            {/* Bottom Widgets - Priority 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full relative">
              {/* Vertical Divider */}
              <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 items-center justify-center w-4 -ml-2 pointer-events-none">
                <div className="w-px h-full bg-zinc-200" />
              </div>

              {/* Top Vendors */}
              <Suspense fallback={<TopVendorsSkeleton />}>
                <TopVendorsSection />
              </Suspense>

              {/* Recent Transactions */}
              <Suspense fallback={<RecentTransactionsSkeleton />}>
                <RecentTransactionsSection />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Sticky Footer - Mobile only */}
      <AddTransactionFooter />
    </div>
  )
}