import { getSlipBadge } from '@/lib/payment-slips/slip-badge'

const slip = (over: Partial<Parameters<typeof getSlipBadge>[0]> = {}) => ({
  status: 'ready_for_review',
  review_status: 'pending',
  ...over,
})

describe('getSlipBadge', () => {
  it('shows Duplicate for an unreviewed copy of a payment already in the account', () => {
    expect(getSlipBadge(slip({ duplicate_of_slip_id: 'slip-original' })).label).toBe('Duplicate')
  })

  it('shows Ready when the slip is not a duplicate', () => {
    expect(getSlipBadge(slip()).label).toBe('Ready')
    expect(getSlipBadge(slip({ duplicate_of_slip_id: null })).label).toBe('Ready')
  })

  it('does not overwrite a decision the user already made', () => {
    // Once reviewed, the outcome matters more than the duplicate hint.
    expect(getSlipBadge(slip({ review_status: 'approved', duplicate_of_slip_id: 'x' })).label).toBe('Approved')
    expect(getSlipBadge(slip({ review_status: 'rejected', duplicate_of_slip_id: 'x' })).label).toBe('Rejected')
  })

  it('lets blocking pipeline states win — a duplicate flag is stale mid-extraction', () => {
    expect(getSlipBadge(slip({ status: 'failed', duplicate_of_slip_id: 'x' })).label).toBe('Failed')
    expect(getSlipBadge(slip({ status: 'processing', duplicate_of_slip_id: 'x' })).label).toBe('Processing')
    expect(getSlipBadge(slip({ status: 'pending', duplicate_of_slip_id: 'x' })).label).toBe('Pending')
  })

  it('keeps the existing states unchanged', () => {
    expect(getSlipBadge(slip({ status: 'failed' })).label).toBe('Failed')
    expect(getSlipBadge(slip({ status: 'processing' })).label).toBe('Processing')
    expect(getSlipBadge(slip({ status: 'pending' })).label).toBe('Pending')
    expect(getSlipBadge(slip({ review_status: 'approved' })).label).toBe('Approved')
    expect(getSlipBadge(slip({ review_status: 'rejected' })).label).toBe('Rejected')
  })

  it('gives every state a distinguishable colour', () => {
    const labels = ['failed', 'processing', 'pending'].map(s => getSlipBadge(slip({ status: s })))
    const dup = getSlipBadge(slip({ duplicate_of_slip_id: 'x' }))
    const ready = getSlipBadge(slip())
    expect(dup.className).not.toBe(ready.className)
    expect(new Set([...labels, dup, ready].map(b => b.className)).size).toBe(5)
  })
})
