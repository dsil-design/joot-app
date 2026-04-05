import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/page-specific/page-shell'
import { PageHeader } from '@/components/page-specific/page-header'
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

  // Fetch auth and exchange rate in parallel — single source for all sections
  const [{ data: { user } }, { data: latestExchangeRate }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', 'USD')
      .eq('to_currency', 'THB')
      .order('date', { ascending: false })
      .limit(1)
      .single()
  ])

  if (!user) {
    redirect('/login')
  }

  const exchangeRate = latestExchangeRate?.rate || 35
  const userId = user.id

  // Get user profile data (fast query)
  const userProfile = await UserProfileSection({ userId })

  return (
    <PageShell
      user={{
        fullName: userProfile.fullName,
        email: userProfile.userEmail,
        initials: userProfile.userInitials
      }}
    >
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

      <PageHeader title="Home" actions={<HomePageClientWrapper />} />

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
                    <MonthlyKPISection userId={userId} exchangeRate={exchangeRate} />
                  </Suspense>
                </div>

                {/* YTD KPIs - Priority 2 */}
                <div className="lg:col-span-1 xl:col-span-3">
                  <Suspense fallback={<YTDKPISkeleton />}>
                    <YTDKPISection userId={userId} exchangeRate={exchangeRate} />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Trend Chart - Priority 3 */}
            <Suspense fallback={<TrendChartSkeleton />}>
              <TrendChartSection userId={userId} exchangeRate={exchangeRate} />
            </Suspense>

            {/* Bottom Widgets - Priority 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full relative">
              {/* Vertical Divider */}
              <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 items-center justify-center w-4 -ml-2 pointer-events-none">
                <div className="w-px h-full bg-zinc-200" />
              </div>

              {/* Top Vendors */}
              <Suspense fallback={<TopVendorsSkeleton />}>
                <TopVendorsSection userId={userId} exchangeRate={exchangeRate} />
              </Suspense>

              {/* Recent Transactions */}
              <Suspense fallback={<RecentTransactionsSkeleton />}>
                <RecentTransactionsSection userId={userId} />
              </Suspense>
            </div>
          </div>

    </PageShell>
  )
}