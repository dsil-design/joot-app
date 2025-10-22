import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function HomeLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md md:max-w-6xl mx-auto px-6 md:px-8 py-6 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 bg-white border-zinc-200">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>

      {/* Chart Section */}
      <Card className="p-6 bg-white border-zinc-200">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </Card>

      {/* Top Vendors */}
      <Card className="p-6 bg-white border-zinc-200">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Transactions */}
      <div>
        <Skeleton className="h-7 w-48 mb-4" />
        <Card className="bg-white border-zinc-200">
          <div className="divide-y divide-zinc-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
