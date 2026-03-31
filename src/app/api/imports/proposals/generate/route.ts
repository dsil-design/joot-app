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
      from: fromDate,
      to: toDate,
      force = false,
    } = body as {
      compositeIds?: string[]
      statementUploadId?: string
      emailTransactionIds?: string[]
      source?: string
      currency?: string
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
