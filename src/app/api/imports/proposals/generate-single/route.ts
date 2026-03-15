export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  prefetchRuleEngineContext,
  getProposalsForItems,
  transformProposalRow,
} from '@/lib/proposals/proposal-service'
import { generateHybridProposal } from '@/lib/proposals/hybrid-engine'
import { fetchStatementQueueItems } from '@/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '@/lib/imports/email-queue-builder'
import { aggregateQueueItems } from '@/lib/imports/queue-aggregator'
import { parseImportId } from '@/lib/utils/import-id'
import type { ProposalInput, RuleEngineContext } from '@/lib/proposals/types'

/**
 * POST /api/imports/proposals/generate-single
 *
 * Generate a proposal for a single queue item and return the transformed result.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { compositeId } = await request.json() as { compositeId: string }

    if (!compositeId) {
      return NextResponse.json({ error: 'compositeId is required' }, { status: 400 })
    }

    const parsed = parseImportId(compositeId)
    if (!parsed) {
      return NextResponse.json({ error: `Invalid compositeId format: ${compositeId}` }, { status: 400 })
    }

    // Fetch queue items — merged items only exist after aggregation
    const [statementItems, emailItems] = await Promise.all([
      fetchStatementQueueItems(supabase, user.id, {
        statementUploadId: parsed.type === 'statement' ? parsed.statementId
          : parsed.type === 'merged' ? parsed.statementId : undefined,
      }),
      fetchEmailQueueItems(supabase, user.id, {}),
    ])

    // Run aggregator to produce merged items
    const aggregated = await aggregateQueueItems(supabase, statementItems, emailItems, {
      statusFilter: 'all', currencyFilter: 'all', confidenceFilter: 'all',
      sourceFilter: 'all', searchQuery: '',
    })

    const targetItem = aggregated.items.find((item) => item.id === compositeId)

    if (!targetItem) {
      return NextResponse.json({
        error: 'Queue item not found',
        debug: { compositeId, parsed, totalItems: aggregated.items.length },
      }, { status: 404 })
    }

    // Build proposal input
    // For merged items, prefer the email's parsed description over the raw statement description
    const emailMeta = targetItem.emailMetadata
    const mergedEmail = targetItem.mergedEmailData
    const isMerged = targetItem.source === 'merged'

    const proposalInput: ProposalInput = {
      compositeId,
      sourceType: targetItem.source || 'statement',
      statementUploadId: parsed.type === 'statement' || parsed.type === 'merged' ? parsed.statementId : undefined,
      suggestionIndex: parsed.type === 'statement' || parsed.type === 'merged' ? parsed.index : undefined,
      emailTransactionId: parsed.type === 'email' || parsed.type === 'merged' ? parsed.emailId : undefined,
      description: (isMerged && mergedEmail?.description) ? mergedEmail.description : targetItem.statementTransaction.description,
      amount: targetItem.statementTransaction.amount,
      currency: targetItem.statementTransaction.currency,
      date: targetItem.statementTransaction.date,
      paymentMethodId: targetItem.paymentMethod?.id,
      paymentMethodName: targetItem.paymentMethod?.name,
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
    }

    // Fetch prior rejection feedback for this item (stored in ai_feedback with compositeId in email_subject)
    const { data: priorFeedback } = await supabase
      .from('ai_feedback')
      .select('email_body_preview')
      .eq('user_id', user.id)
      .eq('feedback_type', 'proposal_rejection')
      .eq('email_subject', compositeId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (priorFeedback && priorFeedback.length > 0) {
      proposalInput.rejectionFeedback = priorFeedback
        .map((f) => f.email_body_preview)
        .filter((p): p is string => !!p)
    }

    // Generate proposal directly (not through batch function, for better error reporting)
    const context: RuleEngineContext = {
      ...await prefetchRuleEngineContext(supabase, user.id),
      statementPaymentMethodId: proposalInput.paymentMethodId,
      statementPaymentMethodName: proposalInput.paymentMethodName,
    }

    const engineResult = await generateHybridProposal(proposalInput, context)

    // Store the proposal
    const row = {
      user_id: user.id,
      source_type: proposalInput.sourceType,
      composite_id: compositeId,
      statement_upload_id: proposalInput.statementUploadId || null,
      suggestion_index: proposalInput.suggestionIndex ?? null,
      email_transaction_id: proposalInput.emailTransactionId || null,
      proposed_description: engineResult.fields.description || null,
      proposed_amount: engineResult.fields.amount ?? null,
      proposed_currency: engineResult.fields.currency || null,
      proposed_transaction_type: engineResult.fields.transactionType || null,
      proposed_date: engineResult.fields.date || null,
      proposed_vendor_id: engineResult.fields.vendorId || null,
      proposed_vendor_name_suggestion: engineResult.fields.vendorNameSuggestion || null,
      proposed_payment_method_id: engineResult.fields.paymentMethodId || null,
      proposed_tag_ids: engineResult.fields.tagIds || [],
      field_confidence: engineResult.fieldConfidence,
      overall_confidence: engineResult.overallConfidence,
      engine: engineResult.engine,
      llm_model: engineResult.llmModel || null,
      llm_prompt_tokens: engineResult.llmPromptTokens || null,
      llm_response_tokens: engineResult.llmResponseTokens || null,
      generation_duration_ms: engineResult.durationMs,
      status: 'pending' as const,
    }

    const { error: upsertError } = await supabase
      .from('transaction_proposals')
      .upsert(row, { onConflict: 'composite_id,user_id' })

    if (upsertError) {
      console.error('Proposal upsert error:', upsertError)
      return NextResponse.json({
        error: 'Failed to store proposal',
        detail: upsertError.message,
        input: { compositeId, sourceType: proposalInput.sourceType, parsed },
      }, { status: 500 })
    }

    // Fetch the stored row and transform for the UI
    const proposalRows = await getProposalsForItems(supabase, user.id, [compositeId])
    const storedRow = proposalRows.get(compositeId)

    if (!storedRow) {
      return NextResponse.json({ error: 'Proposal stored but could not be retrieved' }, { status: 500 })
    }

    const [vendorData, pmData, tagData] = await Promise.all([
      supabase.from('vendors').select('id, name').eq('user_id', user.id),
      supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
      supabase.from('tags').select('id, name').eq('user_id', user.id),
    ])

    const nameContext = {
      vendors: new Map((vendorData.data || []).map((v) => [v.id, v.name])),
      paymentMethods: new Map((pmData.data || []).map((pm) => [pm.id, pm.name])),
      tags: new Map((tagData.data || []).map((t) => [t.id, t.name])),
    }

    const proposal = transformProposalRow(storedRow, nameContext)

    return NextResponse.json({
      proposal,
      engine: engineResult.engine,
      durationMs: engineResult.durationMs,
    })
  } catch (error) {
    console.error('Single proposal generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
