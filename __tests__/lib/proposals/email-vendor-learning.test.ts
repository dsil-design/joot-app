/**
 * "The system should already know this vendor."
 *
 * Learning an extracted name → vendor association used to be gated to the
 * bank-transfer parsers, so a merchant whose receipts arrive by email taught
 * the system nothing however many times the user confirmed the same link:
 * twenty months of Xfinity receipts linked to the Xfinity vendor, and the
 * twenty-first still fell back to a fuzzy guess.
 */

import { learnVendorRecipientMapping } from '@/lib/services/vendor-recipient-learning'
import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import type { ProposalInput, RuleEngineContext } from '@/lib/proposals/types'

const XFINITY = 'vendor-xfinity'

/**
 * Supabase double: `email_transactions` and `transactions` reads, plus capture
 * of the mapping upsert path (select → maybe-existing, then insert).
 */
function fakeSupabase(emailRow: { vendor_name_raw: string | null; parser_key: string | null }) {
  const inserted: Record<string, unknown>[] = []

  const client = {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        insert: (row: Record<string, unknown>) => {
          inserted.push(row)
          return Promise.resolve({ error: null })
        },
        update: () => Promise.resolve({ error: null }),
        single: () => {
          if (table === 'email_transactions') return Promise.resolve({ data: emailRow })
          if (table === 'transactions') return Promise.resolve({ data: { vendor_id: XFINITY } })
          return Promise.resolve({ data: null }) // no existing mapping
        },
      }
      return builder
    },
  }

  return { client, inserted }
}

describe('learnVendorRecipientMapping', () => {
  it('records the mapping for an AI-extracted receipt, not just bank transfers', async () => {
    const { client, inserted } = fakeSupabase({
      vendor_name_raw: 'Xfinity',
      parser_key: 'ai-fallback',
    })

    await learnVendorRecipientMapping(client as never, 'user-1', 'email-1', 'tx-1')

    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      recipient_name_normalized: 'xfinity',
      recipient_name_raw: 'Xfinity',
      vendor_id: XFINITY,
      parser_key: 'ai-fallback',
    })
  })

  it('still records bank-transfer recipients', async () => {
    const { client, inserted } = fakeSupabase({
      vendor_name_raw: 'MS. SUPAPORN KIDKLA',
      parser_key: 'kasikorn',
    })

    await learnVendorRecipientMapping(client as never, 'user-1', 'email-1', 'tx-1')

    expect(inserted[0]).toMatchObject({
      recipient_name_normalized: 'supaporn kidkla',
      parser_key: 'kasikorn',
    })
  })

  it('records nothing without an extracted name', async () => {
    const { client, inserted } = fakeSupabase({ vendor_name_raw: null, parser_key: 'ai-fallback' })

    await learnVendorRecipientMapping(client as never, 'user-1', 'email-1', 'tx-1')

    expect(inserted).toHaveLength(0)
  })
})

describe('a learned mapping drives the next proposal', () => {
  it('names the vendor from the learned mapping rather than guessing', () => {
    const context: RuleEngineContext = {
      vendors: [
        { id: XFINITY, name: 'Xfinity', transactionCount: 20 },
        { id: 'vendor-xfinity-live', name: 'Xfinity Live', transactionCount: 1 },
      ],
      paymentMethods: [],
      tags: [],
      recentTransactions: [],
      vendorTagFrequency: [],
      vendorDescriptionPatterns: [],
      pastCorrections: [],
      vendorRecipientMappings: [
        {
          recipientNameNormalized: 'xfinity',
          vendorId: XFINITY,
          vendorName: 'Xfinity',
          parserKey: 'ai-fallback',
          matchCount: 4,
        },
      ],
      statementDescriptionMappings: [],
      autoTagRules: [],
    }

    const input: ProposalInput = {
      compositeId: 'email:xfinity-may',
      sourceType: 'email',
      description: 'Automatic bill payment - Xfinity service',
      amount: 75,
      currency: 'USD',
      date: '2026-05-19',
      vendorNameRaw: 'Xfinity',
      parserKey: 'ai-fallback',
    }

    const result = generateRuleProposal(input, context)

    expect(result.fields.vendorId).toBe(XFINITY)
    expect(result.fieldConfidence.vendor_id?.reasoning).toContain('Learned mapping')
    expect(result.fieldConfidence.vendor_id?.score).toBeGreaterThanOrEqual(90)
  })
})
