/**
 * Vendor matching + description reuse guard rails.
 *
 * Every negative case below is a real false positive from the May 2026
 * audit: "Thank You Cafe" from an autopay row, a person (Nidnoi) matched to
 * a Florida coffee shop, a city matched as a vendor, and ฿45/฿400 rows
 * labelled as rent.
 */

import { matchVendor, suggestVendorName } from '@/lib/proposals/vendor-matcher'
import { cleanMerchantDescriptor } from '@/lib/matching/vendor-matcher'
import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import type {
  ProposalInput,
  RuleEngineContext,
  VendorRecord,
  RecentTransaction,
} from '@/lib/proposals/types'

function vendor(id: string, name: string, transactionCount = 5): VendorRecord {
  return { id, name, transactionCount }
}

describe('matchVendor — audit false positives stay dead', () => {
  const noHistory: RecentTransaction[] = []

  it.each([
    ['AUTOMATIC PAYMENT - THANK YOU', 'Thank You Cafe'],
    ['& PARAMOUNT+ 888-274-5343 CA', 'Netflix'],
    ['AWN(1201 CENTRAL CHIANGMA CHIANGMAI', 'Chiangmai'],
    ['TRF. PROMPTPAY', 'Murray'],
    ['To: X1413 KITTITACH K', 'Chef Fuji'],
    ['TST* FOXTAIL COFFEE - 108 VENICE FL', 'Nidnoi'],
  ])('does not match "%s" to vendor "%s"', (description, vendorName) => {
    const result = matchVendor(description, [vendor('v1', vendorName)], noHistory)
    expect(result).toBeNull()
  })

  it('still matches genuinely shared names', () => {
    const result = matchVendor(
      'WAL-MART #0769 VENICE FL',
      [vendor('v-walmart', 'Walmart'), vendor('v-target', 'Target')],
      noHistory
    )
    expect(result?.vendorName).toBe('Walmart')
  })

  it('category words cannot chain a merchant to an unrelated vendor history', () => {
    const history: RecentTransaction[] = [
      {
        id: 't1',
        description: 'Coffee: Ristr8to',
        amount: 120,
        currency: 'THB',
        date: '2026-04-01',
        vendorId: 'v-nidnoi',
        vendorName: 'Nidnoi',
        transactionType: 'expense',
        tagIds: [],
      },
    ]
    const result = matchVendor('TST* FOXTAIL COFFEE - 108 VENICE FL', [vendor('v-nidnoi', 'Nidnoi')], history)
    expect(result).toBeNull()
  })
})

describe('merchant descriptor normalization', () => {
  it.each([
    ['WM SUPERCENTER #769 VENICE FL', 'WM SUPERCENTER'],
    ['WAL-MART #0769 VENICE FL', 'WAL-MART'],
    ['TST* FOXTAIL COFFEE - 108 VENICE FL', 'FOXTAIL COFFEE'],
    ['YYZ BOCCONE BY MASSIMO MISSISSAUGA ON', 'BOCCONE BY MASSIMO'],
    ['& PARAMOUNT+ 888-274-5343 CA', 'PARAMOUNT+'],
    ['HTTPS://WWW.VIRGINACTIVE. BANGKOK', 'VIRGINACTIVE.'],
  ])('cleans "%s" to "%s"', (raw, expected) => {
    expect(cleanMerchantDescriptor(raw)).toBe(expected)
  })

  it('suggests names without store numbers, cities, or airport codes', () => {
    expect(suggestVendorName('WAL-MART #0769 VENICE FL')).toBe('Wal-Mart')
    expect(suggestVendorName('YYZ BOCCONE BY MASSIMO MISSISSAUGA ON')).toBe('Boccone By Massimo')
  })
})

describe('description reuse gated on amount plausibility', () => {
  function makeContext(): RuleEngineContext {
    return {
      vendors: [vendor('v-koolpunt', 'Koolpunt Property')],
      paymentMethods: [
        { id: 'pm-kbank', name: 'KBANK', type: 'bank_account' },
      ],
      tags: [],
      recentTransactions: [],
      vendorTagFrequency: [],
      vendorDescriptionPatterns: [
        {
          vendorId: 'v-koolpunt',
          vendorName: 'Koolpunt Property',
          description: 'Property Rent',
          count: 5,
          frequency: 1,
          totalTransactions: 5,
          minAmount: 3000,
          maxAmount: 4200,
          currency: 'THB',
        },
      ],
      pastCorrections: [],
      vendorRecipientMappings: [],
      statementDescriptionMappings: [],
      autoTagRules: [],
    }
  }

  function makeItem(amount: number): ProposalInput {
    return {
      compositeId: 'stmt:test:1',
      sourceType: 'statement',
      description: 'KOOLPUNT PROPERTY CO.,LTD',
      amount,
      currency: 'THB',
      date: '2026-05-23',
      paymentMethodId: 'pm-kbank',
    }
  }

  it('rejects "Property Rent" on a ฿45 row and drops description confidence', () => {
    const result = generateRuleProposal(makeItem(45), makeContext())
    expect(result.fields.vendorId).toBe('v-koolpunt')
    expect(result.fields.description).not.toBe('Property Rent')
    expect(result.fieldConfidence.description.score).toBeLessThanOrEqual(60)
    expect(result.fieldConfidence.description.reasoning).toContain('rejected')
  })

  it('still reuses the pattern when the amount fits the historical band', () => {
    const result = generateRuleProposal(makeItem(3500), makeContext())
    expect(result.fields.description).toBe('Property Rent')
  })
})
