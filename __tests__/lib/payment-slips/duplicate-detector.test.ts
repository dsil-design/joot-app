/**
 * Slip duplicate detection by bank reference.
 *
 * The audit case: uploads on 2026-04-11 and 2026-04-13 carried the same eight
 * February payments to MS. SUPAPORN KIDKLA. Upload-time detection keys on
 * `file_hash`, and the second batch was re-exported photos, so every hash
 * differed and nothing flagged them. The bank reference is unique per
 * transfer and would have caught all eight — but it only exists after the
 * image is read, so the check has to run at the end of extraction.
 */

import {
  isComparableReference,
  findDuplicateByReference,
  duplicateWarning,
  MIN_REFERENCE_LENGTH,
} from '@/lib/payment-slips/duplicate-detector'

// Real references from the affected slips.
const REF_65 = '016041150258ATF04576'
const REF_7500 = '016049105435CTF06871'

describe('isComparableReference', () => {
  it('accepts a real bank reference', () => {
    expect(isComparableReference(REF_65)).toBe(true)
    expect(isComparableReference(REF_7500)).toBe(true)
  })

  it.each([null, undefined, '', '   '])('rejects empty input (%p)', (value) => {
    expect(isComparableReference(value as string | null)).toBe(false)
  })

  it.each(['N/A', 'n/a', 'none', 'NULL', 'unknown', '-', '--'])(
    'rejects the placeholder %p',
    (value) => {
      expect(isComparableReference(value)).toBe(false)
    }
  )

  it('rejects a partial read, which would match unrelated payments', () => {
    expect(isComparableReference('0160411')).toBe(false)
    expect(isComparableReference('ATF04576'.slice(0, MIN_REFERENCE_LENGTH - 1))).toBe(false)
  })

  it('rejects punctuation with no identifier in it', () => {
    expect(isComparableReference('---------------')).toBe(false)
    expect(isComparableReference('...  ...  ...')).toBe(false)
  })
})

/** Minimal stand-in for the Supabase query chain the detector uses. */
function fakeClient(rows: Record<string, unknown>[]) {
  const calls: Record<string, unknown> = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      calls[col] = val
      return chain
    },
    neq: (col: string, val: unknown) => {
      calls[`neq_${col}`] = val
      return chain
    },
    order: () => Promise.resolve({ data: rows }),
  }
  return {
    client: { from: () => chain } as never,
    calls,
  }
}

const slip = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'slip-original',
  filename: 'Image-1.png',
  review_status: 'approved',
  uploaded_at: '2026-04-11T00:00:00Z',
  ...over,
})

describe('findDuplicateByReference', () => {
  it('finds the earlier slip carrying the same payment', async () => {
    const { client } = fakeClient([slip()])
    const match = await findDuplicateByReference(client, 'user-1', REF_65, 'slip-new')

    expect(match).toEqual({
      slipId: 'slip-original',
      filename: 'Image-1.png',
      reviewStatus: 'approved',
      uploadedAt: '2026-04-11T00:00:00Z',
    })
  })

  it('returns null when the payment is genuinely new', async () => {
    const { client } = fakeClient([])
    expect(await findDuplicateByReference(client, 'user-1', REF_65, 'slip-new')).toBeNull()
  })

  it('never compares a reference too weak to prove identity', async () => {
    const { client } = fakeClient([slip()])
    // Would have matched had the query run — the guard must short-circuit.
    expect(await findDuplicateByReference(client, 'user-1', 'N/A', 'slip-new')).toBeNull()
    expect(await findDuplicateByReference(client, 'user-1', null, 'slip-new')).toBeNull()
    expect(await findDuplicateByReference(client, 'user-1', '01604', 'slip-new')).toBeNull()
  })

  it('scopes to the user and excludes the slip being processed', async () => {
    const { client, calls } = fakeClient([slip()])
    await findDuplicateByReference(client, 'user-1', REF_65, 'slip-new')

    expect(calls.user_id).toBe('user-1')
    expect(calls.transaction_reference).toBe(REF_65)
    expect(calls.neq_id).toBe('slip-new')
  })

  it('prefers an approved copy — that is the one the ledger is built on', async () => {
    const { client } = fakeClient([
      slip({ id: 'slip-pending', filename: 'IMG_1345.JPG', review_status: 'pending' }),
      slip({ id: 'slip-approved', filename: 'Image-1.png', review_status: 'approved' }),
    ])
    const match = await findDuplicateByReference(client, 'user-1', REF_65, 'slip-new')

    expect(match?.slipId).toBe('slip-approved')
  })

  it('falls back to the oldest copy when none is approved', async () => {
    const { client } = fakeClient([
      slip({ id: 'slip-a', filename: 'Image-1.png', review_status: 'pending' }),
      slip({ id: 'slip-b', filename: 'IMG_1299.JPG', review_status: 'pending' }),
    ])
    const match = await findDuplicateByReference(client, 'user-1', REF_65, 'slip-new')

    expect(match?.slipId).toBe('slip-a')
  })
})

describe('duplicateWarning', () => {
  it('says the payment is already approved, and why it matters', () => {
    const text = duplicateWarning({
      slipId: 'x',
      filename: 'Image-1.png',
      reviewStatus: 'approved',
      uploadedAt: '2026-04-11T00:00:00Z',
    })
    expect(text).toContain('Image-1.png')
    expect(text).toContain('already approved')
    expect(text).toContain('double-count')
  })

  it('distinguishes a copy that is still awaiting review', () => {
    const text = duplicateWarning({
      slipId: 'x',
      filename: 'IMG_1299.JPG',
      reviewStatus: 'pending',
      uploadedAt: '2026-04-13T00:00:00Z',
    })
    expect(text).toContain('awaiting review')
  })
})
