import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ImportsDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Status Cards Section - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl">
              <Skeleton className="h-9 w-16" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Emails awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Waiting for Statement</CardDescription>
            <CardTitle className="text-3xl">
              <Skeleton className="h-9 w-16" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              THB receipts awaiting USD match
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Matched This Month</CardDescription>
            <CardTitle className="text-3xl">
              <Skeleton className="h-9 w-16" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Successfully matched transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Sync Card - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Email Sync</CardTitle>
          <CardDescription>
            Sync emails from your iCloud mailbox
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Placeholder */}
      <div>
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Skeleton className="h-8 w-8 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Skeleton className="h-8 w-8 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Skeleton className="h-8 w-8 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Skeleton className="h-8 w-8 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity - Placeholder */}
      <div>
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
