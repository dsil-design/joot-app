export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAndStoreProposals } from '@/lib/proposals/proposal-service'
import { fetchStatementQueueItems } from '@/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '@/lib/imports/email-queue-builder'
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
      force = false,
    } = body as {
      compositeIds?: string[]
      statementUploadId?: string
      emailTransactionIds?: string[]
      force?: boolean
    }

    // Fetch queue items to generate proposals for
    // When scoped to a specific statement, skip email items entirely
    const [statementItems, emailItems] = await Promise.all([
      fetchStatementQueueItems(supabase, user.id, {
        statementUploadId: statementUploadId || undefined,
      }),
      statementUploadId
        ? Promise.resolve([])
        : fetchEmailQueueItems(supabase, user.id, {}),
    ])

    // Combine all items
    const allItems = [...statementItems, ...emailItems]

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
      const isMerged = item.source === 'merged'

      return {
        compositeId: item.id,
        sourceType: item.source || 'statement',
        statementUploadId: item.statementUploadId || (parts[0] === 'stmt' ? parts[1] : undefined),
        suggestionIndex: parts[0] === 'stmt' ? parseInt(parts[2], 10) : undefined,
        emailTransactionId: parts[0] === 'email' ? parts[1] : undefined,
        // For merged items, prefer the email's parsed description over the raw statement description
        description: (isMerged && mergedEmail?.description) ? mergedEmail.description : item.statementTransaction.description,
        amount: item.statementTransaction.amount,
        currency: item.statementTransaction.currency,
        date: item.statementTransaction.date,
        paymentMethodId: item.paymentMethod?.id,
        paymentMethodName: item.paymentMethod?.name,
        // Email-specific fields for proposal engine
        fromAddress: emailMeta?.fromAddress,
        fromName: emailMeta?.fromName,
        vendorId: emailMeta?.vendorId,
        parserKey: emailMeta?.parserKey,
        classification: emailMeta?.classification,
        extractionConfidence: emailMeta?.extractionConfidence,
        paymentCardLastFour: emailMeta?.paymentCardLastFour,
        paymentCardType: emailMeta?.paymentCardType,
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
