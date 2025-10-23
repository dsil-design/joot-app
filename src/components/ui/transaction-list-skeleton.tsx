import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface TransactionListSkeletonProps {
  count?: number
  viewMode?: "cards" | "table"
}

export function TransactionListSkeleton({
  count = 10,
  viewMode = "cards"
}: TransactionListSkeletonProps) {
  if (viewMode === "table") {
    return (
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium">
                  <Skeleton className="h-4 w-12 ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-4 align-middle">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="p-4 align-middle">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="p-4 align-middle">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-4 align-middle text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </td>
                  <td className="p-4 align-middle text-right">
                    <Skeleton className="h-6 w-16 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Cards view skeleton
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                {/* Vendor name */}
                <Skeleton className="h-5 w-32" />

                {/* Description */}
                <Skeleton className="h-4 w-48" />

                {/* Date and payment method */}
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>

              <div className="flex flex-col items-end space-y-2">
                {/* Amount */}
                <Skeleton className="h-6 w-24" />

                {/* Status badge */}
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function TransactionLoadingMore() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Loading more transactions...</span>
      </div>
    </div>
  )
}
