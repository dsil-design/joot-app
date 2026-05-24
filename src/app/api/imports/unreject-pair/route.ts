import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SuggestionShape {
  transaction_date?: string
  description?: string
  amount?: number
  currency?: string
  status?: string
  foreign_transaction?: { originalAmount?: number; originalCurrency?: string }
}

/**
 * POST /api/imports/unreject-pair
 *
 * Removes a previously rejected email↔statement pairing from
 * `email_transactions.rejected_pair_keys`, allowing the cross-source pairer
 * to consider the pairing again on the next queue load.
 *
 * Body:
 *   { emailId: string, pairKey: string }
 *
 * `pairKey` format matches what the pairer writes: `${statementUploadId}:${suggestionIndex}`.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { emailId?: string; pairKey?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { emailId, pairKey } = body
    if (!emailId || !pairKey) {
      return NextResponse.json(
        { error: 'emailId and pairKey are required' },
        { status: 400 },
      )
    }

    // Pair keys are `${statementUploadId}:${suggestionIndex}` — validate the shape
    // so a typo or stale value can't quietly become a no-op write.
    if (!/^[0-9a-f-]{36}:\d+$/.test(pairKey)) {
      return NextResponse.json(
        { error: 'pairKey must be in the form `<statement-upload-uuid>:<index>`' },
        { status: 400 },
      )
    }

    const { data: row, error: fetchErr } = await supabase
      .from('email_transactions')
      .select('id, rejected_pair_keys')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: 'Email transaction not found' }, { status: 404 })
    }

    const existing: string[] = row.rejected_pair_keys ?? []
    if (!existing.includes(pairKey)) {
      return NextResponse.json({
        ok: true,
        removed: false,
        rejectedPairKeys: existing,
        message: 'Pair key was not in the rejected list (already cleared?)',
      })
    }

    const next = existing.filter((k) => k !== pairKey)
    const { error: updErr } = await supabase
      .from('email_transactions')
      .update({ rejected_pair_keys: next })
      .eq('id', emailId)
      .eq('user_id', user.id)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, removed: true, rejectedPairKeys: next })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/imports/unreject-pair?emailId=...
 *
 * Returns the human-readable details for each pair key in an email's
 * `rejected_pair_keys`, so the UI can show what the user previously rejected.
 *
 * Response: { pairs: [{ pairKey, statementUploadId, suggestionIndex, statementFilename, suggestion: {...} | null }, ...] }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailId = request.nextUrl.searchParams.get('emailId')
    if (!emailId) {
      return NextResponse.json({ error: 'emailId is required' }, { status: 400 })
    }

    const { data: row, error: fetchErr } = await supabase
      .from('email_transactions')
      .select('id, rejected_pair_keys')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: 'Email transaction not found' }, { status: 404 })
    }

    const keys: string[] = row.rejected_pair_keys ?? []
    if (keys.length === 0) {
      return NextResponse.json({ pairs: [] })
    }

    // Parse keys, batch-fetch the referenced statement_uploads in one query.
    type Parsed = { pairKey: string; statementUploadId: string; suggestionIndex: number }
    const parsed: Parsed[] = []
    for (const k of keys) {
      const [stmtId, idxStr] = k.split(':')
      const idx = Number.parseInt(idxStr, 10)
      if (!stmtId || Number.isNaN(idx)) continue
      parsed.push({ pairKey: k, statementUploadId: stmtId, suggestionIndex: idx })
    }

    const stmtIds = Array.from(new Set(parsed.map((p) => p.statementUploadId)))
    const { data: stmts } = await supabase
      .from('statement_uploads')
      .select('id, filename, extraction_log')
      .eq('user_id', user.id)
      .in('id', stmtIds)

    const stmtMap = new Map<string, { filename: string; suggestions: SuggestionShape[] }>()
    for (const s of stmts ?? []) {
      const suggestions = ((s.extraction_log as { suggestions?: SuggestionShape[] } | null)?.suggestions) ?? []
      stmtMap.set(s.id, { filename: s.filename, suggestions })
    }

    const pairs = parsed.map((p) => {
      const stmt = stmtMap.get(p.statementUploadId)
      const suggestion = stmt?.suggestions[p.suggestionIndex] ?? null
      return {
        pairKey: p.pairKey,
        statementUploadId: p.statementUploadId,
        suggestionIndex: p.suggestionIndex,
        statementFilename: stmt?.filename ?? null,
        suggestion,
      }
    })

    return NextResponse.json({ pairs })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
