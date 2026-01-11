"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Mail, AlertCircle, Clock, Inbox, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Email {
  id: string
  message_id: string
  uid: number
  folder: string
  subject: string | null
  from_address: string | null
  from_name: string | null
  date: string | null
  seen: boolean | null
  has_attachments: boolean | null
  synced_at: string | null
  created_at: string | null
}

interface EmailsSettingsProps {
  emails: Email[]
  totalEmails: number
  lastSyncAt: string | null
  isConfigured: boolean
  folders: string[]
}

export function EmailsSettings({
  emails: initialEmails,
  totalEmails: initialTotal,
  lastSyncAt: initialLastSync,
  isConfigured,
  folders,
}: EmailsSettingsProps) {
  const router = useRouter()
  const [emails, setEmails] = useState(initialEmails)
  const [totalEmails, setTotalEmails] = useState(initialTotal)
  const [lastSyncAt, setLastSyncAt] = useState(initialLastSync)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSync = async () => {
    if (!isConfigured) {
      toast.error('iCloud email integration is not configured')
      return
    }

    setIsSyncing(true)
    try {
      const response = await fetch('/api/emails/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      if (data.success) {
        toast.success(`Synced ${data.synced} emails`)
        setLastSyncAt(new Date().toISOString())
        router.refresh()
      } else {
        toast.error(data.message || 'Sync completed with errors')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync emails')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      router.refresh()
      return
    }

    try {
      const response = await fetch(`/api/emails?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (response.ok) {
        setEmails(data.emails)
        setTotalEmails(data.total)
      }
    } catch (error) {
      toast.error('Failed to search emails')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Email Integration Not Configured
          </CardTitle>
          <CardDescription>
            To sync emails from iCloud, configure the following environment variables:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-100 rounded-lg p-4 font-mono text-sm space-y-1">
            <p>ICLOUD_EMAIL=your-email@icloud.com</p>
            <p>ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx</p>
            <p>ICLOUD_FOLDER=Transactions</p>
          </div>
          <p className="mt-4 text-sm text-zinc-600">
            You&apos;ll need to generate an app-specific password from{' '}
            <a
              href="https://appleid.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              appleid.apple.com
            </a>
            {' '}(requires 2FA to be enabled on your Apple ID).
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sync Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Email Sync
            </CardTitle>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-zinc-500">Total Emails</p>
              <p className="text-2xl font-semibold">{totalEmails}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-500">Last Sync</p>
              <p className="text-lg font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-zinc-400" />
                {formatRelativeTime(lastSyncAt)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-500">Folders</p>
              <div className="flex flex-wrap gap-1">
                {folders.length > 0 ? (
                  folders.map(folder => (
                    <Badge key={folder} variant="secondary">{folder}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-zinc-400">None synced</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Synced Emails</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No emails synced yet</p>
              <p className="text-sm">Click &quot;Sync Now&quot; to fetch emails from iCloud</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    !email.seen && "bg-blue-50/50 border-blue-200",
                    email.seen && "bg-white hover:bg-zinc-50"
                  )}
                >
                  <Mail className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    !email.seen ? "text-blue-500" : "text-zinc-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "font-medium truncate",
                        !email.seen && "text-blue-900",
                        !email.subject && !email.from_address && "text-zinc-400 italic"
                      )}>
                        {email.subject || (email.from_address ? '(No subject)' : `(Unable to fetch - UID ${email.uid})`)}
                      </p>
                      <span className="text-xs text-zinc-400 whitespace-nowrap flex-shrink-0">
                        {formatDate(email.date)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 truncate">
                      {email.from_name || email.from_address || 'Unknown sender'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {email.folder}
                      </Badge>
                      {email.has_attachments && (
                        <Badge variant="secondary" className="text-xs">
                          Attachments
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalEmails > emails.length && (
            <p className="text-center text-sm text-zinc-500 mt-4">
              Showing {emails.length} of {totalEmails} emails
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
