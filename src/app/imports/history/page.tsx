import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ImportHistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-medium">Import History</h2>
        <p className="text-muted-foreground mt-1">
          View all import activities and audit trail
        </p>
      </div>

      {/* Filter Bar - Placeholder */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 flex-1 max-w-sm" />
      </div>

      {/* Activity Timeline - Placeholder */}
      <div className="space-y-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex gap-4 py-3 border-b last:border-0">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <Skeleton className="h-8 w-8 rounded-full" />
              {i < 8 && <div className="w-px h-full bg-border mt-2" />}
            </div>

            {/* Activity content */}
            <div className="flex-1 pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Skeleton className="h-5 w-64 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More - Placeholder */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
