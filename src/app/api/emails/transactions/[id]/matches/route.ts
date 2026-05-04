import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rankMatches } from '@/lib/matching/match-ranker'
import type { SourceTransaction, TargetTransaction } from '@/lib/matching/match-scorer'
import { CONFIDENCE_THRESHOLDS } from '@/lib/matching/match-scorer'
import { buildBundleForEmail } from '@/lib/matching/email-bundler'
import { scoreBundleAgainstTargets } from '@/lib/matching/bundle-scorer'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/emails/transactions/[id]/matches
 *
 * Returns match suggestions for an email transaction.
 * Queries candidate transactions within a date window and ranks them.
 *
 * Query Parameters:
 * - dateWindowDays: number (default: 7) - days before/after to search
 *
 * Returns:
 * - email_transaction: the email transaction data
 * - suggestions: ranked match suggestions with scores
 * - stats: match statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid email transaction ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse options
    const { searchParams } = new URL(request.url)
    const dateWindowDays = parseInt(searchParams.get('dateWindowDays') || '7', 10)

    // Fetch the email transaction (including rejected_transaction_ids to filter them out)
    const { data: emailTx, error: fetchError } = await supabase
      .from('email_transactions')
      .select(`
        id, subject, from_address, from_name, email_date,
        vendor_id, vendor_name_raw, amount, currency, transaction_date,
        description, order_id, matched_transaction_id, match_confidence,
        match_method, status, classification, extraction_confidence,
        extraction_notes, processed_at, matched_at,
        rejected_transaction_ids,
        vendors:vendor_id (id, name)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !emailTx) {
      return NextResponse.json(
        { error: 'Email transaction not found' },
        { status: 404 }
      )
    }

    // If already matched, return the linked transaction info
    if (emailTx.matched_transaction_id) {
      const { data: linkedTx } = await supabase
        .from('transactions')
        .select(`
          id, description, amount, original_currency, transaction_date,
          vendor_id, vendors:vendor_id (id, name),
          payment_methods:payment_method_id (id, name),
          source_email_transaction_id, source_statement_upload_id
        `)
        .eq('id', emailTx.matched_transaction_id)
        .single()

      return NextResponse.json({
        email_transaction: emailTx,
        linked_transaction: linkedTx || null,
        suggestions: [],
        stats: {
          totalCandidates: 0,
          matchingCandidates: 0,
          highConfidenceCount: 0,
          avgScore: 0,
        },
      })
    }

    // Need amount and date to find candidates
    if (!emailTx.amount || !emailTx.transaction_date) {
      return NextResponse.json({
        email_transaction: emailTx,
        suggestions: [],
        stats: {
          totalCandidates: 0,
          matchingCandidates: 0,
          highConfidenceCount: 0,
          avgScore: 0,
        },
      })
    }

    // Calculate date window
    const txDate = new Date(emailTx.transaction_date)
    const dateFrom = new Date(txDate)
    dateFrom.setDate(dateFrom.getDate() - dateWindowDays)
    const dateTo = new Date(txDate)
    dateTo.setDate(dateTo.getDate() + dateWindowDays)

    // Fetch candidate transactions
    const { data: candidates, error: candError } = await supabase
      .from('transactions')
      .select(`
        id, description, amount, original_currency, transaction_date,
        vendor_id, vendors:vendor_id (id, name),
        payment_methods:payment_method_id (id, name),
        source_email_transaction_id, source_statement_upload_id
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', dateFrom.toISOString().split('T')[0])
      .lte('transaction_date', dateTo.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false })
      .limit(50)

    if (candError) {
      console.error('Error fetching candidates:', candError)
      return NextResponse.json(
        { error: 'Failed to fetch candidate transactions' },
        { status: 500 }
      )
    }

    // Exclude transactions the user previously rejected for this email
    const rejectedIds = new Set(((emailTx as Record<string, unknown>).rejected_transaction_ids as string[] | null) || [])
    const filteredCandidates = rejectedIds.size > 0
      ? (candidates || []).filter((c) => !rejectedIds.has(c.id))
      : (candidates || [])

    // Build source transaction
    const vendorName = (emailTx.vendors as { name: string } | null)?.name || emailTx.vendor_name_raw || ''
    const source: SourceTransaction = {
      amount: Number(emailTx.amount),
      currency: emailTx.currency || 'USD',
      date: emailTx.transaction_date,
      vendor: vendorName,
      description: emailTx.description || undefined,
    }

    // Build target transactions
    const targets: TargetTransaction[] = filteredCandidates.map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      currency: tx.original_currency,
      date: tx.transaction_date,
      vendor: (tx.vendors as { name: string } | null)?.name || tx.description || '',
      description: tx.description || undefined,
    }))

    // Rank matches (pass supabase for cross-currency exchange rate lookups)
    const ranked = await rankMatches(source, targets, { supabase })

    // Enrich suggestions with transaction details
    const enrichedSuggestions = ranked.suggestions.map((suggestion) => {
      const candidate = filteredCandidates.find((c) => c.id === suggestion.targetId)
      return {
        ...suggestion,
        transaction: candidate || null,
      }
    })

    // For split-receipt vendors (e.g. Lazada), also score the focal email as
    // part of a multi-email bundle against each candidate. The bundler returns
    // null when the focal isn't an allowlisted vendor or no siblings exist —
    // in that case we skip bundle scoring entirely.
    let bundleSuggestions: Array<{
      targetId: string
      memberIds: string[]
      totalNativeAmount: number
      nativeCurrency: string
      convertedAmount: number
      rateQuality: number
      score: number
      confidence: string
      isMatch: boolean
      reasons: string[]
      vendorLabel: string
      transaction: typeof filteredCandidates[number] | null
    }> = []
    let bundleMembers: Array<{ id: string; amount: number; currency: string; order_id?: string; description?: string; transaction_date: string }> | null = null

    const bundle = await buildBundleForEmail(supabase, id, user.id)
    if (bundle) {
      bundleMembers = bundle.members.map((m) => ({
        id: m.id,
        amount: m.amount,
        currency: m.currency,
        order_id: m.order_id,
        description: m.description,
        transaction_date: m.transaction_date,
      }))
      const bundleScored = await scoreBundleAgainstTargets(bundle, targets, supabase)
      bundleSuggestions = bundleScored
        .filter((r) => r.isMatch && r.score >= CONFIDENCE_THRESHOLDS.MEDIUM)
        .slice(0, 3)
        .map((r) => ({
          targetId: r.targetId,
          memberIds: r.memberIds,
          totalNativeAmount: r.totalNativeAmount,
          nativeCurrency: r.nativeCurrency,
          convertedAmount: r.convertedAmount,
          rateQuality: r.rateQuality,
          score: r.score,
          confidence: r.confidence,
          isMatch: r.isMatch,
          reasons: r.reasons,
          vendorLabel: r.vendorLabel,
          transaction: filteredCandidates.find((c) => c.id === r.targetId) || null,
        }))
    }

    return NextResponse.json({
      email_transaction: emailTx,
      suggestions: enrichedSuggestions,
      bundle: bundle
        ? {
            vendorLabel: bundle.vendorLabel,
            members: bundleMembers,
          }
        : null,
      bundleSuggestions,
      stats: ranked.stats,
      status: ranked.status,
      reason: ranked.reason,
      requiresReview: ranked.requiresReview,
    })
  } catch (error) {
    console.error('Error in matches endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
