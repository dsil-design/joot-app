import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { makeStatementId, makeEmailId, makeMergedId } from '@/lib/utils/import-id'
import { findCrossSourcePairs, type PairCandidate } from '@/lib/matching/cross-source-pairer'

/**
 * GET /api/imports/queue
 *
 * Fetches the unified review queue from statement uploads and email transactions.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - status: 'all' | 'pending' | 'approved' | 'rejected' (default: 'all')
 * - currency: string (default: 'all')
 * - confidence: 'all' | 'high' | 'medium' | 'low' (default: 'all')
 * - search: string (optional)
 * - from: string (date, optional)
 * - to: string (date, optional)
 * - statementUploadId: string (optional) - filter to a specific statement upload
 * - source: 'all' | 'statement' | 'email' | 'merged' (default: 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
    const statusFilter = searchParams.get('status') || 'all'
    const currencyFilter = searchParams.get('currency') || 'all'
    const confidenceFilter = searchParams.get('confidence') || 'all'
    const searchQuery = searchParams.get('search') || ''
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const statementUploadId = searchParams.get('statementUploadId')
    const sourceFilter = searchParams.get('source') || 'all'

    // --- Shared types ---

    interface Suggestion {
      transaction_date: string
      description: string
      amount: number
      currency: string
      matched_transaction_id?: string
      confidence: number
      reasons: string[]
      is_new: boolean
      status?: 'pending' | 'approved' | 'rejected'
    }

    type ImportSource = 'statement' | 'email' | 'merged'

    interface EmailMetadata {
      subject?: string
      fromName?: string
      fromAddress?: string
      classification?: string
      orderId?: string
      emailDate?: string
    }

    interface MergedEmailData {
      date: string
      description: string
      amount: number
      currency: string
      metadata: EmailMetadata
    }

    interface CrossCurrencyInfo {
      emailAmount: number
      emailCurrency: string
      statementAmount: number
      statementCurrency: string
      rate: number
      rateDate: string
      percentDiff: number
    }

    interface QueueItem {
      id: string
      statementUploadId?: string
      statementFilename: string
      paymentMethod: { id: string; name: string } | null
      statementTransaction: {
        date: string
        description: string
        amount: number
        currency: string
        sourceFilename: string
      }
      matchedTransaction?: {
        id: string
        date: string
        amount: number
        currency: string
        vendor_name?: string
        description?: string
        payment_method_name?: string
      }
      confidence: number
      confidenceLevel: 'high' | 'medium' | 'low' | 'none'
      reasons: string[]
      isNew: boolean
      status: 'pending' | 'approved' | 'rejected'
      source: ImportSource
      emailMetadata?: EmailMetadata
      mergedEmailData?: MergedEmailData
      crossCurrencyInfo?: CrossCurrencyInfo
    }

    const allItems: QueueItem[] = []

    // ==========================================
    // STATEMENT ITEMS
    // ==========================================
    if (sourceFilter === 'all' || sourceFilter === 'statement' || sourceFilter === 'merged') {
      // Fetch all completed statement uploads with their suggestions
      const { data: statements, error: fetchError } = await supabase
        .from('statement_uploads')
        .select(`
          id,
          filename,
          payment_method_id,
          extraction_log,
          payment_methods (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('extraction_completed_at', { ascending: false })

      if (fetchError) {
        console.error('Failed to fetch statements:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch review queue' },
          { status: 500 }
        )
      }

      // First pass: collect all matched transaction IDs from statements
      const matchedTransactionIds: string[] = []
      for (const statement of statements || []) {
        const extractionLog = statement.extraction_log as {
          suggestions?: Suggestion[]
        } | null

        const suggestions = extractionLog?.suggestions || []
        for (const suggestion of suggestions) {
          if (suggestion.matched_transaction_id) {
            matchedTransactionIds.push(suggestion.matched_transaction_id)
          }
        }
      }

      // Fetch matched transactions with their related data
      type MatchedTransactionData = {
        id: string
        description: string | null
        transaction_date: string
        amount: number
        original_currency: string
        vendors: { name: string } | null
        payment_methods: { name: string } | null
      }

      let matchedTransactionsMap: Map<string, MatchedTransactionData> = new Map()

      if (matchedTransactionIds.length > 0) {
        const { data: matchedTransactions, error: matchError } = await supabase
          .from('transactions')
          .select(`
            id,
            description,
            transaction_date,
            amount,
            original_currency,
            vendors (
              name
            ),
            payment_methods (
              name
            )
          `)
          .in('id', matchedTransactionIds)

        if (!matchError && matchedTransactions) {
          for (const tx of matchedTransactions as MatchedTransactionData[]) {
            matchedTransactionsMap.set(tx.id, tx)
          }
        }
      }

      // Build queue items from statement suggestions
      for (const statement of statements || []) {
        // Filter by statementUploadId early if provided
        if (statementUploadId && statement.id !== statementUploadId) continue

        const extractionLog = statement.extraction_log as {
          suggestions?: Suggestion[]
        } | null

        const suggestions = extractionLog?.suggestions || []

        for (let i = 0; i < suggestions.length; i++) {
          const suggestion = suggestions[i]

          const id = makeStatementId(statement.id, i)

          // Determine confidence level
          let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
          if (suggestion.confidence >= 90) {
            confidenceLevel = 'high'
          } else if (suggestion.confidence >= 55) {
            confidenceLevel = 'medium'
          } else if (suggestion.confidence > 0) {
            confidenceLevel = 'low'
          }

          // Get enriched matched transaction data if available
          let matchedTransactionData: QueueItem['matchedTransaction'] = undefined
          if (suggestion.matched_transaction_id) {
            const enrichedTx = matchedTransactionsMap.get(suggestion.matched_transaction_id)
            if (enrichedTx) {
              matchedTransactionData = {
                id: enrichedTx.id,
                date: enrichedTx.transaction_date,
                amount: Number(enrichedTx.amount),
                currency: enrichedTx.original_currency,
                vendor_name: enrichedTx.vendors?.name,
                description: enrichedTx.description ?? undefined,
                payment_method_name: enrichedTx.payment_methods?.name,
              }
            } else {
              matchedTransactionData = {
                id: suggestion.matched_transaction_id,
                date: suggestion.transaction_date,
                amount: suggestion.amount,
                currency: suggestion.currency,
              }
            }
          }

          const item: QueueItem = {
            id,
            statementUploadId: statement.id,
            statementFilename: statement.filename,
            paymentMethod: statement.payment_methods as { id: string; name: string } | null,
            statementTransaction: {
              date: suggestion.transaction_date,
              description: suggestion.description,
              amount: suggestion.amount,
              currency: suggestion.currency,
              sourceFilename: statement.filename,
            },
            matchedTransaction: matchedTransactionData,
            confidence: suggestion.confidence,
            confidenceLevel,
            reasons: suggestion.reasons,
            isNew: suggestion.is_new,
            status: suggestion.status || 'pending',
            source: 'statement',
          }

          allItems.push(item)
        }
      }
    }

    // ==========================================
    // EMAIL ITEMS
    // ==========================================
    if (sourceFilter === 'all' || sourceFilter === 'email' || sourceFilter === 'merged') {
      // Build query for email_transactions
      let emailQuery = supabase
        .from('email_transactions')
        .select(`
          id,
          subject,
          from_name,
          from_address,
          email_date,
          transaction_date,
          description,
          amount,
          currency,
          classification,
          order_id,
          extraction_confidence,
          match_confidence,
          matched_transaction_id,
          status
        `)
        .eq('user_id', user.id)
        // Only include reviewable statuses
        .in('status', ['pending_review', 'ready_to_import', 'waiting_for_statement', 'matched', 'imported', 'skipped'])
        .order('email_date', { ascending: false })

      // Apply currency filter at DB level
      if (currencyFilter !== 'all') {
        emailQuery = emailQuery.eq('currency', currencyFilter)
      }

      // Apply date filters at DB level
      if (fromDate) {
        emailQuery = emailQuery.gte('transaction_date', fromDate)
      }
      if (toDate) {
        emailQuery = emailQuery.lte('transaction_date', toDate)
      }

      // Apply search at DB level using ilike on description and subject
      if (searchQuery) {
        emailQuery = emailQuery.or(`description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
      }

      const { data: emailRows, error: emailError } = await emailQuery

      if (emailError) {
        console.error('Failed to fetch email transactions:', emailError)
        // Don't fail the whole request — just skip emails
      } else if (emailRows) {
        // Collect matched transaction IDs from email items
        const emailMatchedIds = emailRows
          .filter(r => r.matched_transaction_id)
          .map(r => r.matched_transaction_id as string)

        // Fetch matched transaction details
        type MatchedTransactionData = {
          id: string
          description: string | null
          transaction_date: string
          amount: number
          original_currency: string
          vendors: { name: string } | null
          payment_methods: { name: string } | null
        }

        let emailMatchedMap: Map<string, MatchedTransactionData> = new Map()
        if (emailMatchedIds.length > 0) {
          const { data: matchedTxs } = await supabase
            .from('transactions')
            .select(`
              id, description, transaction_date, amount, original_currency,
              vendors ( name ),
              payment_methods ( name )
            `)
            .in('id', emailMatchedIds)

          if (matchedTxs) {
            for (const tx of matchedTxs as MatchedTransactionData[]) {
              emailMatchedMap.set(tx.id, tx)
            }
          }
        }

        // Map email rows to QueueItem shape
        for (const row of emailRows) {
          // Map email status to queue status
          let queueStatus: 'pending' | 'approved' | 'rejected'
          switch (row.status) {
            case 'matched':
            case 'imported':
              queueStatus = 'approved'
              break
            case 'skipped':
              queueStatus = 'rejected'
              break
            default:
              // pending_review, ready_to_import, waiting_for_statement
              queueStatus = 'pending'
          }

          const confidence = row.matched_transaction_id
            ? (row.match_confidence ?? 0)
            : (row.extraction_confidence ?? 0)

          let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
          if (confidence >= 90) {
            confidenceLevel = 'high'
          } else if (confidence >= 55) {
            confidenceLevel = 'medium'
          } else if (confidence > 0) {
            confidenceLevel = 'low'
          }

          const isNew = !row.matched_transaction_id

          // Enriched matched transaction
          let matchedTransactionData: QueueItem['matchedTransaction'] = undefined
          if (row.matched_transaction_id) {
            const enriched = emailMatchedMap.get(row.matched_transaction_id)
            if (enriched) {
              matchedTransactionData = {
                id: enriched.id,
                date: enriched.transaction_date,
                amount: Number(enriched.amount),
                currency: enriched.original_currency,
                vendor_name: enriched.vendors?.name,
                description: enriched.description ?? undefined,
                payment_method_name: enriched.payment_methods?.name,
              }
            }
          }

          const sourceLabel = row.from_name || row.from_address || row.subject || 'Email'

          const item: QueueItem = {
            id: makeEmailId(row.id),
            statementFilename: sourceLabel,
            paymentMethod: null,
            statementTransaction: {
              date: row.transaction_date ?? row.email_date?.split('T')[0] ?? '',
              description: row.description ?? row.subject ?? '',
              amount: row.amount ?? 0,
              currency: row.currency ?? 'USD',
              sourceFilename: sourceLabel,
            },
            matchedTransaction: matchedTransactionData,
            confidence,
            confidenceLevel,
            reasons: [],
            isNew,
            status: queueStatus,
            source: 'email',
            emailMetadata: {
              subject: row.subject ?? undefined,
              fromName: row.from_name ?? undefined,
              fromAddress: row.from_address ?? undefined,
              classification: row.classification ?? undefined,
              orderId: row.order_id ?? undefined,
              emailDate: row.email_date ?? undefined,
            },
          }

          allItems.push(item)
        }
      }
    }

    // ==========================================
    // CROSS-SOURCE PAIRING
    // ==========================================
    // Only pair pending items from different sources with different currencies
    if (sourceFilter === 'all' || sourceFilter === 'merged') {
      const pendingItems = allItems.filter(item => item.status === 'pending')

      const pairCandidates: PairCandidate[] = pendingItems.map(item => {
        if (item.source === 'email') {
          // Extract email UUID from the prefixed ID (email:<uuid>)
          const emailId = item.id.replace(/^email:/, '')
          return {
            source: 'email' as const,
            emailId,
            date: item.statementTransaction.date,
            amount: item.statementTransaction.amount,
            currency: item.statementTransaction.currency,
            description: item.statementTransaction.description,
          }
        } else {
          // Extract statement UUID and index from the prefixed ID (stmt:<uuid>:<index>)
          const parts = item.id.replace(/^stmt:/, '').split(':')
          return {
            source: 'statement' as const,
            statementId: parts[0],
            statementIndex: parseInt(parts[1], 10),
            date: item.statementTransaction.date,
            amount: item.statementTransaction.amount,
            currency: item.statementTransaction.currency,
            description: item.statementTransaction.description,
          }
        }
      })

      const pairs = await findCrossSourcePairs(supabase, pairCandidates)

      if (pairs.length > 0) {
        // Collect IDs of paired items to remove from allItems
        const pairedEmailIds = new Set(pairs.map(p => `email:${p.emailCandidate.emailId}`))
        const pairedStmtIds = new Set(pairs.map(p =>
          `stmt:${p.statementCandidate.statementId}:${p.statementCandidate.statementIndex}`
        ))

        // Find the original items to carry over metadata
        const emailItemMap = new Map(
          allItems.filter(i => i.source === 'email').map(i => [i.id, i])
        )
        const stmtItemMap = new Map(
          allItems.filter(i => i.source === 'statement').map(i => [i.id, i])
        )

        // Remove paired items from allItems
        const unpaired = allItems.filter(item =>
          !pairedEmailIds.has(item.id) && !pairedStmtIds.has(item.id)
        )

        // Create merged items
        for (const pair of pairs) {
          const emailOrigId = `email:${pair.emailCandidate.emailId}`
          const stmtOrigId = `stmt:${pair.statementCandidate.statementId}:${pair.statementCandidate.statementIndex}`
          const emailItem = emailItemMap.get(emailOrigId)
          const stmtItem = stmtItemMap.get(stmtOrigId)

          const mergedId = makeMergedId(
            pair.emailCandidate.emailId!,
            pair.statementCandidate.statementId!,
            pair.statementCandidate.statementIndex!
          )

          const emailMeta: EmailMetadata = emailItem?.emailMetadata ?? {}

          const merged: QueueItem = {
            id: mergedId,
            statementUploadId: stmtItem?.statementUploadId,
            statementFilename: stmtItem?.statementFilename ?? '',
            paymentMethod: stmtItem?.paymentMethod ?? null,
            statementTransaction: {
              date: pair.statementCandidate.date,
              description: pair.statementCandidate.description,
              amount: pair.statementCandidate.amount,
              currency: pair.statementCandidate.currency,
              sourceFilename: stmtItem?.statementTransaction.sourceFilename ?? '',
            },
            confidence: 95,
            confidenceLevel: 'high',
            reasons: [
              `Cross-source match: email (${pair.emailCandidate.currency}) + statement (${pair.statementCandidate.currency})`,
              `Amount diff: ${pair.percentDiff.toFixed(1)}% after conversion`,
            ],
            isNew: true,
            status: 'pending',
            source: 'merged',
            emailMetadata: emailMeta,
            mergedEmailData: {
              date: pair.emailCandidate.date,
              description: pair.emailCandidate.description,
              amount: pair.emailCandidate.amount,
              currency: pair.emailCandidate.currency,
              metadata: emailMeta,
            },
            crossCurrencyInfo: {
              emailAmount: pair.emailCandidate.amount,
              emailCurrency: pair.emailCandidate.currency,
              statementAmount: pair.statementCandidate.amount,
              statementCurrency: pair.statementCandidate.currency,
              rate: pair.rate,
              rateDate: pair.rateDate,
              percentDiff: pair.percentDiff,
            },
          }

          unpaired.push(merged)
        }

        // Replace allItems with unpaired + merged
        allItems.length = 0
        allItems.push(...unpaired)
      }
    }

    // Sort: pending first, then by date descending
    const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2 }
    allItems.sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
      if (statusDiff !== 0) return statusDiff
      return b.statementTransaction.date.localeCompare(a.statementTransaction.date)
    })

    // Apply filters (some already applied at DB level for emails, but statements need them)
    let filteredItems = allItems

    // Source filter — when 'merged' is selected, only show merged cards
    if (sourceFilter === 'merged') {
      filteredItems = filteredItems.filter(item => item.source === 'merged')
    }

    // Status filter
    if (statusFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.status === statusFilter)
    }

    // Currency filter (statements need client-side filtering)
    if (currencyFilter !== 'all') {
      filteredItems = filteredItems.filter(
        item => item.statementTransaction.currency === currencyFilter
      )
    }

    // Confidence filter
    if (confidenceFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.confidenceLevel === confidenceFilter)
    }

    // Search filter (statements need client-side filtering)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.statementTransaction.description.toLowerCase().includes(query) ||
        item.statementFilename.toLowerCase().includes(query)
      )
    }

    // Date range filter (statements need client-side filtering)
    if (fromDate) {
      filteredItems = filteredItems.filter(
        item => item.statementTransaction.date >= fromDate
      )
    }
    if (toDate) {
      filteredItems = filteredItems.filter(
        item => item.statementTransaction.date <= toDate
      )
    }

    // Calculate stats (before pagination)
    const stats = {
      total: filteredItems.length,
      pending: filteredItems.filter(item => item.status === 'pending').length,
      highConfidence: filteredItems.filter(item => item.confidenceLevel === 'high').length,
      mediumConfidence: filteredItems.filter(item => item.confidenceLevel === 'medium').length,
      lowConfidence: filteredItems.filter(item => item.confidenceLevel === 'low' || item.confidenceLevel === 'none').length,
    }

    // Paginate
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = filteredItems.slice(startIndex, endIndex)
    const hasMore = endIndex < filteredItems.length

    return NextResponse.json({
      items: paginatedItems,
      hasMore,
      total: filteredItems.length,
      stats,
      page,
      limit,
    })

  } catch (error) {
    console.error('Review queue API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
