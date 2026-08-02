/**
 * Extracted-text normalisation.
 *
 * The audit case: two slips of the same 2026-02-10 ฿65 transfer to
 * MS. SUPAPORN KIDKLA stored references that render identically but compare
 * unequal, because the vision model salted one with a zero-width space. 24 of
 * 300 references carried invisible characters, so the bank reference — the
 * only field that uniquely identifies a transfer — was useless for telling a
 * re-uploaded slip from a new payment.
 */

import {
  stripInvisible,
  normalizeText,
  normalizeReference,
  normalizeExtractionText,
} from '@/lib/payment-slips/text-normalizer'

const ZWSP = '​'
const CLEAN_REF = '016041150258ATF04576'
// Exactly what was stored for Image-1.png.
const CONTAMINATED_REF = `01604115025${ZWSP}8ATF04576`

describe('normalizeReference', () => {
  it('makes the two stored copies of one payment compare equal', () => {
    expect(CONTAMINATED_REF).not.toBe(CLEAN_REF)
    expect(normalizeReference(CONTAMINATED_REF)).toBe(CLEAN_REF)
    expect(normalizeReference(CONTAMINATED_REF)).toBe(normalizeReference(CLEAN_REF))
  })

  it('strips internal whitespace, since references are machine identifiers', () => {
    expect(normalizeReference('01612608470 3AOR04848')).toBe('016126084703AOR04848')
  })

  it('leaves an already-clean reference untouched', () => {
    expect(normalizeReference(CLEAN_REF)).toBe(CLEAN_REF)
  })

  it('passes null and undefined through', () => {
    expect(normalizeReference(null)).toBeNull()
    expect(normalizeReference(undefined)).toBeUndefined()
  })
})

describe('stripInvisible', () => {
  it.each([
    ['zero-width space', '​'],
    ['zero-width non-joiner', '‌'],
    ['zero-width joiner', '‍'],
    ['left-to-right mark', '‎'],
    ['word joiner', '⁠'],
    ['byte order mark', '﻿'],
    ['soft hyphen', '­'],
    ['right-to-left override', '‮'],
  ])('removes %s', (_label, char) => {
    expect(stripInvisible(`ABC${char}123`)).toBe('ABC123')
  })

  it('preserves Thai text', () => {
    // U+200B also appears in Thai as a line-break hint; removing it is
    // harmless because Thai is written without spaces between words.
    expect(stripInvisible(`บริษัท${ZWSP}เจ เค`)).toBe('บริษัทเจ เค')
    expect(stripInvisible('น.ส. สุภาภรณ์')).toBe('น.ส. สุภาภรณ์')
  })

  it('preserves ordinary spaces and punctuation', () => {
    expect(stripInvisible('MS. SUPAPORN KIDKLA')).toBe('MS. SUPAPORN KIDKLA')
  })
})

describe('normalizeText', () => {
  it('keeps single spaces so name and account matching is unaffected', () => {
    expect(normalizeText('MR. DENNIS R')).toBe('MR. DENNIS R')
    expect(normalizeText('BLISS CLEAN AND CARE CO LTD')).toBe('BLISS CLEAN AND CARE CO LTD')
  })

  it('collapses runs of whitespace and trims', () => {
    expect(normalizeText('  SCB   มณฑ  SHOP  ')).toBe('SCB มณฑ SHOP')
  })

  it('removes invisible characters without joining words', () => {
    expect(normalizeText(`NA VANA${ZWSP} CO.,LTD.`)).toBe('NA VANA CO.,LTD.')
  })
})

describe('normalizeExtractionText', () => {
  const extraction = () => ({
    bank_detected: 'kbank',
    date: '2026-02-10',
    amount: 65,
    fee: 0,
    currency: 'THB',
    sender_name: `MR. DENNIS${ZWSP} R`,
    recipient_name: 'MS. SUPAPORN KIDKLA',
    recipient_account: 'xxx-x-x1234-x',
    transaction_reference: CONTAMINATED_REF,
    bank_reference: null,
    memo: null,
  })

  it('cleans the reference and the prose in one pass', () => {
    const result = normalizeExtractionText(extraction())
    expect(result.transaction_reference).toBe(CLEAN_REF)
    expect(result.sender_name).toBe('MR. DENNIS R')
  })

  it('leaves non-string fields alone', () => {
    const result = normalizeExtractionText(extraction())
    expect(result.amount).toBe(65)
    expect(result.fee).toBe(0)
    expect(result.bank_reference).toBeNull()
    expect(result.memo).toBeNull()
  })

  it('does not strip spacing from account fields, which feed direction detection', () => {
    const result = normalizeExtractionText({
      recipient_account: '081 234 5678',
      transaction_reference: '0160 4115',
    })
    // Accounts keep their spacing; only references are whitespace-stripped.
    expect(result.recipient_account).toBe('081 234 5678')
    expect(result.transaction_reference).toBe('01604115')
  })

  it('is idempotent', () => {
    const once = normalizeExtractionText(extraction())
    const twice = normalizeExtractionText({ ...once })
    expect(twice).toEqual(once)
  })
})
