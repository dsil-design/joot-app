import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

export default function StatementsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium">Statement Uploads</h2>
          <p className="text-muted-foreground mt-1">
            Upload and process credit card statements
          </p>
        </div>
        <Button disabled>
          <Upload className="h-4 w-4 mr-2" />
          Upload Statement
        </Button>
      </div>

      {/* Upload Area - Placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Upload a statement</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop a PDF statement or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports Chase credit card statements (PDF)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Uploads - Placeholder */}
      <div>
        <h3 className="text-lg font-medium mb-4">Recent Uploads</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
