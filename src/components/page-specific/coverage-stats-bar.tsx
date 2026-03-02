'use client'

import Link from 'next/link'
import { ArrowRight, Mail, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CoverageRing } from './coverage-ring'

interface CoverageStatsBarProps {
  coveragePercent: number
  pendingCount: number
  lastEmailSync: string | null
  emailsPendingReview: number
  isSyncing: boolean
  onSyncNow: () => void
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never'
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function CoverageStatsBar({
  coveragePercent,
  pendingCount,
  lastEmailSync,
  emailsPendingReview,
  isSyncing,
  onSyncNow,
}: CoverageStatsBarProps) {
  return (
    <Card>
      <CardContent className="py-4">
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {/* Coverage ring */}
          <CoverageRing percentage={coveragePercent} size="md" />

          {/* Coverage label */}
          <div className="flex-1">
            <p className="text-sm font-medium">Statement Coverage</p>
            <p className="text-xs text-muted-foreground">
              {coveragePercent}% of months have uploaded statements
            </p>
          </div>

          {/* Pending review section */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-3 border-l pl-6">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  {pendingCount} pending review
                </p>
                <p className="text-xs text-muted-foreground">
                  Matches need your attention
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/imports/review?status=pending">
                  Review Now
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          )}

          {/* Email sync section */}
          <div className="flex items-center gap-3 border-l pl-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Last sync: {formatSyncTime(lastEmailSync)}
              </p>
              {emailsPendingReview > 0 && (
                <p className="text-xs text-amber-600">
                  {emailsPendingReview} emails pending
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CoverageRing percentage={coveragePercent} size="sm" />
              <div>
                <p className="text-sm font-medium">Coverage</p>
                <p className="text-xs text-muted-foreground">
                  {coveragePercent}% captured
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          {pendingCount > 0 && (
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/imports/review?status=pending">
                {pendingCount} pending review
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
