/**
 * AI-client retry behavior.
 *
 * The old implementation raced every call against a single 15s timeout, so
 * a rate-limited call could never complete its backoff — one 429 burst
 * killed 45 of 46 slips in a bulk upload. These tests pin the new contract:
 * transient errors retry (honouring retry-after), permanent errors don't.
 */

import Anthropic from '@anthropic-ai/sdk'
import { isRetryableAiError, withAiRetries } from '@/lib/email/ai-client'

function apiError(status: number, headers?: Record<string, string>) {
  return Anthropic.APIError.generate(
    status,
    { type: 'error', error: { type: 'rate_limit_error', message: 'nope' } },
    'nope',
    new Headers(headers)
  )
}

describe('isRetryableAiError', () => {
  it('marks 429, 5xx, and connection errors retryable', () => {
    expect(isRetryableAiError(apiError(429))).toBe(true)
    expect(isRetryableAiError(apiError(500))).toBe(true)
    expect(isRetryableAiError(apiError(529))).toBe(true)
    expect(isRetryableAiError(new Anthropic.APIConnectionError({ message: 'timeout' }))).toBe(true)
  })

  it('marks 400/401/404 and plain errors permanent', () => {
    expect(isRetryableAiError(apiError(400))).toBe(false)
    expect(isRetryableAiError(apiError(401))).toBe(false)
    expect(isRetryableAiError(apiError(404))).toBe(false)
    expect(isRetryableAiError(new Error('parse failure'))).toBe(false)
  })
})

describe('withAiRetries', () => {
  it('retries a 429 (honouring retry-after) until success', async () => {
    let calls = 0
    const result = await withAiRetries(async () => {
      calls++
      if (calls < 3) throw apiError(429, { 'retry-after': '0' })
      return 'ok'
    })
    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  it('does not retry permanent errors', async () => {
    let calls = 0
    await expect(
      withAiRetries(async () => {
        calls++
        throw apiError(400)
      })
    ).rejects.toThrow()
    expect(calls).toBe(1)
  })

  it('gives up after exhausting attempts and rethrows the last error', async () => {
    let calls = 0
    await expect(
      withAiRetries(async () => {
        calls++
        throw apiError(429, { 'retry-after': '0' })
      })
    ).rejects.toMatchObject({ status: 429 })
    expect(calls).toBe(5)
  })
})
