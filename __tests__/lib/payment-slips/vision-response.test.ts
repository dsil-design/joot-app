/**
 * Reading a vision response.
 *
 * The audit case: IMG_1613.JPG died with "Unterminated string in JSON at
 * position 2888 (line 16 column 2468)". The API call had succeeded, so the
 * failure was a plain SyntaxError from JSON.parse — not an APIError — and
 * isRetryableAiError returned false. The slip was written off as permanently
 * failed and skipped by every `failed-retryable` recovery pass, for months.
 *
 * Re-asking the model with the same image parsed cleanly, which is the point:
 * the response is non-deterministic, so an unusable one is a transient fault.
 */

import {
  parseVisionResponse,
  VisionResponseError,
} from '@/lib/payment-slips/vision-extractor'
import { isRetryableAiError } from '@/lib/email/ai-client'

const VALID_JSON = JSON.stringify({
  bank_detected: 'kbank',
  date: '2026-02-28',
  amount: 100,
  fee: 0,
  currency: 'THB',
  sender_name: 'MR. DENNIS R',
  recipient_name: 'MS. SUPAPORN KIDKLA',
  transaction_reference: '016059080530DPM14425',
  bank_reference: '46130363XBX49Y000000',
  memo: null,
  transfer_type: 'direct',
})

const response = (text: string, stop: string | null = 'end_turn') => ({
  stop_reason: stop,
  content: [{ type: 'text', text }],
})

describe('parseVisionResponse', () => {
  it('reads a well-formed response', () => {
    const result = parseVisionResponse(response(VALID_JSON))
    expect(result.amount).toBe(100)
    expect(result.transaction_reference).toBe('016059080530DPM14425')
  })

  it('strips markdown fences the model sometimes adds', () => {
    expect(parseVisionResponse(response('```json\n' + VALID_JSON + '\n```')).amount).toBe(100)
    expect(parseVisionResponse(response('```\n' + VALID_JSON + '\n```')).amount).toBe(100)
  })

  it('normalises text on the way through', () => {
    const salted = JSON.stringify({
      ...JSON.parse(VALID_JSON),
      transaction_reference: '01605908053' + '​' + '0DPM14425',
    })
    expect(parseVisionResponse(response(salted)).transaction_reference).toBe('016059080530DPM14425')
  })

  describe('unusable responses', () => {
    it('reports truncation explicitly rather than as a parse error', () => {
      expect(() => parseVisionResponse(response('{"amount": 1', 'max_tokens'))).toThrow(
        VisionResponseError
      )
      expect(() => parseVisionResponse(response('{"amount": 1', 'max_tokens'))).toThrow(
        /token limit/i
      )
    })

    it('reports malformed JSON with the detail needed to diagnose it', () => {
      // The shape that killed IMG_1613: a string left unterminated.
      const truncated = '{"bank_detected": "kbank", "sender_name": "MR. DENNIS'
      expect(() => parseVisionResponse(response(truncated))).toThrow(VisionResponseError)
      try {
        parseVisionResponse(response(truncated))
      } catch (error) {
        expect((error as Error).message).toMatch(/not valid JSON/)
        expect((error as Error).message).toMatch(/received \d+ characters/)
      }
    })

    it('rejects a response with no text block', () => {
      expect(() =>
        parseVisionResponse({ stop_reason: 'end_turn', content: [{ type: 'thinking' }] })
      ).toThrow(VisionResponseError)
    })
  })

  describe('retry classification — why IMG_1613 stayed dead', () => {
    it('marks every unusable response retryable', () => {
      const cases = [
        () => parseVisionResponse(response('{"a": 1', 'max_tokens')),
        () => parseVisionResponse(response('{"sender_name": "MR')),
        () => parseVisionResponse({ stop_reason: 'end_turn', content: [] }),
      ]
      for (const run of cases) {
        try {
          run()
          throw new Error('expected a VisionResponseError')
        } catch (error) {
          expect(error).toBeInstanceOf(VisionResponseError)
          // Both the in-call retry and the failed-retryable recovery scope
          // key on this. A bare SyntaxError is invisible to both.
          expect(isRetryableAiError(error)).toBe(true)
        }
      }
    })

    it('leaves a raw SyntaxError unretryable, as before', () => {
      // Establishes the contrast: nothing generic became retryable.
      expect(isRetryableAiError(new SyntaxError('Unterminated string in JSON'))).toBe(false)
      expect(isRetryableAiError(new Error('boom'))).toBe(false)
    })
  })
})
