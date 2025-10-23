import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function TrendChartSkeleton() {
  return (
    <div className="flex flex-col gap-2 items-start justify-start w-full">
      <Skeleton className="h-4 w-36" />
      <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
        <div className="p-6">
          {/* Chart header with controls */}
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-64" />
          </div>
          {/* Chart area */}
          <Skeleton className="h-[300px] w-full" />
        </div>
      </Card>
    </div>
  )
}

export function TopVendorsSkeleton() {
  return (
    <div className="flex flex-col gap-2 items-start justify-start">
      <Skeleton className="h-4 w-24" />
      <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

export function RecentTransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-2 items-start justify-start h-full min-h-0">
      <Skeleton className="h-4 w-36" />
      <div className="flex flex-col w-full bg-transparent relative flex-1 min-h-0">
        <div className="space-y-4">
          {/* Date group header */}
          <Skeleton className="h-4 w-24" />
          {/* Transaction items */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
        {/* Footer button */}
        <div className="sticky bottom-0 bg-background pt-4 mt-4 border-t border-zinc-200">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}