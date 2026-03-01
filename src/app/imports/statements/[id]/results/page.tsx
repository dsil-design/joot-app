"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Processing result data
 */
interface ProcessingResult {
  statement: {
    id: string
    filename: string
    payment_method: { id: string; name: string; type: string } | null
    period: { start: string | null; end: string | null }
    processed_at: string | null
  }
  status: "pending" | "processing" | "completed" | "failed"
  summary: {
    total_extracted: number
    total_matched: number
    total_new: number
    confidence_distribution: {
      high: number
      medium: number
      low: number
      no_match: number
    }
    parser_used: string | null
    page_count: number | null
    warnings: string[]
  } | null
  error?: string | null
  progress?: {
    step: string
    percent: number
    message: string
  } | null
}

/**
 * Fetch processing results
 */
async function fetchResults(statementId: string): Promise<ProcessingResult | null> {
  try {
    const response = await fetch(`/api/statements/${statementId}/matches`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error("Failed to fetch results")
    }
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Processing Results Summary Page
 *
 * Shows the results after a statement has been processed:
 * - Statement info
 * - Transaction counts (extracted, matched, new)
 * - Match quality distribution chart
 * - Warnings
 * - CTAs to review queue and history
 */
export default function ProcessingResultsPage() {
  const params = useParams<{ id: string }>()
  const statementId = params?.id as string

  const [result, setResult] = React.useState<ProcessingResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isStartingProcessing, setIsStartingProcessing] = React.useState(false)

  // Fetch results on mount
  React.useEffect(() => {
    const loadResults = async () => {
      setIsLoading(true)
      setError(null)

      const data = await fetchResults(statementId)
      if (!data) {
        setError("Statement not found")
      } else {
        setResult(data)
      }

      setIsLoading(false)
    }

    loadResults()
  }, [statementId])

  // Polling for processing status
  React.useEffect(() => {
    if (result?.status === "processing") {
      const interval = setInterval(async () => {
        const data = await fetchResults(statementId)
        if (data) {
          setResult(data)
          if (data.status !== "processing") {
            clearInterval(interval)
          }
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [result?.status, statementId])

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-6 px-4 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-3xl mx-auto py-6 px-4">
        <div className="text-center py-16">
          <XCircle className="h-12 w-12 mx-auto text-destructive/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">{error}</h3>
          <p className="text-muted-foreground mb-4">
            The statement you are looking for does not exist or could not be loaded.
          </p>
          <Button asChild variant="outline">
            <Link href="/imports/statements">Back to Statements</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!result) return null

  const isProcessing = result.status === "processing"
  const isPending = result.status === "pending"
  const isFailed = result.status === "failed"
  const isCompleted = result.status === "completed"

  return (
    <div className="container max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/imports/statements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Processing Results</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              {result.statement.filename}
            </p>
            {result.statement.payment_method && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {result.statement.payment_method.name}
              </span>
            )}
            {result.statement.period.start && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {formatDate(result.statement.period.start)}
                {result.statement.period.end && ` — ${formatDate(result.statement.period.end)}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Processing status */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium text-blue-900">Processing statement...</span>
            </div>
            {result.progress && (
              <>
                <Progress value={result.progress.percent} className="h-2 mb-2" />
                <p className="text-sm text-blue-700">
                  {result.progress.message} ({result.progress.percent}%)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending status */}
      {isPending && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-900">
                  Statement has not been processed yet
                </span>
              </div>
              <Button
                size="sm"
                disabled={isStartingProcessing}
                onClick={async () => {
                  setIsStartingProcessing(true)
                  try {
                    const response = await fetch(`/api/statements/${statementId}/process`, {
                      method: "POST",
                    })
                    if (!response.ok) {
                      const errorData = await response.json()
                      console.error('Failed to start processing:', errorData)
                      alert(`Failed to start processing: ${errorData.error || 'Unknown error'}`)
                      return
                    }
                    // Give backend a moment to update status
                    await new Promise(resolve => setTimeout(resolve, 500))
                    const data = await fetchResults(statementId)
                    if (data) setResult(data)
                  } catch (err) {
                    console.error('Error starting processing:', err)
                    alert('Failed to start processing. Check console for details.')
                  } finally {
                    setIsStartingProcessing(false)
                  }
                }}
              >
                {isStartingProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Processing"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed status */}
      {isFailed && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900">Processing failed</span>
            </div>
            <p className="text-sm text-red-700">{result.error || "Unknown error"}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={async () => {
                await fetch(`/api/statements/${statementId}/process`, {
                  method: "POST",
                })
                const data = await fetchResults(statementId)
                if (data) setResult(data)
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Processing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed results */}
      {isCompleted && result.summary && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              label="Extracted"
              value={result.summary.total_extracted}
              description="transactions found"
              href={`/imports/review?statementUploadId=${statementId}`}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
              label="Matched"
              value={result.summary.total_matched}
              description="existing transactions"
              className="border-green-200 bg-green-50"
              href={`/imports/review?statementUploadId=${statementId}&confidence=high`}
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
              label="New"
              value={result.summary.total_new}
              description="to import"
              className="border-amber-200 bg-amber-50"
              href={`/imports/review?statementUploadId=${statementId}&confidence=low`}
            />
          </div>

          {/* Match quality distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Match Quality Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <DistributionBar
                  label="High Confidence (90%+)"
                  value={result.summary.confidence_distribution.high}
                  total={result.summary.total_extracted}
                  color="bg-green-500"
                  href={`/imports/review?statementUploadId=${statementId}&confidence=high`}
                />
                <DistributionBar
                  label="Medium Confidence (55-89%)"
                  value={result.summary.confidence_distribution.medium}
                  total={result.summary.total_extracted}
                  color="bg-amber-500"
                  href={`/imports/review?statementUploadId=${statementId}&confidence=medium`}
                />
                <DistributionBar
                  label="Low Confidence (<55%)"
                  value={result.summary.confidence_distribution.low}
                  total={result.summary.total_extracted}
                  color="bg-red-500"
                  href={`/imports/review?statementUploadId=${statementId}&confidence=low`}
                />
                <DistributionBar
                  label="No Match"
                  value={result.summary.confidence_distribution.no_match}
                  total={result.summary.total_extracted}
                  color="bg-gray-400"
                  href={`/imports/review?statementUploadId=${statementId}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {result.summary.warnings.length > 0 && (
            <Card className="border-amber-200">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 mb-2">Warnings</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {result.summary.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statement info */}
          <Card>
            <CardContent className="py-4">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Payment Method</dt>
                  <dd className="font-medium">
                    {result.statement.payment_method?.name || "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Statement Period</dt>
                  <dd className="font-medium">
                    {result.statement.period.start && result.statement.period.end
                      ? `${formatDate(result.statement.period.start)} - ${formatDate(result.statement.period.end)}`
                      : "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Parser Used</dt>
                  <dd className="font-medium capitalize">
                    {result.summary.parser_used || "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pages Processed</dt>
                  <dd className="font-medium">{result.summary.page_count || 1}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" asChild>
              <Link href="/imports/statements">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Statements
              </Link>
            </Button>

            <div className="flex items-center gap-3">
              {result.summary.total_extracted > 0 && (
                <Button asChild>
                  <Link href={`/imports/review?statementUploadId=${statementId}`}>
                    Review Matches
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Stat card component
 */
function StatCard({
  icon,
  label,
  value,
  description,
  className,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  description: string
  className?: string
  href?: string
}) {
  const card = (
    <Card className={cn("text-center", href && "cursor-pointer hover:shadow-md transition-shadow", className)}>
      <CardContent className="py-4">
        <div className="flex justify-center mb-2">{icon}</div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{card}</Link>
  }

  return card
}

/**
 * Distribution bar component
 */
function DistributionBar({
  label,
  value,
  total,
  color,
  href,
}: {
  label: string
  value: number
  total: number
  color: string
  href?: string
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  const content = (
    <div className={href && value > 0 ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">
          {value} ({Math.round(percentage)}%)
          {href && value > 0 && <ArrowRight className="inline h-3 w-3 ml-1" />}
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )

  if (href && value > 0) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}
