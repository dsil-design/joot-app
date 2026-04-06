"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailDetailPanel } from "@/components/page-specific/email-detail-panel"
import { useEmailHubActions } from "@/hooks/use-email-hub-actions"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"
import { ArrowLeft } from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/page-specific/delete-confirmation-dialog"
import { toast } from "sonner"

export default function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emailTx, setEmailTx] = React.useState<EmailTransactionRow | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [resolvedId, setResolvedId] = React.useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isReopening, setIsReopening] = React.useState(false)

  // Actions
  const { processEmail, isProcessing, isExtracting } = useEmailHubActions({
    onItemUpdate: (_id, data) => {
      setEmailTx((prev) => prev ? { ...prev, ...data } as EmailTransactionRow : prev)
    },
  })

  // Resolve params
  React.useEffect(() => {
    params.then((p) => setResolvedId(p.id))
  }, [params])

  // Fetch email transaction
  React.useEffect(() => {
    if (!resolvedId) return

    async function fetchEmail() {
      setIsLoading(true)
      try {
        const detailResponse = await fetch(`/api/emails/transactions/${resolvedId}/matches`)
        if (!detailResponse.ok) throw new Error("Failed to fetch email details")
        const data = await detailResponse.json()
        setEmailTx(data.email_transaction)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmail()
  }, [resolvedId])

  const handleReopen = async () => {
    if (!resolvedId) return
    setIsReopening(true)
    try {
      const res = await fetch('/api/imports/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compositeIds: [`email:${resolvedId}`] }),
      })
      if (res.ok) {
        toast.success('Email transaction reopened for review')
        // Refresh to pick up new status
        const detailResponse = await fetch(`/api/emails/transactions/${resolvedId}/matches`)
        if (detailResponse.ok) {
          const data = await detailResponse.json()
          setEmailTx(data.email_transaction)
        }
      } else {
        toast.error('Failed to reopen email transaction')
      }
    } catch {
      toast.error('Failed to reopen email transaction')
    } finally {
      setIsReopening(false)
    }
  }

  const handleDelete = async () => {
    if (!resolvedId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/emails/transactions/${resolvedId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Email transaction deleted')
        router.push(backUrl)
      } else {
        toast.error('Failed to delete email transaction')
      }
    } catch {
      toast.error('Failed to delete email transaction')
    } finally {
      setIsDeleting(false)
    }
  }

  // Build back URL preserving filters
  const backUrl = React.useMemo(() => {
    const params = searchParams?.toString()
    return params ? `/imports/emails?${params}` : "/imports/emails"
  }, [searchParams])

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="default" onClick={() => router.push(backUrl)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Emails
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-destructive">{error}</p>
        </div>
      ) : emailTx ? (
        <>
          <EmailDetailPanel
            emailTransaction={emailTx}
            onProcess={(emailId) => processEmail(emailId)}
            onDelete={() => setDeleteConfirmOpen(true)}
            onReopen={handleReopen}
            isProcessing={isProcessing(emailTx.id)}
            isProcessingExtraction={isExtracting(emailTx.id)}
            isDeleting={isDeleting}
            isReopening={isReopening}
          />
          <DeleteConfirmationDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            onConfirm={handleDelete}
            title="Delete email transaction?"
            description="This will permanently delete this email transaction record. The original email will not be affected."
            isDeleting={isDeleting}
          />
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Email transaction not found</p>
        </div>
      )}
    </div>
  )
}
