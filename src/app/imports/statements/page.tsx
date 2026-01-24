'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatementUploadZone } from '@/components/page-specific/statement-upload-zone'
import { DuplicateStatementWarning } from '@/components/page-specific/duplicate-statement-warning'
import { useStatementUpload } from '@/hooks/use-statement-upload'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { createClient } from '@/lib/supabase/client'
import { calculateFileHash } from '@/lib/statements/duplicate-detector'
import type { DuplicateMatch } from '@/lib/statements/duplicate-detector'
import {
  CreditCard,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'

// ============================================================================
// Types
// ============================================================================

interface RecentUpload {
  id: string
  filename: string
  uploaded_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  payment_method_name: string | null
  transactions_extracted: number | null
  transactions_matched: number | null
  transactions_new: number | null
}

interface DuplicateInfo {
  message: string
  duplicates: DuplicateMatch[]
  canForce: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getStatusBadge(status: RecentUpload['status']) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      )
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function StatementsPage() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([])
  const [recentUploadsLoading, setRecentUploadsLoading] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Hooks
  const { paymentMethods, loading: paymentMethodsLoading } = usePaymentMethods()
  const { uploadState, uploadFile, reset, isUploading } = useStatementUpload()

  // Fetch recent uploads
  const fetchRecentUploads = useCallback(async () => {
    try {
      setRecentUploadsLoading(true)

      const { data, error } = await supabase
        .from('statement_uploads')
        .select(`
          id,
          filename,
          uploaded_at,
          status,
          transactions_extracted,
          transactions_matched,
          transactions_new,
          payment_methods!inner(name)
        `)
        .order('uploaded_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching recent uploads:', error)
        return
      }

      const formattedUploads: RecentUpload[] = (data || []).map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        uploaded_at: upload.uploaded_at,
        status: upload.status as RecentUpload['status'],
        payment_method_name: (upload.payment_methods as { name: string } | null)?.name || null,
        transactions_extracted: upload.transactions_extracted,
        transactions_matched: upload.transactions_matched,
        transactions_new: upload.transactions_new,
      }))

      setRecentUploads(formattedUploads)
    } catch (error) {
      console.error('Failed to fetch recent uploads:', error)
    } finally {
      setRecentUploadsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRecentUploads()
  }, [fetchRecentUploads])

  // Handle file acceptance - validate and prepare for upload
  const handleFileAccepted = useCallback(async (file: File) => {
    // Store the file for later upload
    setPendingFile(file)
    setDuplicateInfo(null)

    // If no payment method selected, just store the file
    if (!selectedPaymentMethodId) {
      return
    }

    // Proceed with upload
    await processUpload(file)
  }, [selectedPaymentMethodId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Process the actual upload
  const processUpload = useCallback(async (file: File, forceUpload = false) => {
    if (!selectedPaymentMethodId) {
      return
    }

    setIsSubmitting(true)
    setDuplicateInfo(null)

    try {
      // Calculate file hash for duplicate detection
      const fileHash = await calculateFileHash(file)

      // Generate upload ID
      const uploadId = crypto.randomUUID()

      // First, upload the file to storage
      const uploadResult = await uploadFile(file, uploadId)

      if (!uploadResult.success) {
        setIsSubmitting(false)
        return
      }

      // Then, create the database record
      // Note: Statement period will be extracted from PDF during processing
      const response = await fetch('/api/statements/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: uploadResult.path,
          payment_method_id: selectedPaymentMethodId,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          file_hash: fileHash,
          force_upload: forceUpload,
        }),
      })

      const data = await response.json()

      if (response.status === 409 && data.duplicates) {
        // Duplicate detected - show warning
        setDuplicateInfo({
          message: data.message,
          duplicates: data.duplicates,
          canForce: data.can_force,
        })
        reset() // Reset upload zone to allow retry
        setIsSubmitting(false)
        return
      }

      if (!response.ok) {
        console.error('API error:', data.error)
        setIsSubmitting(false)
        return
      }

      // Success - navigate to results page
      setPendingFile(null)
      router.push(`/imports/statements/${data.upload_id}/results`)

    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedPaymentMethodId, uploadFile, reset, router])

  // Handle force upload after duplicate warning
  const handleForceUpload = useCallback(async () => {
    if (!pendingFile) return
    await processUpload(pendingFile, true)
  }, [pendingFile, processUpload])

  // Handle duplicate warning cancel
  const handleCancelDuplicate = useCallback(() => {
    setDuplicateInfo(null)
    setPendingFile(null)
    reset()
  }, [reset])

  // Handle payment method change - process pending file if exists
  const handlePaymentMethodChange = useCallback((value: string) => {
    setSelectedPaymentMethodId(value)

    // If there's a pending file, process it now
    if (pendingFile && value) {
      processUpload(pendingFile)
    }
  }, [pendingFile, processUpload])

  // Reset handler
  const handleReset = useCallback(() => {
    reset()
    setPendingFile(null)
    setDuplicateInfo(null)
  }, [reset])

  // Delete statement handler
  const handleDeleteStatement = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this statement? This cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/statements/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Delete failed:', data.error)
        alert('Failed to delete statement')
        return
      }

      // Remove from list
      setRecentUploads(prev => prev.filter(u => u.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete statement')
    } finally {
      setDeletingId(null)
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-medium">Upload Statement</h2>
        <p className="text-muted-foreground mt-1">
          Upload a credit card statement to match transactions with receipts
        </p>
      </div>

      {/* Statement Type Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Statement Type</CardTitle>
          <CardDescription>
            Select the payment method for this statement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethodsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              No payment methods found.{' '}
              <Link href="/settings/payment-methods" className="text-primary underline">
                Add one in settings
              </Link>
            </div>
          ) : (
            <RadioGroup
              value={selectedPaymentMethodId || ''}
              onValueChange={handlePaymentMethodChange}
              className="gap-3"
            >
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center gap-3">
                  <RadioGroupItem value={pm.id} id={pm.id} />
                  <Label
                    htmlFor={pm.id}
                    className="flex items-center gap-2 cursor-pointer font-normal"
                  >
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    {pm.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Warning */}
      {duplicateInfo && (
        <DuplicateStatementWarning
          duplicates={duplicateInfo.duplicates}
          message={duplicateInfo.message}
          canForce={duplicateInfo.canForce}
          onForceUpload={handleForceUpload}
          onCancel={handleCancelDuplicate}
          isForcing={isSubmitting}
        />
      )}

      {/* Upload Zone */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Upload File</CardTitle>
          <CardDescription>
            {!selectedPaymentMethodId
              ? 'Select a payment method above to enable upload'
              : 'Drag and drop your statement file or click to browse'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatementUploadZone
            onFileAccepted={handleFileAccepted}
            uploadState={uploadState.state}
            uploadProgress={uploadState.progress}
            errorMessage={uploadState.error ?? undefined}
            successFileName={uploadState.uploadedFile?.name}
            successFileSize={uploadState.uploadedFile?.size}
            onReset={handleReset}
            disabled={!selectedPaymentMethodId || isSubmitting}
          />

          {!selectedPaymentMethodId && (
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Please select a statement type above to enable file upload
            </p>
          )}

          {isSubmitting && !isUploading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating upload record...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      <div>
        <h3 className="text-lg font-medium mb-4">Recent Uploads</h3>

        {recentUploadsLoading ? (
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
        ) : recentUploads.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No statements uploaded yet</p>
                <p className="text-xs mt-1">
                  Upload your first statement to get started
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentUploads.map((upload) => (
              <Card key={upload.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 rounded-lg bg-muted p-2.5">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {upload.payment_method_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {upload.filename}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        {upload.status === 'completed' && upload.transactions_extracted !== null ? (
                          <>
                            <p className="text-sm">
                              {upload.transactions_extracted} transactions
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {upload.transactions_matched} matched
                              {upload.transactions_new ? `, ${upload.transactions_new} new` : ''}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(upload.uploaded_at)}
                          </p>
                        )}
                      </div>

                      {getStatusBadge(upload.status)}

                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 w-8 p-0"
                      >
                        <Link href={`/imports/statements/${upload.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">View results</span>
                        </Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault()
                          handleDeleteStatement(upload.id)
                        }}
                        disabled={deletingId === upload.id}
                      >
                        {deletingId === upload.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Delete statement</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {recentUploads.length >= 5 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/imports/history">
                    View all uploads
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
