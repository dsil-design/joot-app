import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PaymentMethodsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Payment Methods List Header */}
      <div>
        <Skeleton className="h-7 w-40 mb-3" />
      </div>

      {/* Payment Methods Card */}
      <Card className="bg-white border-zinc-200 rounded-lg shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-2">
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
