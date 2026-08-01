/**
 * Slip ↔ statement cross-check.
 *
 * The audit case: IMG_0615.JPG plainly reads ฿237 but was stored as ฿23,700
 * at extraction confidence 100 — internally consistent, externally absurd.
 * The KBANK statement had a -237 row that day and no ฿23,700 row. Only a
 * check against the ledger of record can catch this class of error.
 */

import { findCorroboratingRow } from '@/lib/payment-slips/statement-cross-check'
import { validateExtraction, SINGLE_PASS_CONFIDENCE_CAP } from '@/lib/payment-slips/extraction-validator'
import type { PaymentSlipExtraction } from '@/lib/payment-slips/types'

// KBANK convention: positive = outgoing, negative = incoming
const MAY_ROWS = [
  { amount: -237, transaction_date: '2026-05-03', description: 'From: MS. SUPAPORN KIDK' },
  { amount: 495.41, transaction_date: '2026-05-18', description: 'To: PROVINCIAL WATERWORKS' },
  { amount: 2000, transaction_date: '2026-05-17', description: 'To: MR LEIGH JOHN MCMI' },
]

describe('findCorroboratingRow', () => {
  it('finds no counterpart for the hallucinated ฿23,700', () => {
    const row = findCorroboratingRow(MAY_ROWS, {
      amount: 23700,
      fee: 0,
      date: '2026-05-03',
      direction: 'income',
    })
    expect(row).toBeNull()
  })

  it('corroborates the true ฿237 incoming amount', () => {
    const row = findCorroboratingRow(MAY_ROWS, {
      amount: 237,
      fee: 0,
      date: '2026-05-03',
      direction: 'income',
    })
    expect(row?.amount).toBe(-237)
  })

  it('respects direction — an incoming row cannot corroborate an outgoing slip', () => {
    const row = findCorroboratingRow(MAY_ROWS, {
      amount: 237,
      fee: 0,
      date: '2026-05-03',
      direction: 'expense',
    })
    expect(row).toBeNull()
  })

  it('tolerates the transfer fee (statement books amount + fee)', () => {
    const rows = [{ amount: 510.41, transaction_date: '2026-05-18' }]
    const row = findCorroboratingRow(rows, {
      amount: 495.41,
      fee: 15,
      date: '2026-05-18',
      direction: 'expense',
    })
    expect(row).not.toBeNull()
  })

  it('rejects rows outside the ±2 day window', () => {
    const row = findCorroboratingRow(MAY_ROWS, {
      amount: 2000,
      fee: 0,
      date: '2026-05-25',
      direction: 'expense',
    })
    expect(row).toBeNull()
  })
})

describe('validateExtraction confidence cap', () => {
  it('never returns confidence above the single-pass cap', () => {
    const extraction = {
      bank_detected: 'kbank',
      date: '2026-05-03',
      date_raw: '3 พ.ค. 69',
      time: '12:30',
      amount: 237,
      amount_raw: '237.00',
      fee: 0,
      currency: 'THB',
      sender_name: 'MS. SUPAPORN KIDKARNJANARUK',
      recipient_name: 'MR. DENNIS SILLER',
      transaction_reference: '016123091735DTF05113',
      transfer_type: 'direct',
    } as unknown as PaymentSlipExtraction

    const result = validateExtraction(extraction)
    expect(result.isValid).toBe(true)
    expect(result.confidence).toBeLessThanOrEqual(SINGLE_PASS_CONFIDENCE_CAP)
    expect(SINGLE_PASS_CONFIDENCE_CAP).toBeLessThan(95) // must stay below auto-approve
  })
})
