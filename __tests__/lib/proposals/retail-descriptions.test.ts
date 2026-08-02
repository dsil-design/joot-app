/**
 * Online-retail order descriptions.
 *
 * Regression cover for the May 2026 Amazon order that surfaced this: a
 * two-shipment order whose queue cards both proposed the same 120-character
 * product-listing title, because the parser stores one item name per order and
 * the rule engine handed it through at 90% confidence.
 */

import {
  isRetailOrder,
  isRetailParser,
  isRawProductListing,
  isPlaceholderOrderDescription,
  condenseProductTitle,
  summarizeOrderItems,
  fallbackRetailDescription,
} from '@/lib/proposals/retail-descriptions'
import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import type { ProposalInput, RuleEngineContext } from '@/lib/proposals/types'

const TANK_TOP =
  'TACVASEN Workout Shirts for Men Muscle Tank Top Mens Sleeveless Shirts Gym Top Dry Fit UPF 50+ Workout Muscle Sleeveless Gym Tee Mulled Teal XL'

function makeContext(): RuleEngineContext {
  return {
    vendors: [],
    paymentMethods: [{ id: 'pm-chase', name: 'Chase Sapphire Reserve', type: 'credit_card' }],
    tags: [],
    recentTransactions: [],
    vendorTagFrequency: [],
    vendorDescriptionPatterns: [],
    pastCorrections: [],
    vendorRecipientMappings: [],
    statementDescriptionMappings: [],
  }
}

function makeItem(overrides: Partial<ProposalInput> = {}): ProposalInput {
  return {
    compositeId: 'merged:email-1+stmt:s1:0',
    sourceType: 'merged',
    description: TANK_TOP,
    amount: 20.31,
    currency: 'USD',
    date: '2026-05-09',
    parserKey: 'amazon',
    paymentMethodId: 'pm-chase',
    ...overrides,
  }
}

describe('isRetailOrder', () => {
  it('recognizes the dedicated marketplace parsers', () => {
    expect(isRetailParser('amazon')).toBe(true)
    expect(isRetailParser('lazada')).toBe(true)
    expect(isRetailParser('grab')).toBe(false)
  })

  it('recognizes a marketplace receipt that fell through to the AI fallback', () => {
    expect(
      isRetailOrder({
        parserKey: 'ai-fallback',
        fromAddress: 'noreply@support.lazada.co.th',
      })
    ).toBe(true)
  })

  it('recognizes the merchant descriptor on a card charge', () => {
    expect(
      isRetailOrder({ statementDescription: 'AMAZON MKTPL*BV3AR0KY1 Amzn.com/bill WA' })
    ).toBe(true)
  })

  it('does not claim ordinary merchants', () => {
    expect(
      isRetailOrder({
        parserKey: 'grab',
        fromAddress: 'no-reply@grab.com',
        statementDescription: 'GRABFOOD BANGKOK',
      })
    ).toBe(false)
  })
})

describe('isPlaceholderOrderDescription', () => {
  it.each([
    'Amazon order (2 sub-orders)',
    'Multiple orders: Skechers, gym clothes (3 orders total)',
    'Amazon order',
  ])('flags "%s" as saying nothing', (description) => {
    expect(isPlaceholderOrderDescription(description)).toBe(true)
  })

  it('leaves a real description alone', () => {
    expect(isPlaceholderOrderDescription('Wine Saver with Bottle Stoppers')).toBe(false)
  })
})

describe('isRawProductListing', () => {
  it('flags keyword-stuffed listing titles', () => {
    expect(isRawProductListing(TANK_TOP)).toBe(true)
    expect(
      isRawProductListing(
        'Magnesium Glycinate 400mg, 90 Capsules (Vegan Safe, Third Party Tested, Gluten Free, Non-GMO) High Absorption'
      )
    ).toBe(true)
  })

  it('leaves short human descriptions alone', () => {
    expect(isRawProductListing('Wine Saver with Bottle Stoppers')).toBe(false)
    expect(isRawProductListing('Breakfast: Roast Coffee & Eatery')).toBe(false)
    expect(isRawProductListing('Monthly Rent')).toBe(false)
  })
})

describe('condenseProductTitle', () => {
  it('cuts a listing title at the first qualifier', () => {
    expect(condenseProductTitle(TANK_TOP)).toBe('TACVASEN Workout Shirts')
  })

  it('drops trailing variant parentheticals', () => {
    expect(
      condenseProductTitle(
        'FitVille Wide Pickleball Shoes Men Tennis Shoes (White Green, 13 Wide)'
      )
    ).toBe('FitVille Wide Pickleball Shoes Men Tennis')
  })

  it('cuts at the comma that starts the spec list', () => {
    expect(
      condenseProductTitle('Magnesium Glycinate 400mg, 90 Capsules (Vegan Safe, Non-GMO)')
    ).toBe('Magnesium Glycinate 400mg')
  })

  it('never leaves a dangling connective', () => {
    expect(condenseProductTitle('ZUGU Case for iPad Pro 11 Inch Case Lighter Version')).not.toMatch(
      /\b(for|with|and)$/
    )
  })

  it('is a no-op on something already short', () => {
    expect(condenseProductTitle('Yadom')).toBe('Yadom')
  })
})

describe('summarizeOrderItems', () => {
  it('collapses repeats of one product into a count', () => {
    const summary = summarizeOrderItems([
      { name: `${TANK_TOP} Grey XL`, quantity: 1, amount: 14.99 },
      { name: `${TANK_TOP} Blue Gray XL`, quantity: 1, amount: 14.99 },
    ])
    expect(summary).toBe('TACVASEN Workout Shirts (2)')
  })

  it('lists distinct products, biggest spend first', () => {
    const summary = summarizeOrderItems([
      { name: 'Canvas Tote Bag for Shopping', quantity: 1, amount: 12 },
      { name: 'Magnesium L Threonate, Magtein - NSF Certified', quantity: 1, amount: 59 },
    ])
    expect(summary).toBe('Magnesium L Threonate, Canvas Tote Bag for Shopping')
  })

  it('returns null when nothing is nameable', () => {
    expect(summarizeOrderItems([])).toBeNull()
  })
})

describe('proposeDescription — retail orders', () => {
  it('scores a raw listing title low enough to escalate instead of proposing it', () => {
    const result = generateRuleProposal(makeItem(), makeContext())

    expect(result.fields.description).not.toBe(TANK_TOP)
    expect(result.fieldConfidence.description.score).toBeLessThan(60)
  })

  it('summarizes the shipment when line items were recovered', () => {
    const result = generateRuleProposal(
      makeItem({
        amount: 55.45,
        retailOrderItems: [
          { name: `${TANK_TOP} Grey XL`, quantity: 1, amount: 14.99 },
          { name: `${TANK_TOP} Blue Gray XL`, quantity: 1, amount: 14.99 },
          { name: 'TACVASEN Mens Tank Tops Quick Dry Sleeveless Shirts', quantity: 1, amount: 9.99 },
        ],
      }),
      makeContext()
    )

    expect(result.fields.description).toContain('(2)')
    expect(result.fieldConfidence.description.score).toBeLessThan(60)
  })

  it('does not invent goods for a placeholder with no items', () => {
    const result = generateRuleProposal(
      makeItem({ description: 'Amazon order (2 sub-orders)', retailOrderItems: [] }),
      makeContext()
    )

    expect(result.fields.description).toBe('Amazon order (2 sub-orders)')
    expect(result.fieldConfidence.description.score).toBeLessThan(40)
  })

  it('leaves a short, already-usable parser description in place', () => {
    const result = generateRuleProposal(
      makeItem({ description: 'Golf Tees', extractionConfidence: 100 }),
      makeContext()
    )

    expect(result.fields.description).toBe('Golf Tees')
    expect(result.fieldConfidence.description.score).toBeGreaterThanOrEqual(75)
  })

  it('leaves statement-only marketplace rows to the existing strategies', () => {
    // No receipt behind the row, so there is no product title to condense —
    // the merchant descriptor must not be run through the retail path.
    const result = generateRuleProposal(
      makeItem({
        sourceType: 'statement',
        parserKey: undefined,
        description: 'AMAZON MKTPL*BV3AR0KY1 Amzn.com/bill WA',
        statementDescription: 'AMAZON MKTPL*BV3AR0KY1 Amzn.com/bill WA',
      }),
      makeContext()
    )

    expect(result.fieldConfidence.description.reasoning).toMatch(/statement descriptor/i)
  })
})

describe('fallbackRetailDescription', () => {
  it('prefers the item summary over the stored title', () => {
    expect(
      fallbackRetailDescription(TANK_TOP, [
        { name: 'Anker 737 Power Bank 24000mAh', quantity: 1, amount: 99 },
      ])
    ).toBe('Anker 737 Power Bank 24000mAh')
  })

  it('has nothing to offer for a placeholder with no items', () => {
    expect(fallbackRetailDescription('Amazon order (2 sub-orders)')).toBeNull()
  })
})
