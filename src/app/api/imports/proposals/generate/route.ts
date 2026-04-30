export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAndStoreProposals } from '@/lib/proposals/proposal-service'
import { fetchStatementQueueItems } from '@/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '@/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '@/lib/imports/payment-slip-queue-builder'
import type { ProposalInput } from '@/lib/proposals/types'

/**
 * POST /api/imports/proposals/generate
 *
 * Trigger batch proposal generation for import queue items.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      compositeIds,
      statementUploadId,
      emailTransactionIds,
      source,
      currency,
      status,
      confidence,
      from: fromDate,
      to: toDate,
      force = false,
    } = body as {
      compositeIds?: string[]
      statementUploadId?: string
      emailTransactionIds?: string[]
      source?: string
      currency?: string
      status?: string
      confidence?: string
      from?: string
      to?: string
      force?: boolean
    }

    // Determine which sources to fetch based on filters
    const shouldFetchStatements = !source || source === 'statement' || source === 'merged'
    const shouldFetchEmails = !statementUploadId && (!source || source === 'email' || source === 'merged')
    const shouldFetchSlips = !statementUploadId && (!source || source === 'payment_slip')

    const fetchOpts = {
      statementUploadId: statementUploadId || undefined,
      currencyFilter: currency,
      fromDate,
      toDate,
    }

    // Fetch queue items to generate proposals for
    const [statementItems, emailItems, slipItems] = await Promise.all([
      shouldFetchStatements
        ? fetchStatementQueueItems(supabase, user.id, fetchOpts)
        : Promise.resolve([]),
      shouldFetchEmails
        ? fetchEmailQueueItems(supabase, user.id, {
            currencyFilter: currency,
            fromDate,
            toDate,
          })
        : Promise.resolve([]),
      shouldFetchSlips
        ? fetchPaymentSlipQueueItems(supabase, user.id, {
            currencyFilter: currency,
            fromDate,
            toDate,
          })
        : Promise.resolve([]),
    ])

    // Combine all items
    const allItems = [...statementItems, ...emailItems, ...slipItems]

    // Filter to only new (unmatched) items
    let targetItems = allItems.filter((item) => item.isNew)

    // Honor the same status/confidence filters the review queue UI applies, so
    // bulk generate only targets the items currently visible to the user.
    if (status && status !== 'all') {
      targetItems = targetItems.filter((item) => item.status === status)
    }
    if (confidence && confidence !== 'all') {
      targetItems = targetItems.filter((item) => item.confidenceLevel === confidence)
    }

    // Apply filters
    if (compositeIds && compositeIds.length > 0) {
      const idSet = new Set(compositeIds)
      targetItems = targetItems.filter((item) => idSet.has(item.id))
    }
    if (emailTransactionIds && emailTransactionIds.length > 0) {
      const emailIdSet = new Set(emailTransactionIds)
      targetItems = targetItems.filter((item) => {
        if (item.source === 'email') {
          const parts = item.id.split(':')
          return emailIdSet.has(parts[1])
        }
        return true
      })
    }

    // Convert queue items to ProposalInput format
    const proposalInputs: ProposalInput[] = targetItems.map((item) => {
      const parts = item.id.split(':')
      const emailMeta = item.emailMetadata
      const mergedEmail = item.mergedEmailData
      const slipMeta = item.paymentSlipMetadata
      const isMerged = item.source === 'merged'
      const isSlip = item.source === 'payment_slip'

      return {
        compositeId: item.id,
        sourceType: item.source || 'statement',
        statementUploadId: item.statementUploadId || (parts[0] === 'stmt' ? parts[1] : undefined),
        suggestionIndex: parts[0] === 'stmt' ? parseInt(parts[2], 10) : undefined,
        emailTransactionId: parts[0] === 'email' ? parts[1] : undefined,
        // For merged items, prefer the email's parsed description over the raw statement description
        description: (isMerged && mergedEmail?.description)
          ? mergedEmail.description
          : (isMerged && item.mergedPaymentSlipData?.description)
            ? item.mergedPaymentSlipData.description
            : item.statementTransaction.description,
        amount: item.statementTransaction.amount,
        currency: item.statementTransaction.currency,
        date: item.statementTransaction.date,
        paymentMethodId: item.paymentMethod?.id,
        paymentMethodName: item.paymentMethod?.name,
        // Email-specific fields for proposal engine
        subject: emailMeta?.subject,
        fromAddress: emailMeta?.fromAddress,
        fromName: emailMeta?.fromName,
        vendorId: emailMeta?.vendorId,
        vendorNameRaw: emailMeta?.vendorNameRaw,
        parserKey: emailMeta?.parserKey,
        classification: emailMeta?.classification,
        extractionConfidence: emailMeta?.extractionConfidence,
        paymentCardLastFour: emailMeta?.paymentCardLastFour,
        paymentCardType: emailMeta?.paymentCardType,
        // Payment slip description (available on slip-only or merged slip+statement items)
        ...((isSlip || item.mergedPaymentSlipData) && {
          paymentSlipDescription: isSlip
            ? item.statementTransaction.description
            : item.mergedPaymentSlipData?.description,
        }),
        // Payment slip-specific fields (for slip-only or merged slip+statement items)
        ...((isSlip || isMerged) && slipMeta && {
          paymentSlipUploadId: slipMeta.slipUploadId,
          senderName: slipMeta.senderName,
          recipientName: slipMeta.recipientName,
          bankDetected: slipMeta.bankDetected,
          detectedDirection: slipMeta.detectedDirection ?? undefined,
        }),
      }
    })

    // Multi-source enrichment: bulk-load extra email/slip context for any
    // items that have manually-attached extras, then attach to their inputs.
    const allExtraEmailIds = Array.from(
      new Set(targetItems.flatMap((i) => i.extraEmailIds ?? []))
    )
    const allExtraSlipIds = Array.from(
      new Set(targetItems.flatMap((i) => i.extraSlipIds ?? []))
    )
    if (allExtraEmailIds.length > 0 || allExtraSlipIds.length > 0) {
      const [emailRes, slipRes] = await Promise.all([
        allExtraEmailIds.length > 0
          ? supabase
              .from('email_transactions')
              .select('id, subject, from_name, from_address, description, amount, currency, transaction_date')
              .in('id', allExtraEmailIds)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] as any[] }),
        allExtraSlipIds.length > 0
          ? supabase
              .from('payment_slip_uploads')
              .select('id, sender_name, recipient_name, memo, amount, currency, transaction_date')
              .in('id', allExtraSlipIds)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] as any[] }),
      ])
      const emailById = new Map((emailRes.data || []).map((e) => [e.id, e]))
      const slipById = new Map((slipRes.data || []).map((s) => [s.id, s]))

      proposalInputs.forEach((input, i) => {
        const item = targetItems[i]
        if (item.extraEmailIds && item.extraEmailIds.length > 0) {
          input.extraEmailContext = item.extraEmailIds
            .map((id) => emailById.get(id))
            .filter((e): e is NonNullable<typeof e> => !!e)
            .map((e) => ({
              subject: e.subject ?? undefined,
              fromName: e.from_name ?? undefined,
              fromAddress: e.from_address ?? undefined,
              description: e.description ?? undefined,
              amount: e.amount != null ? Number(e.amount) : undefined,
              currency: e.currency ?? undefined,
              date: e.transaction_date ?? undefined,
            }))
        }
        if (item.extraSlipIds && item.extraSlipIds.length > 0) {
          input.extraSlipContext = item.extraSlipIds
            .map((id) => slipById.get(id))
            .filter((s): s is NonNullable<typeof s> => !!s)
            .map((s) => ({
              senderName: s.sender_name ?? undefined,
              recipientName: s.recipient_name ?? undefined,
              memo: s.memo ?? undefined,
              amount: s.amount != null ? Number(s.amount) : undefined,
              currency: s.currency ?? undefined,
              date: s.transaction_date ?? undefined,
            }))
        }
      })
    }

    const result = await generateAndStoreProposals(supabase, user.id, proposalInputs, { force })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Proposal generation API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
