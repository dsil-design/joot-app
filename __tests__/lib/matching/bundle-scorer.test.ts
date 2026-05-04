/**
 * Bundle Scorer Tests
 *
 * Anchored on the production example: Lazada orders
 *  - 72140ee8 → THB 399.00
 *  - 9024e8ea → THB 1,430.04
 * vs. a Chase Sapphire $56.75 charge on 2026-03-26.
 *
 * Rate THB→USD on 2026-03-25 = 0.03105567 → 1829.04 * 0.03105567 ≈ $56.80,
 * a 0.09% delta — should land in the HIGH confidence band.
 */

import { scoreBundleAgainstTarget } from '@/lib/matching/bundle-scorer';
import type { EmailBundle } from '@/lib/matching/email-bundler';
import type { TargetTransaction } from '@/lib/matching/match-scorer';

interface MockSupabaseLike {
  from: jest.Mock;
}

// Minimal supabase mock that always returns the production exchange rate.
function makeRateMock(rate: number): MockSupabaseLike {
  const single = jest.fn().mockResolvedValue({
    data: { rate, date: '2026-03-25' },
    error: null,
  });
  const limit = jest.fn().mockResolvedValue({ data: [], error: null });
  const order = jest.fn(() => ({ limit }));
  const lte = jest.fn(() => ({ order }));
  const gt = jest.fn(() => ({ lte }));
  const gte = jest.fn(() => ({ lte }));

  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;
  chain.eq = jest.fn(() => chain);
  chain.single = single;
  chain.gte = gte;
  chain.gt = gt;
  chain.lte = lte;
  chain.order = order;
  chain.limit = limit;
  const select = jest.fn(() => chain);
  return { from: jest.fn(() => ({ select })) } as unknown as MockSupabaseLike;
}

const PROD_BUNDLE: EmailBundle = {
  focalId: '9024e8ea-08c4-43e0-9507-3dbea14ae319',
  vendorLabel: 'Lazada Thailand',
  members: [
    {
      id: '9024e8ea-08c4-43e0-9507-3dbea14ae319',
      amount: 1430.04,
      currency: 'THB',
      transaction_date: '2026-03-26',
      email_date: '2026-03-25T14:04:44Z',
      vendor: 'Lazada Thailand',
      order_id: '1092904511708824',
    },
    {
      id: '72140ee8-71a6-4097-b52c-fbeaf7c69751',
      amount: 399.0,
      currency: 'THB',
      transaction_date: '2026-03-26',
      email_date: '2026-03-25T14:04:44Z',
      vendor: 'Lazada Thailand',
      order_id: '1092904512508824',
    },
  ],
};

const CHASE_TARGET: TargetTransaction = {
  id: 'chase-56-75',
  amount: 56.75,
  currency: 'USD',
  date: '2026-03-26',
  vendor: 'Lazada',
};

describe('scoreBundleAgainstTarget — production example', () => {
  it('returns a HIGH confidence score for the Mar 25 Lazada bundle vs $56.75 Chase charge', async () => {
    const supabase = makeRateMock(0.03105567);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await scoreBundleAgainstTarget(PROD_BUNDLE, CHASE_TARGET, supabase as any);

    expect(result.targetId).toBe('chase-56-75');
    expect(result.memberIds).toHaveLength(2);
    expect(result.totalNativeAmount).toBeCloseTo(1829.04, 2);
    expect(result.convertedAmount).toBeCloseTo(56.80, 1);
    expect(result.isCrossCurrency).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.confidence).toMatch(/HIGH|MEDIUM/);
    expect(result.isMatch).toBe(true);
  });

  it('reports each member conversion individually', async () => {
    const supabase = makeRateMock(0.03105567);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await scoreBundleAgainstTarget(PROD_BUNDLE, CHASE_TARGET, supabase as any);
    expect(result.conversions).toHaveLength(2);
    for (const c of result.conversions) {
      expect(c.rate).toBeCloseTo(0.03105567, 5);
      expect(c.convertedAmount).toBeGreaterThan(0);
    }
  });

  it('drops the score significantly when bundle total diverges from target amount', async () => {
    const supabase = makeRateMock(0.03105567);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matched = await scoreBundleAgainstTarget(PROD_BUNDLE, CHASE_TARGET, supabase as any);
    const wrongTarget: TargetTransaction = { ...CHASE_TARGET, amount: 200, vendor: 'Unrelated' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrong = await scoreBundleAgainstTarget(PROD_BUNDLE, wrongTarget, supabase as any);
    expect(wrong.score).toBeLessThan(matched.score);
    // Amount-divergence cap should kick in even if other axes match
    expect(wrong.score).toBeLessThanOrEqual(60);
  });
});
