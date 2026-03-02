"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailDetailPanel } from "@/components/page-specific/email-detail-panel"
import { useEmailHubActions } from "@/hooks/use-email-hub-actions"
import { useTransactions } from "@/hooks"
import {
  CreateFromImportDialog,
  type CreateFromImportData,
} from "@/components/page-specific/create-from-import-dialog"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"
import { ArrowLeft } from "lucide-react"
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

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogData, setCreateDialogData] = React.useState<CreateFromImportData | null>(null)

  // Actions
  const { skip, linkToTransaction, isProcessing } = useEmailHubActions()
  const { createTransaction } = useTransactions()

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

  // Build back URL preserving filters
  const backUrl = React.useMemo(() => {
    const params = searchParams?.toString()
    return params ? `/imports/emails?${params}` : "/imports/emails"
  }, [searchParams])

  const handleLink = async (emailId: string, txId: string) => {
    await linkToTransaction(emailId, txId)
    router.push(backUrl)
  }

  const handleCreateNew = (emailId: string) => {
    if (!emailTx) return
    setCreateDialogData({
      compositeId: `email:${emailId}`,
      description: emailTx.description || emailTx.subject || "",
      amount: emailTx.amount || 0,
      currency: emailTx.currency || "USD",
      date: emailTx.transaction_date || new Date().toISOString().split("T")[0],
    })
    setCreateDialogOpen(true)
  }

  const handleCreateConfirm = async (
    compositeId: string,
    transactionData: {
      description: string
      amount: number
      currency: string
      date: string
      vendorId?: string
      paymentMethodId?: string
      tagIds?: string[]
      transactionType: string
    }
  ) => {
    const result = await createTransaction({
      description: transactionData.description,
      amount: transactionData.amount,
      originalCurrency: transactionData.currency as "USD" | "THB",
      transactionDate: transactionData.date,
      transactionType: transactionData.transactionType as "expense" | "income",
      vendorId: transactionData.vendorId,
      paymentMethodId: transactionData.paymentMethodId,
      tagIds: transactionData.tagIds,
    })

    if (!result) throw new Error("Failed to create transaction")

    const emailId = compositeId.replace("email:", "")
    await linkToTransaction(emailId, result.id)
    toast.success("Transaction created and linked")
    router.push(backUrl)
  }

  const handleSkip = async (emailId: string) => {
    await skip(emailId)
    router.push(backUrl)
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>
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
        <EmailDetailPanel
          emailTransaction={emailTx}
          onLink={handleLink}
          onCreateNew={handleCreateNew}
          onSkip={handleSkip}
          isProcessing={isProcessing(emailTx.id)}
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Email transaction not found</p>
        </div>
      )}

      {/* Create dialog */}
      <CreateFromImportDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setCreateDialogData(null)
        }}
        data={createDialogData}
        onConfirm={handleCreateConfirm}
      />
    </div>
  )
}
