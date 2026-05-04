import { SupabaseClient } from '@supabase/supabase-js'
import { makeEmailId } from '@/lib/utils/import-id'
import type { QueueItem, EmailAttachmentSummary } from './queue-types'
import { fetchMatchedTransactions } from './fetch-matched-transactions'
import { isSplitReceiptVendor } from '@/lib/matching/split-receipt-vendors'

interface EmailFilters {
  currencyFilter?: string
  searchQuery?: string
  fromDate?: string
  toDate?: string
}

export async function fetchEmailQueueItems(
  supabase: SupabaseClient,
  userId: string,
  filters: EmailFilters
): Promise<QueueItem[]> {
  let emailQuery = supabase
    .from('email_transactions')
    .select(`
      id, subject, from_name, from_address, email_date,
      transaction_date, description, amount, currency,
      classification, order_id, extraction_confidence,
      match_confidence, matched_transaction_id, status,
      vendor_id, parser_key, payment_card_last_four, payment_card_type,
      vendor_name_raw, rejected_pair_keys, manual_pair_keys
    `)
    .eq('user_id', userId)
    .in('status', ['pending_review', 'ready_to_import', 'waiting_for_statement', 'waiting_for_email', 'waiting_for_slip', 'matched', 'imported', 'skipped'])
    .order('email_date', { ascending: false })

  if (filters.currencyFilter && filters.currencyFilter !== 'all') {
    emailQuery = emailQuery.eq('currency', filters.currencyFilter)
  }
  if (filters.fromDate) {
    emailQuery = emailQuery.gte('transaction_date', filters.fromDate)
  }
  if (filters.toDate) {
    emailQuery = emailQuery.lte('transaction_date', filters.toDate)
  }
  if (filters.searchQuery) {
    emailQuery = emailQuery.or(`description.ilike.%${filters.searchQuery}%,subject.ilike.%${filters.searchQuery}%`)
  }

  const { data: emailRows, error: emailError } = await emailQuery

  if (emailError) {
    console.error('Failed to fetch email transactions:', emailError)
    return []
  }

  if (!emailRows) return []

  // Fetch matched transactions (batched to avoid URL-length errors with large ID sets)
  const emailMatchedIds = emailRows
    .filter(r => r.matched_transaction_id)
    .map(r => r.matched_transaction_id as string)

  const matchedMap = await fetchMatchedTransactions(supabase, emailMatchedIds)

  // Look up the corresponding emails row id for each email_transaction so we
  // can join in attachments. email_transactions doesn't store email_id, but
  // (user_id, message_id) is unique on emails, so we can map via message_id.
  // Note: email_transactions does carry message_id but we didn't select it
  // above — re-query just the message_ids we need.
  const txIds = emailRows.map(r => r.id)
  const attachmentsByEmailTxId = new Map<string, EmailAttachmentSummary[]>()

  if (txIds.length > 0) {
    const { data: txMessageIds } = await supabase
      .from('email_transactions')
      .select('id, message_id')
      .in('id', txIds)

    const messageIds = (txMessageIds ?? [])
      .map(r => r.message_id)
      .filter((m): m is string => Boolean(m))

    if (messageIds.length > 0) {
      const { data: emailIdRows } = await supabase
        .from('emails')
        .select('id, message_id')
        .eq('user_id', userId)
        .in('message_id', messageIds)

      const messageIdToEmailId = new Map<string, string>()
      for (const row of emailIdRows ?? []) {
        if (row.id && row.message_id) messageIdToEmailId.set(row.message_id, row.id)
      }

      const emailIds = Array.from(messageIdToEmailId.values())
      if (emailIds.length > 0) {
        const { data: attachmentRows } = await supabase
          .from('email_attachments')
          .select('id, email_id, filename, extraction_status, page_count')
          .in('email_id', emailIds)

        const byEmailId = new Map<string, EmailAttachmentSummary[]>()
        for (const a of attachmentRows ?? []) {
          if (!a.email_id) continue
          const list = byEmailId.get(a.email_id) ?? []
          list.push({
            id: a.id,
            filename: a.filename ?? 'attachment.pdf',
            extractionStatus: (a.extraction_status as EmailAttachmentSummary['extractionStatus']) ?? 'pending',
            pageCount: a.page_count ?? null,
          })
          byEmailId.set(a.email_id, list)
        }

        // Map back to email_transaction.id
        for (const row of txMessageIds ?? []) {
          if (!row.message_id) continue
          const emailId = messageIdToEmailId.get(row.message_id)
          if (!emailId) continue
          const list = byEmailId.get(emailId)
          if (list && list.length > 0) attachmentsByEmailTxId.set(row.id, list)
        }
      }
    }
  }

  const items: QueueItem[] = []

  // --- Multi-email bundle detection ---
  // For split-receipt vendors (e.g. Lazada), multiple email_transactions can
  // share the same `matched_transaction_id` because the retailer emails one
  // receipt per sub-vendor while the credit card aggregates them. Collapse
  // those into a single queue card whose `extraEmailIds` carry the siblings,
  // so the user approves the whole bundle in one click.
  const bundleSecondaryIds = new Set<string>()
  const bundleExtrasByPrimary = new Map<string, string[]>()
  const bundleSumByPrimary = new Map<string, number>()

  const bundleGroups = new Map<string, typeof emailRows>()
  for (const row of emailRows) {
    if (!row.matched_transaction_id) continue
    if (!isSplitReceiptVendor(row.from_address)) continue
    const group = bundleGroups.get(row.matched_transaction_id) || []
    group.push(row)
    bundleGroups.set(row.matched_transaction_id, group)
  }

  for (const group of bundleGroups.values()) {
    if (group.length < 2) continue
    // Largest-amount member is the primary so users see the most recognizable
    // line item in the queue card.
    const sorted = [...group].sort(
      (a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0),
    )
    const primary = sorted[0]
    const extras = sorted.slice(1)
    bundleExtrasByPrimary.set(
      primary.id,
      extras.map((e) => e.id),
    )
    const total = group.reduce((s, r) => s + Number(r.amount ?? 0), 0)
    bundleSumByPrimary.set(primary.id, total)
    for (const e of extras) bundleSecondaryIds.add(e.id)
  }

  for (const row of emailRows) {
    if (bundleSecondaryIds.has(row.id)) continue
    let queueStatus: 'pending' | 'approved' | 'rejected'
    const isWaitingForStatement = row.status === 'waiting_for_statement'
    switch (row.status) {
      case 'matched':
      case 'imported':
        queueStatus = 'approved'
        break
      case 'skipped':
        queueStatus = 'rejected'
        break
      default:
        queueStatus = 'pending'
    }

    const confidence = row.matched_transaction_id
      ? (row.match_confidence ?? 0)
      : (row.extraction_confidence ?? 0)

    let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
    if (confidence >= 90) confidenceLevel = 'high'
    else if (confidence >= 55) confidenceLevel = 'medium'
    else if (confidence > 0) confidenceLevel = 'low'

    const isNew = !row.matched_transaction_id

    let matchedTransactionData: QueueItem['matchedTransaction'] = undefined
    if (row.matched_transaction_id) {
      const enriched = matchedMap.get(row.matched_transaction_id)
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

    const bundleExtras = bundleExtrasByPrimary.get(row.id)
    const bundleTotal = bundleSumByPrimary.get(row.id)
    const reasons: string[] = []
    if (bundleExtras && bundleTotal !== undefined) {
      const memberCount = bundleExtras.length + 1
      reasons.push(
        `Bundled with ${bundleExtras.length} other ${row.from_address && /lazada/i.test(row.from_address) ? 'Lazada ' : ''}order${bundleExtras.length === 1 ? '' : 's'}: ${memberCount} emails total ${row.currency ?? ''} ${bundleTotal.toFixed(2)}`,
      )
    }

    items.push({
      id: makeEmailId(row.id),
      statementFilename: sourceLabel,
      paymentMethod: null,
      statementTransaction: {
        date: row.transaction_date ?? row.email_date?.split('T')[0] ?? '',
        description: row.description ?? row.subject ?? '',
        amount: bundleTotal ?? row.amount ?? 0,
        currency: row.currency ?? 'USD',
        sourceFilename: sourceLabel,
      },
      matchedTransaction: matchedTransactionData,
      confidence,
      confidenceLevel,
      reasons,
      isNew,
      status: queueStatus,
      waitingForStatement: isWaitingForStatement || undefined,
      rejectedPairKeys: ((row as { rejected_pair_keys?: string[] }).rejected_pair_keys) || undefined,
      manualPairKeys: ((row as { manual_pair_keys?: string[] }).manual_pair_keys) || undefined,
      extraEmailIds: bundleExtras,
      source: 'email',
      emailMetadata: {
        subject: row.subject ?? undefined,
        fromName: row.from_name ?? undefined,
        fromAddress: row.from_address ?? undefined,
        classification: row.classification ?? undefined,
        orderId: row.order_id ?? undefined,
        emailDate: row.email_date ?? undefined,
        vendorId: row.vendor_id ?? undefined,
        parserKey: row.parser_key ?? undefined,
        extractionConfidence: row.extraction_confidence ?? undefined,
        paymentCardLastFour: row.payment_card_last_four ?? undefined,
        paymentCardType: row.payment_card_type ?? undefined,
        vendorNameRaw: row.vendor_name_raw ?? undefined,
        attachments: attachmentsByEmailTxId.get(row.id),
      },
    })
  }

  return items
}
