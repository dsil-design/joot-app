/**
 * Unit tests for the Amazon order email parser
 *
 * Exercises the parser against the real production email body that triggered
 * this feature (3-sub-order April 30 order) plus synthetic single-order and
 * malformed inputs.
 */

import fs from 'fs';
import path from 'path';
import {
  amazonParser,
  splitIntoSubOrderBlocks,
  parseArrivalDate,
} from '@/lib/email/extractors/amazon';
import type { RawEmailData, ExtractionResult } from '@/lib/email/types';

function createMockEmail(overrides: Partial<RawEmailData> = {}): RawEmailData {
  return {
    message_id: 'test-amazon-id',
    uid: 1,
    folder: 'INBOX',
    subject: 'Ordered: "Some Item..."',
    from_address: 'auto-confirm@amazon.com',
    from_name: 'Amazon.com',
    email_date: new Date('2026-04-30T22:39:29Z'),
    text_body: null,
    html_body: null,
    seen: false,
    has_attachments: false,
    ...overrides,
  };
}

// extract() is declared async-or-sync via union; in practice the Amazon
// parser is synchronous. This unwraps for readable test code.
function unwrap(r: ExtractionResult | Promise<ExtractionResult>): ExtractionResult {
  if (r instanceof Promise) throw new Error('Expected synchronous extraction');
  return r;
}

describe('amazonParser', () => {
  describe('canParse', () => {
    it('matches auto-confirm@amazon.com', () => {
      expect(amazonParser.canParse(createMockEmail({
        from_address: 'auto-confirm@amazon.com',
      }))).toBe(true);
    });

    it('matches amazon.co.uk senders', () => {
      expect(amazonParser.canParse(createMockEmail({
        from_address: 'order-update@amazon.co.uk',
      }))).toBe(true);
    });

    it('matches by subject when sender is non-amazon (forwarded mail)', () => {
      expect(amazonParser.canParse(createMockEmail({
        from_address: 'forwarder@example.com',
        subject: 'Ordered: "Skechers..." and 13 more items',
      }))).toBe(true);
    });

    it('rejects unrelated emails', () => {
      expect(amazonParser.canParse(createMockEmail({
        from_address: 'noreply@grab.com',
        subject: 'Your Grab E-Receipt',
      }))).toBe(false);
    });
  });

  describe('extract — multi-sub-order email', () => {
    // The real production body that triggered this feature.
    const fixturePath = path.resolve(__dirname, '../../../fixtures/emails/amazon/three-sub-orders.txt');

    it('extracts 3 sub-orders with correct amounts and order IDs', () => {
      const body = fs.readFileSync(fixturePath, 'utf8');
      const result = unwrap(amazonParser.extract(createMockEmail({ text_body: body })));

      expect(result.success).toBe(true);
      expect(result.data?.currency).toBe('USD');
      expect(result.data?.amount).toBeCloseTo(420.87, 2);

      const subs = result.data?.sub_orders ?? [];
      expect(subs).toHaveLength(3);
      expect(subs[0]).toMatchObject({ order_id: '111-8507210-6332245', amount: 361.61, currency: 'USD' });
      expect(subs[1]).toMatchObject({ order_id: '111-1346918-8922644', amount: 20.79, currency: 'USD' });
      expect(subs[2]).toMatchObject({ order_id: '111-4731488-0557010', amount: 38.47, currency: 'USD' });

      // Composite parent order_id mirrors the AI-fallback historic format,
      // pipe-separated so downstream consolidation/search keeps working.
      expect(result.data?.order_id).toBe(
        '111-8507210-6332245 | 111-1346918-8922644 | 111-4731488-0557010',
      );
    });
  });

  describe('extract — single-order email', () => {
    it('emits an extraction with no sub_orders array when only one block is present', () => {
      const body = [
        'Thanks for your order, Dennis!',
        '',
        'Order #',
        '112-9580137-4391417',
        '',
        '* Philips Norelco Genuine Replacement Heads',
        '  Quantity: 1',
        '  48.11 USD',
        '',
        'Grand Total:',
        '48.11 USD',
        '',
      ].join('\n');

      const result = unwrap(amazonParser.extract(createMockEmail({ text_body: body })));
      expect(result.success).toBe(true);
      expect(result.data?.amount).toBeCloseTo(48.11, 2);
      expect(result.data?.currency).toBe('USD');
      expect(result.data?.order_id).toBe('112-9580137-4391417');
      // Single-order emails behave like normal one-amount receipts — no
      // sub_orders array, so downstream matching uses the single-amount path.
      expect(result.data?.sub_orders).toBeUndefined();
    });

    it('handles digital order IDs prefixed with D', () => {
      const body = [
        'Order #',
        'D01-6843166-4998654',
        '',
        '* The Sellout: A Novel',
        '  Quantity: 1',
        '  5.99 USD',
        '',
        'Grand Total:',
        '5.99 USD',
      ].join('\n');
      const result = unwrap(amazonParser.extract(createMockEmail({ text_body: body })));
      expect(result.success).toBe(true);
      expect(result.data?.order_id).toBe('D01-6843166-4998654');
    });
  });

  describe('extract — failure modes', () => {
    it('fails when text body is empty', () => {
      const result = unwrap(amazonParser.extract(createMockEmail({ text_body: '' })));
      expect(result.success).toBe(false);
    });

    it('fails when no Grand Total line is present', () => {
      const body = 'Order #\n111-1111111-1111111\n\nSome items but no total line.';
      const result = unwrap(amazonParser.extract(createMockEmail({ text_body: body })));
      expect(result.success).toBe(false);
    });
  });

  describe('splitIntoSubOrderBlocks', () => {
    it('splits a multi-block body by Order # headers', () => {
      const body = 'pre\nOrder #\n111-0000000-0000001\nfoo\nOrder #\n111-0000000-0000002\nbar';
      const blocks = splitIntoSubOrderBlocks(body);
      expect(blocks.map((b) => b.orderId)).toEqual([
        '111-0000000-0000001',
        '111-0000000-0000002',
      ]);
    });

    it('returns an empty array when no Order # header is present', () => {
      expect(splitIntoSubOrderBlocks('No order headers here')).toEqual([]);
    });
  });

  describe('parseArrivalDate', () => {
    it('parses month-name arrival hints', () => {
      const ref = new Date('2026-04-30T00:00:00Z');
      const d = parseArrivalDate('Arriving May 7', ref);
      expect(d?.toISOString().slice(0, 10)).toBe('2026-05-07');
    });

    it('returns undefined for day-of-week arrival hints', () => {
      const ref = new Date('2026-04-30T00:00:00Z');
      expect(parseArrivalDate('Arriving Sunday', ref)).toBeUndefined();
    });

    it('rolls over to next year when month is far behind the reference', () => {
      const ref = new Date('2026-11-30T00:00:00Z');
      const d = parseArrivalDate('Arriving February 3', ref);
      expect(d?.toISOString().slice(0, 10)).toBe('2027-02-03');
    });
  });
});
