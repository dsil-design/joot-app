import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function VendorsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Vendors List Header */}
      <div>
        <Skeleton className="h-7 w-28 mb-3" />
      </div>

      {/* Vendors Card */}
      <Card className="bg-white border-zinc-200 rounded-lg shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-200">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4"
            >
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
