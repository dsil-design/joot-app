/**
 * Email Bundler Tests
 *
 * Verifies that:
 *  - Lazada emails arriving in the same window get grouped
 *  - Non-Lazada vendors are not bundled
 *  - Window/status/order-id constraints are honored
 *  - Bundle size is capped
 */

import { groupRowsIntoBundles } from '@/lib/matching/email-bundler';

interface Row {
  id: string;
  user_id: string;
  from_address: string | null;
  email_date: string | null;
  transaction_date: string | null;
  amount: number | null;
  currency: string | null;
  vendor_name_raw: string | null;
  description: string | null;
  order_id: string | null;
  is_group_primary?: boolean | null;
  status?: string | null;
}

const LAZADA_FROM = 'noreply@lazada.co.th';

function row(over: Partial<Row> = {}): Row {
  return {
    id: 'r1',
    user_id: 'u1',
    from_address: LAZADA_FROM,
    email_date: '2026-03-25T14:04:44Z',
    transaction_date: '2026-03-26',
    amount: 100,
    currency: 'THB',
    vendor_name_raw: 'Lazada Thailand',
    description: 'item',
    order_id: 'o1',
    is_group_primary: true,
    status: 'waiting_for_statement',
    ...over,
  };
}

describe('groupRowsIntoBundles', () => {
  it('groups two same-second Lazada emails into one bundle', () => {
    const rows = [
      row({ id: 'a', amount: 399, order_id: 'oA' }),
      row({ id: 'b', amount: 1430.04, order_id: 'oB' }),
    ];
    const bundles = groupRowsIntoBundles(rows);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].members.map((m) => m.id).sort()).toEqual(['a', 'b']);
    expect(bundles[0].vendorLabel).toBe('Lazada Thailand');
  });

  it('does not bundle a single email', () => {
    const bundles = groupRowsIntoBundles([row({ id: 'lonely' })]);
    expect(bundles).toHaveLength(0);
  });

  it('skips non-allowlisted vendors', () => {
    const rows = [
      row({ id: 'a', from_address: 'noreply@grab.com', order_id: 'oA' }),
      row({ id: 'b', from_address: 'noreply@grab.com', order_id: 'oB' }),
    ];
    expect(groupRowsIntoBundles(rows)).toHaveLength(0);
  });

  it('honors the email_date window', () => {
    const rows = [
      row({ id: 'a', email_date: '2026-03-25T14:00:00Z', order_id: 'oA' }),
      row({ id: 'b', email_date: '2026-03-25T15:00:00Z', order_id: 'oB' }),
    ];
    // 60 min apart, default window is 30
    expect(groupRowsIntoBundles(rows)).toHaveLength(0);

    // Same with widened window
    const wider = groupRowsIntoBundles(rows, { windowMinutes: 90 });
    expect(wider).toHaveLength(1);
    expect(wider[0].members).toHaveLength(2);
  });

  it('skips emails already matched/imported/skipped', () => {
    const rows = [
      row({ id: 'a', status: 'matched', order_id: 'oA' }),
      row({ id: 'b', status: 'waiting_for_statement', order_id: 'oB' }),
    ];
    expect(groupRowsIntoBundles(rows)).toHaveLength(0);
  });

  it('de-duplicates rows that share the same order_id (avoids double-counting)', () => {
    const rows = [
      row({ id: 'a', order_id: 'oA' }),
      row({ id: 'b', order_id: 'oA' }), // same order_id — should be ignored
    ];
    // Only one effective member after de-dup → no bundle
    expect(groupRowsIntoBundles(rows)).toHaveLength(0);
  });

  it('treats different currencies as separate bundles', () => {
    const rows = [
      row({ id: 'a', currency: 'THB', order_id: 'oA' }),
      row({ id: 'b', currency: 'USD', order_id: 'oB' }),
    ];
    expect(groupRowsIntoBundles(rows)).toHaveLength(0);
  });

  it('caps bundle membership at maxMembers', () => {
    const rows = [
      row({ id: 'a', order_id: 'oA' }),
      row({ id: 'b', order_id: 'oB' }),
      row({ id: 'c', order_id: 'oC' }),
      row({ id: 'd', order_id: 'oD' }),
      row({ id: 'e', order_id: 'oE' }),
      row({ id: 'f', order_id: 'oF' }),
    ];
    // 6 eligible siblings, cap at 3 → first three get bundled together; the
    // remaining three form a second bundle of size 3. No bundle exceeds the cap.
    const bundles = groupRowsIntoBundles(rows, { maxMembers: 3 });
    for (const b of bundles) {
      expect(b.members.length).toBeLessThanOrEqual(3);
    }
    const totalMembers = bundles.reduce((s, b) => s + b.members.length, 0);
    expect(totalMembers).toBe(6);
  });
});
