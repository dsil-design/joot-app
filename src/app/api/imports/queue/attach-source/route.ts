import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseImportId } from '@/lib/utils/import-id'

/**
 * POST /api/imports/queue/attach-source
 *
 * Manually attach an additional source to a Review Queue item, identified by
 * its composite ID. Works whether or not a proposal has already been generated.
 *
 * The new source's composite key is appended to the `manual_pair_keys` array
 * on whichever existing source can store it (email_transactions or
 * payment_slip_uploads). The aggregator's Phase 0 reads these keys on the
 * next queue fetch and forces the merge.
 *
 * If a pending proposal exists for this composite_id, it is marked `stale`
 * (the next fetch will regroup it under a new merged composite_id anyway).
 *
 * Body:
 *   compositeId:      queue item composite id (e.g. `email:abc`, `stmt:xyz:0`)
 *   sourceType:       'email' | 'payment_slip' | 'statement'
 *   sourceId:         uuid of the new source row
 *   suggestionIndex?: number (required for statement)
 *
 * Limitations (v1):
 *   - At least one side of the resulting pair must be email or payment slip
 *     (statement-only storage isn't implemented yet). Returns 400 otherwise.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: {
      compositeId?: string
      sourceType?: string
      sourceId?: string
      suggestionIndex?: number
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { compositeId, sourceType, sourceId, suggestionIndex } = body
    if (!compositeId || !sourceType || !sourceId) {
      return NextResponse.json(
        { error: 'compositeId, sourceType and sourceId are required' },
        { status: 400 }
      )
    }
    if (!['email', 'payment_slip', 'statement'].includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }
    if (sourceType === 'statement' && (suggestionIndex == null || suggestionIndex < 0)) {
      return NextResponse.json(
        { error: 'suggestionIndex is required for statement sources' },
        { status: 400 }
      )
    }

    const parsed = parseImportId(compositeId)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid compositeId' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    // Determine the existing item's email_id, slip_id, and (statement_id, index).
    // These are used to (a) pick the storage side and (b) compute the anchor key
    // when the storage side IS the new source.
    let existingEmailId: string | null = null
    let existingSlipId: string | null = null
    let existingStmt: { id: string; index: number } | null = null

    switch (parsed.type) {
      case 'email':
        existingEmailId = parsed.emailId
        break
      case 'payment_slip':
        existingSlipId = parsed.slipId
        break
      case 'statement':
        existingStmt = { id: parsed.statementId, index: parsed.index }
        break
      case 'merged':
        existingEmailId = parsed.emailId
        existingStmt = { id: parsed.statementId, index: parsed.index }
        break
      case 'merged_slip_email':
        existingEmailId = parsed.emailId
        existingSlipId = parsed.slipId
        break
      case 'merged_slip_stmt':
        existingSlipId = parsed.slipId
        existingStmt = { id: parsed.statementId, index: parsed.index }
        break
      case 'merged_slip_email_stmt':
        existingEmailId = parsed.emailId
        existingSlipId = parsed.slipId
        existingStmt = { id: parsed.statementId, index: parsed.index }
        break
      default:
        return NextResponse.json(
          { error: `Composite type ${parsed.type} not supported for attach` },
          { status: 400 }
        )
    }

    // The new source's composite key.
    const newSourceKey =
      sourceType === 'email'
        ? `email:${sourceId}`
        : sourceType === 'payment_slip'
          ? `slip:${sourceId}`
          : `stmt:${sourceId}:${suggestionIndex}`

    // Pick the storage side. Prefer the existing item's email/slip; fall back
    // to the new source itself if it's an email or slip.
    type StorageSide = { kind: 'email' | 'slip'; id: string; isNewSource: boolean }
    let storageSide: StorageSide | null = null

    if (existingEmailId) {
      storageSide = { kind: 'email', id: existingEmailId, isNewSource: false }
    } else if (existingSlipId) {
      storageSide = { kind: 'slip', id: existingSlipId, isNewSource: false }
    } else if (sourceType === 'email') {
      storageSide = { kind: 'email', id: sourceId, isNewSource: true }
    } else if (sourceType === 'payment_slip') {
      storageSide = { kind: 'slip', id: sourceId, isNewSource: true }
    }

    if (!storageSide) {
      return NextResponse.json(
        {
          error:
            'Manual attach for statement-only items + statement sources is not yet supported. The pair must include at least one email or payment slip.',
        },
        { status: 400 }
      )
    }

    // Compute which key(s) to write into the storage side's manual_pair_keys.
    // - If storage side is the EXISTING item's source: write the new source's key.
    // - If storage side is the NEW source itself: write the existing item's
    //   anchor key (statement, since that's the only case this branch fires).
    const keysToAdd: string[] = []
    if (storageSide.isNewSource) {
      if (existingStmt) keysToAdd.push(`stmt:${existingStmt.id}:${existingStmt.index}`)
    } else {
      keysToAdd.push(newSourceKey)
    }

    if (keysToAdd.length === 0) {
      return NextResponse.json(
        { error: 'Could not determine pair key to store' },
        { status: 400 }
      )
    }

    // Verify the new source belongs to this user and isn't already linked
    // somewhere conflicting. (Skipped if the new source IS the storage side
    // and we already verified it via storageSide ownership lookup below.)
    if (sourceType === 'email') {
      const { data: email, error } = await service
        .from('email_transactions')
        .select('id, matched_transaction_id')
        .eq('id', sourceId)
        .eq('user_id', user.id)
        .single()
      if (error || !email) {
        return NextResponse.json({ error: 'Email source not found' }, { status: 404 })
      }
      if (email.matched_transaction_id) {
        return NextResponse.json(
          {
            error: 'Email is already linked to a transaction. Unlink it first.',
            conflictTransactionId: email.matched_transaction_id,
          },
          { status: 409 }
        )
      }
    } else if (sourceType === 'payment_slip') {
      const { data: slip, error } = await service
        .from('payment_slip_uploads')
        .select('id, matched_transaction_id')
        .eq('id', sourceId)
        .eq('user_id', user.id)
        .single()
      if (error || !slip) {
        return NextResponse.json({ error: 'Payment slip source not found' }, { status: 404 })
      }
      if (slip.matched_transaction_id) {
        return NextResponse.json(
          {
            error: 'Payment slip is already linked to a transaction. Unlink it first.',
            conflictTransactionId: slip.matched_transaction_id,
          },
          { status: 409 }
        )
      }
    } else {
      // statement: validate the row index
      const { data: stmt, error } = await service
        .from('statement_uploads')
        .select('id, extraction_log')
        .eq('id', sourceId)
        .eq('user_id', user.id)
        .single()
      if (error || !stmt) {
        return NextResponse.json({ error: 'Statement source not found' }, { status: 404 })
      }
      const log = stmt.extraction_log as { suggestions?: Array<Record<string, unknown>> } | null
      const suggestions = log?.suggestions ?? []
      const idx = suggestionIndex as number
      if (idx < 0 || idx >= suggestions.length) {
        return NextResponse.json({ error: 'Invalid suggestionIndex' }, { status: 400 })
      }
      const existingMatch = suggestions[idx].matched_transaction_id as string | undefined
      if (existingMatch) {
        return NextResponse.json(
          {
            error: 'Statement row is already linked to a transaction. Unlink it first.',
            conflictTransactionId: existingMatch,
          },
          { status: 409 }
        )
      }
    }

    const table = storageSide.kind === 'email' ? 'email_transactions' : 'payment_slip_uploads'

    // Read-modify-write to dedupe + clear conflicting rejected entries.
    const { data: storageRow, error: readErr } = await service
      .from(table)
      .select('id, manual_pair_keys, rejected_pair_keys')
      .eq('id', storageSide.id)
      .eq('user_id', user.id)
      .single()
    if (readErr || !storageRow) {
      return NextResponse.json(
        { error: 'Failed to load pair-storage source row' },
        { status: 500 }
      )
    }

    const existingManual =
      (storageRow as { manual_pair_keys?: string[] }).manual_pair_keys ?? []
    const existingRejected =
      (storageRow as { rejected_pair_keys?: string[] }).rejected_pair_keys ?? []
    const nextManual = Array.from(new Set([...existingManual, ...keysToAdd]))
    const nextRejected = existingRejected.filter((k) => !keysToAdd.includes(k))

    const { error: updateErr } = await service
      .from(table)
      .update({ manual_pair_keys: nextManual, rejected_pair_keys: nextRejected })
      .eq('id', storageSide.id)
    if (updateErr) {
      console.error('Failed to write manual_pair_keys:', updateErr)
      return NextResponse.json({ error: 'Failed to save manual pair' }, { status: 500 })
    }

    // If a pending proposal exists for this composite_id, mark it stale so the
    // queue regenerates a fresh proposal from the new combined source set.
    await service
      .from('transaction_proposals')
      .update({ status: 'stale' })
      .eq('user_id', user.id)
      .eq('composite_id', compositeId)
      .eq('status', 'pending')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Queue attach-source error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
