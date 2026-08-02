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

  // Second audit: every pair below came from running matchVendor over the real
  // email_transactions.vendor_name_raw values. Each one was a raw substring of
  // the description scoring 0.9 and being proposed today.
  it.each([
    ['HEALTHLINK CO.,LTD. BRANCH 1', 'Link'],
    ['SCB มณี SHOP (JUNEKO HOUSE)', 'House'],
    ['ชาบูกุ ฮอทพอท เรสโตรองท์ (A/C Name: SHABUGU HOTPOT RESTAURANT CO.,LTD.)', 'Restaurant'],
    ['ก๋วยเตี๋ยวเรือพระนคร อนุสาวรีย์ชัยสมรภูมิ (A/C Name: PRANAKORN FOOD CO.,LTD.)', 'Food'],
    ['BEACHWALK BY MANASOTA KEY HOMEOWNERS ASSOCIATION INC', 'HOME'],
    ['บมจ.โฮม โปรดักส์ เซ็นเตอร์ (A/C Name: HOME PRODUCT CENTER PUBLIC COMPANY LIMITED)', 'HOME'],
    ['คลังโมบายล์ (A/C Name: KLUNG MOBILE CO.,LTD.)', 'Mobil'],
    ['HomePro Online Shopping', 'Hopp'],
    ['American Express', 'Eric'],
    ['American International Tax Advisers Co., Ltd.', 'Eric'],
    ['ACTING SUB LT. SIRIKHWAN KHAMPHILO', 'Phil'],
    ['NUCHSARA JAIA', 'Sara'],
    ['DANUCHIN ANAN', 'Uchi'],
    ['MoonPay', 'Moon'],
    // category noun / district name claiming a whole-token match; the linked
    // transactions say Starbucks and McDonald's
    ['280 SCT-SUANPLGRN MARKET BANGKOK', 'Market'],
    ['MCD-00178GRAND FIVE NANA BANGKOK', 'Nana'],
  ])('does not match "%s" to vendor "%s" on a bare substring', (description, vendorName) => {
    const result = matchVendor(description, [vendor('v1', vendorName)], noHistory)
    expect(result).toBeNull()
  })

  it.each([
    ['SCB มณี SHOP (JUNEKO HOUSE)', 'House', 'Juneko House'],
    ['ชาบูกุ ฮอทพอท เรสโตรองท์ (A/C Name: SHABUGU HOTPOT RESTAURANT CO.,LTD.)', 'Restaurant', 'Shabugu'],
    ['คลังโมบายล์ (A/C Name: KLUNG MOBILE CO.,LTD.)', 'Mobil', 'Klung Mobile'],
    ['CHIANGMAI RALLY HOUSE (A/C Name: CHIANGMAI RALLY HOUSE CO.,LTD.)', 'House', 'Rally House'],
    ['PWA-PROVINCIAL WATERWORKS AUTHORITY', 'PWA', 'Provincial Waterworks Authority'],
  ])('matches "%s" to the specific vendor, not "%s"', (description, generic, specific) => {
    const result = matchVendor(
      description,
      // the generic vendor carries the higher transaction count, so only
      // specificity — not the tiebreak — can pick the right one
      [vendor('v-generic', generic, 50), vendor('v-specific', specific, 1)],
      noHistory
    )
    expect(result?.vendorName).toBe(specific)
  })

  it('does not collapse the distinct Grab vendors into "Grab"', () => {
    const grabVendors = [
      vendor('v-grab', 'Grab', 200),
      vendor('v-grab-taxi', 'Grab Taxi', 3),
      vendor('v-grabfood', 'GrabFood', 3),
      vendor('v-grabmart', 'GrabMart', 1),
    ]
    expect(matchVendor('Grab Taxi', grabVendors, noHistory)?.vendorName).toBe('Grab Taxi')
    expect(matchVendor('GrabFood', grabVendors, noHistory)?.vendorName).toBe('GrabFood')
    expect(matchVendor('GrabMart', grabVendors, noHistory)?.vendorName).toBe('GrabMart')
    expect(matchVendor('Grab', grabVendors, noHistory)?.vendorName).toBe('Grab')
    expect(
      matchVendor('Grab (GrabFood) - O\'Briens Irish Sandwich Cafe', grabVendors, noHistory)?.vendorName
    ).toBe('GrabFood')
  })

  it('prefers the exactly-named vendor over a longer one containing it', () => {
    const vendors = [vendor('v-xfinity-live', 'Xfinity Live', 40), vendor('v-xfinity', 'Xfinity', 2)]
    expect(matchVendor('Xfinity', vendors, noHistory)?.vendorName).toBe('Xfinity')
  })

  it('does not claim a row for a vendor whose extra tokens are unexplained', () => {
    // the vendor is more specific than the row, and its extra tokens are
    // nowhere in it: "Citizens Bank" (the bank) is not "Citizens Bank Park"
    // (the ballpark)
    expect(matchVendor('Citizens Bank', [vendor('v-park', 'Citizens Bank Park')], noHistory)).toBeNull()
    expect(matchVendor('Xfinity', [vendor('v-live', 'Xfinity Live')], noHistory)).toBeNull()
  })

  // One shared word and the rest different is a different entity. Each pair
  // below scored 56–61% off the shared word plus a flattering edit distance.
  it.each([
    ['American Express', 'Kerry Express'],
    ['Turkish Airlines', 'United Airlines'],
    ['Jennifer Siller', 'Jennifer Stewart'],
    ['Peoples Gas', 'People bar'],
  ])('does not match "%s" to "%s" on one shared word', (description, vendorName) => {
    expect(matchVendor(description, [vendor('v1', vendorName)], noHistory)).toBeNull()
  })

  // …but the fuzzy tier still has to earn its keep. Both rows below are real
  // statement descriptions whose linked transaction confirms the vendor.
  it('keeps the fuzzy matches that ground truth confirms', () => {
    expect(
      matchVendor('UNITED 0164390707915 UNITED.COM TX', [vendor('v-ua', 'United Airlines')], noHistory)?.vendorName
    ).toBe('United Airlines')
    expect(
      matchVendor('BEST WINE CHIANGMAI', [vendor('v-bw', 'Best Wine and Spirit')], noHistory)?.vendorName
    ).toBe('Best Wine and Spirit')
    expect(
      matchVendor('TELLO MOBILE TELLO.COM GA', [vendor('v-tello', 'My Tello')], noHistory)?.vendorName
    ).toBe('My Tello')
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
