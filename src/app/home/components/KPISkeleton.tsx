import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function MonthlyKPISkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
            <div className="p-6 xl:p-5">
              <div className="flex flex-col gap-2 xl:gap-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-28 mt-2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function YTDKPISkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header skeleton */}
      <Skeleton className="h-4 w-32" />

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
            <div className="p-6 xl:p-5">
              <div className="flex flex-col gap-2 xl:gap-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}