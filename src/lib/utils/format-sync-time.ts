/**
 * Format an ISO timestamp to a short relative time string.
 * Used by coverage-stats-bar and email-sync-card.
 *
 * Examples: "Just now", "5m ago", "2h ago", "3d ago"
 */
export function formatSyncTime(iso: string | null): string {
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

/**
 * Format an ISO timestamp to a longer human-readable string.
 * Used by email-sync-card for detailed "last synced" display.
 *
 * Examples: "Just now", "5 minutes ago", "2 hours ago", "Jan 15, 3:30 PM"
 */
export function formatLastSynced(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'Never synced'

  const lastSync = new Date(lastSyncedAt)
  const now = new Date()
  const hoursSince = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

  if (hoursSince < 1) {
    const minutes = Math.round(hoursSince * 60)
    if (minutes < 1) return 'Just now'
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  }
  if (hoursSince < 24) {
    const hours = Math.round(hoursSince)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  }
  return lastSync.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
