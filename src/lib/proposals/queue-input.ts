/**
 * Queue item → ProposalInput
 *
 * Both proposal generation routes (batch `/generate` and `/generate-single`)
 * must build their input the same way, from the same *aggregated* queue item.
 * Building it from an unaggregated builder item produces a `stmt:`/`email:`
 * composite id, while the review queue looks proposals up by the aggregated
 * `merged:…` id — so the proposal is written under a key nothing ever reads.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { parseImportId } from '@/lib/utils/import-id'
import type { QueueItem } from '@/lib/imports/queue-types'
import type { ProposalInput, ProposalSourceType } from './types'

/**
 * Build the engine input for one aggregated queue item.
 *
 * Pure — source ids come from the item's composite id, everything else from
 * the item itself. Extra manually-attached sources are loaded separately by
 * `attachExtraSourceContext`.
 */
export function buildProposalInputFromQueueItem(item: QueueItem): ProposalInput {
  const parsed = parseImportId(item.id)

  const emailMeta = item.emailMetadata
  const mergedEmail = item.mergedEmailData
  const slipMeta = item.paymentSlipMetadata
  const isMerged = item.source === 'merged'
  const isSlip = item.source === 'payment_slip'
  const hasSlipData = isSlip || !!item.mergedPaymentSlipData || (isMerged && !!slipMeta)

  const statementId =
    parsed && 'statementId' in parsed ? parsed.statementId : item.statementUploadId || undefined
  const suggestionIndex = parsed && 'index' in parsed ? parsed.index : undefined
  const emailId = parsed && 'emailId' in parsed ? parsed.emailId : undefined
  const slipId =
    parsed && 'slipId' in parsed ? parsed.slipId : isSlip ? slipMeta?.slipUploadId : undefined

  // Prefer a parsed source description over the raw statement memo: the email
  // or slip says what was actually bought, the statement says "WWW.2C2P.COM*…".
  const description =
    (isMerged && mergedEmail?.description) ||
    (isMerged && item.mergedPaymentSlipData?.description) ||
    item.statementTransaction.description

  const input: ProposalInput = {
    compositeId: item.id,
    sourceType: (item.source || 'statement') as ProposalSourceType,
    statementUploadId: statementId,
    suggestionIndex,
    emailTransactionId: emailId,
    description,
    amount: item.statementTransaction.amount,
    currency: item.statementTransaction.currency,
    date: item.statementTransaction.date,
    paymentMethodId: item.paymentMethod?.id,
    paymentMethodName: item.paymentMethod?.name,
    // Email-specific fields for the proposal engine
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
    // Payment slip description — the sender's manually typed memo. For standalone
    // slips it lives on statementTransaction.description; on merged cards it's
    // carried by mergedPaymentSlipData.
    ...(hasSlipData && {
      paymentSlipDescription: isSlip
        ? item.statementTransaction.description
        : item.mergedPaymentSlipData?.description,
    }),
    ...(hasSlipData && slipMeta && {
      paymentSlipUploadId: slipId ?? slipMeta.slipUploadId,
      senderName: slipMeta.senderName,
      recipientName: slipMeta.recipientName,
      bankDetected: slipMeta.bankDetected,
      detectedDirection: slipMeta.detectedDirection ?? undefined,
    }),
  }

  // Secondary source dates, for per-bank date preference learning
  if (isMerged && mergedEmail?.date) input.emailDate = mergedEmail.date
  if (isMerged && item.mergedPaymentSlipData?.date) input.slipDate = item.mergedPaymentSlipData.date

  return input
}

/**
 * Bulk-load the emails/slips the user manually attached to these items via
 * "Attach a source" and hang them off the matching inputs, so the engine sees
 * every source behind the card (e.g. a two-email Lazada order on one charge).
 *
 * `inputs[i]` must correspond to `items[i]`.
 */
export async function attachExtraSourceContext(
  supabase: SupabaseClient,
  userId: string,
  inputs: ProposalInput[],
  items: QueueItem[]
): Promise<void> {
  const allEmailIds = Array.from(new Set(items.flatMap((i) => i.extraEmailIds ?? [])))
  const allSlipIds = Array.from(new Set(items.flatMap((i) => i.extraSlipIds ?? [])))
  if (allEmailIds.length === 0 && allSlipIds.length === 0) return

  type ExtraEmailRow = {
    id: string
    subject: string | null
    from_name: string | null
    from_address: string | null
    description: string | null
    amount: number | string | null
    currency: string | null
    transaction_date: string | null
  }
  type ExtraSlipRow = {
    id: string
    sender_name: string | null
    recipient_name: string | null
    memo: string | null
    amount: number | string | null
    currency: string | null
    transaction_date: string | null
  }

  const [emailRes, slipRes] = await Promise.all([
    allEmailIds.length > 0
      ? supabase
          .from('email_transactions')
          .select('id, subject, from_name, from_address, description, amount, currency, transaction_date')
          .in('id', allEmailIds)
          .eq('user_id', userId)
      : Promise.resolve({ data: [] as ExtraEmailRow[] }),
    allSlipIds.length > 0
      ? supabase
          .from('payment_slip_uploads')
          .select('id, sender_name, recipient_name, memo, amount, currency, transaction_date')
          .in('id', allSlipIds)
          .eq('user_id', userId)
      : Promise.resolve({ data: [] as ExtraSlipRow[] }),
  ])

  const emailById = new Map(((emailRes.data || []) as ExtraEmailRow[]).map((e) => [e.id, e]))
  const slipById = new Map(((slipRes.data || []) as ExtraSlipRow[]).map((s) => [s.id, s]))

  inputs.forEach((input, i) => {
    const item = items[i]
    if (item.extraEmailIds?.length) {
      const extras = item.extraEmailIds
        .map((id) => emailById.get(id))
        .filter((e): e is NonNullable<typeof e> => !!e)
      if (extras.length > 0) {
        input.extraEmailContext = extras.map((e) => ({
          subject: e.subject ?? undefined,
          fromName: e.from_name ?? undefined,
          fromAddress: e.from_address ?? undefined,
          description: e.description ?? undefined,
          amount: e.amount != null ? Number(e.amount) : undefined,
          currency: e.currency ?? undefined,
          date: e.transaction_date ?? undefined,
        }))
      }
    }
    if (item.extraSlipIds?.length) {
      const extras = item.extraSlipIds
        .map((id) => slipById.get(id))
        .filter((s): s is NonNullable<typeof s> => !!s)
      if (extras.length > 0) {
        input.extraSlipContext = extras.map((s) => ({
          senderName: s.sender_name ?? undefined,
          recipientName: s.recipient_name ?? undefined,
          memo: s.memo ?? undefined,
          amount: s.amount != null ? Number(s.amount) : undefined,
          currency: s.currency ?? undefined,
          date: s.transaction_date ?? undefined,
        }))
      }
    }
  })
}
