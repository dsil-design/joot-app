import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function TransactionsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <Skeleton className="h-10 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 hidden md:block" />
            <Skeleton className="h-10 w-40 hidden md:block" />
            <Skeleton className="h-10 w-48 hidden md:block" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>

        {/* Transaction Cards/Table */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="bg-white border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
