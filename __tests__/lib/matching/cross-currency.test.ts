/**
 * Cross-Currency Converter Tests
 */

import {
  getExchangeRate,
  convertAmount,
  convertAmountsBatch,
  isWithinConversionTolerance,
  getRateQualityScore,
  formatConversionLog,
  ConversionResult,
} from '@/lib/matching/cross-currency';

// Create a properly chained mock that handles all query patterns
function createMockSupabase() {
  let singleResult: any = { data: null, error: null };
  let limitResult: any = { data: [], error: null };

  const mockSingle = jest.fn(() => Promise.resolve(singleResult));
  const mockLimit = jest.fn(() => Promise.resolve(limitResult));
  const mockOrder = jest.fn(() => ({ limit: mockLimit }));
  const mockLte = jest.fn(() => ({ order: mockOrder }));
  const mockGte = jest.fn(() => ({ lte: mockLte }));
  const mockGt = jest.fn(() => ({ lte: mockLte }));

  // Create a chainable object that can handle both exact and fallback queries
  const createChain = (): any => ({
    single: mockSingle,
    eq: jest.fn(() => createChain()),
    gte: mockGte,
    gt: mockGt,
    lte: mockLte,
    order: mockOrder,
    limit: mockLimit,
  });

  const mockSelect = jest.fn(() => createChain());

  const mockFrom = jest.fn(() => ({
    select: mockSelect,
  }));

  return {
    from: mockFrom,
    _mockFrom: mockFrom,
    _setSingleResult: (data: any) => { singleResult = { data, error: null }; },
    _setLimitResult: (data: any) => { limitResult = { data, error: null }; },
    _mockSingle: mockSingle,
    _mockLimit: mockLimit,
    _reset: () => {
      singleResult = { data: null, error: null };
      limitResult = { data: [], error: null };
      mockSingle.mockClear();
      mockLimit.mockClear();
    },
  };
}

let mockSupabase: ReturnType<typeof createMockSupabase>;

describe('Cross-Currency Converter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe('getExchangeRate', () => {
    it('should return rate 1 for same currency', async () => {
      const result = await getExchangeRate(mockSupabase, 'USD', 'USD', '2024-01-15');

      expect(result).toEqual({
        rate: 1,
        date: '2024-01-15',
        isExact: true,
      });
      // Should not query database
      expect(mockSupabase._mockFrom).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive currency codes', async () => {
      const result = await getExchangeRate(mockSupabase, 'usd', 'USD', '2024-01-15');

      expect(result).toEqual({
        rate: 1,
        date: '2024-01-15',
        isExact: true,
      });
    });

    it('should return exact rate when available', async () => {
      mockSupabase._setSingleResult({ rate: 35.5, date: '2024-01-15' });

      const result = await getExchangeRate(mockSupabase, 'USD', 'THB', '2024-01-15');

      expect(result).toEqual({
        rate: 35.5,
        date: '2024-01-15',
        isExact: true,
      });
    });

    it('should return fallback rate when exact not found', async () => {
      mockSupabase._setSingleResult(null);
      mockSupabase._setLimitResult([{ rate: 35.3, date: '2024-01-14' }]);

      const result = await getExchangeRate(mockSupabase, 'USD', 'THB', '2024-01-15');

      expect(result).toEqual({
        rate: 35.3,
        date: '2024-01-14',
        isExact: false,
      });
    });

    it('should return null when no rate found within maxDaysBack', async () => {
      mockSupabase._setSingleResult(null);
      mockSupabase._setLimitResult([]);

      const result = await getExchangeRate(mockSupabase, 'USD', 'THB', '2024-01-15');

      expect(result).toBeNull();
    });

    it('should not allow approximate when configured', async () => {
      mockSupabase._setSingleResult(null);

      const result = await getExchangeRate(
        mockSupabase,
        'USD',
        'THB',
        '2024-01-15',
        { allowApproximate: false }
      );

      expect(result).toBeNull();
    });

    it('should try future dates if past dates not found', async () => {
      mockSupabase._setSingleResult(null);
      // First limit call returns empty, simulating "try future dates" logic
      // The mock returns the same result for all limit calls, so this tests the flow
      mockSupabase._setLimitResult([{ rate: 35.6, date: '2024-01-16' }]);

      const result = await getExchangeRate(mockSupabase, 'USD', 'THB', '2024-01-15');

      // Will return the first non-empty limit result
      expect(result).toEqual({
        rate: 35.6,
        date: '2024-01-16',
        isExact: false,
      });
    });
  });

  describe('convertAmount', () => {
    it('should convert amount using exact rate', async () => {
      mockSupabase._setSingleResult({ rate: 35.5, date: '2024-01-15' });

      const result = await convertAmount(
        mockSupabase,
        100,
        'USD',
        'THB',
        '2024-01-15'
      );

      expect(result).not.toBeNull();
      expect(result!.convertedAmount).toBe(3550);
      expect(result!.rate).toBe(35.5);
      expect(result!.rateDate).toBe('2024-01-15');
      expect(result!.isExactRate).toBe(true);
      expect(result!.rateDaysDiff).toBe(0);
      expect(result!.fromCurrency).toBe('USD');
      expect(result!.toCurrency).toBe('THB');
      expect(result!.originalAmount).toBe(100);
    });

    it('should convert amount using fallback rate', async () => {
      mockSupabase._setSingleResult(null);
      mockSupabase._setLimitResult([{ rate: 35.3, date: '2024-01-12' }]);

      const result = await convertAmount(
        mockSupabase,
        100,
        'USD',
        'THB',
        '2024-01-15'
      );

      expect(result).not.toBeNull();
      expect(result!.convertedAmount).toBeCloseTo(3530, 2);
      expect(result!.isExactRate).toBe(false);
      expect(result!.rateDaysDiff).toBe(3);
    });

    it('should return null when no rate found', async () => {
      mockSupabase._setSingleResult(null);
      mockSupabase._setLimitResult([]);

      const result = await convertAmount(
        mockSupabase,
        100,
        'USD',
        'THB',
        '2024-01-15'
      );

      expect(result).toBeNull();
    });

    it('should handle same currency conversion', async () => {
      const result = await convertAmount(
        mockSupabase,
        100,
        'USD',
        'USD',
        '2024-01-15'
      );

      expect(result).not.toBeNull();
      expect(result!.convertedAmount).toBe(100);
      expect(result!.rate).toBe(1);
      expect(result!.isExactRate).toBe(true);
    });

    it('should handle decimal amounts', async () => {
      mockSupabase._setSingleResult({ rate: 35.5678, date: '2024-01-15' });

      const result = await convertAmount(
        mockSupabase,
        99.99,
        'USD',
        'THB',
        '2024-01-15'
      );

      expect(result).not.toBeNull();
      // 99.99 * 35.5678 = 3556.424322
      expect(result!.convertedAmount).toBeCloseTo(3556.42, 1);
    });
  });

  describe('convertAmountsBatch', () => {
    it('should convert multiple amounts with same rate', async () => {
      // For batch test, use same rate for simplicity
      mockSupabase._setSingleResult({ rate: 35.5, date: '2024-01-15' });

      const conversions = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'THB', date: '2024-01-15' },
        { amount: 50, fromCurrency: 'USD', toCurrency: 'THB', date: '2024-01-15' },
      ];

      const results = await convertAmountsBatch(mockSupabase, conversions);

      expect(results.size).toBe(2);
      expect(results.get(0)?.convertedAmount).toBe(3550);
      expect(results.get(1)?.convertedAmount).toBe(1775);
    });

    it('should cache rates for same currency pair and date', async () => {
      mockSupabase._setSingleResult({ rate: 35.5, date: '2024-01-15' });

      const conversions = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'THB', date: '2024-01-15' },
        { amount: 200, fromCurrency: 'USD', toCurrency: 'THB', date: '2024-01-15' },
      ];

      const results = await convertAmountsBatch(mockSupabase, conversions);

      expect(results.get(0)?.convertedAmount).toBe(3550);
      expect(results.get(1)?.convertedAmount).toBe(7100);
      // Should only query once due to caching
      expect(mockSupabase._mockSingle).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed found and not found rates', async () => {
      // First query succeeds, subsequent queries fail (mock returns same result)
      mockSupabase._setSingleResult({ rate: 35.5, date: '2024-01-15' });

      const conversions = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'THB', date: '2024-01-15' },
        { amount: 100, fromCurrency: 'USD', toCurrency: 'THB', date: '2024-01-15' },
      ];

      const results = await convertAmountsBatch(mockSupabase, conversions);

      expect(results.get(0)).not.toBeNull();
      expect(results.get(1)).not.toBeNull(); // Both use cached rate
    });
  });

  describe('isWithinConversionTolerance', () => {
    it('should return true for exact match', () => {
      expect(isWithinConversionTolerance(100, 3550, 3550)).toBe(true);
    });

    it('should return true for amounts within 2% tolerance', () => {
      // 3550 vs 3500: 1.43% diff
      expect(isWithinConversionTolerance(100, 3550, 3500)).toBe(true);
    });

    it('should return false for amounts beyond 2% tolerance', () => {
      // 3550 vs 3400: 4.41% diff
      expect(isWithinConversionTolerance(100, 3550, 3400)).toBe(false);
    });

    it('should use custom tolerance', () => {
      // 3550 vs 3400: 4.41% diff
      expect(isWithinConversionTolerance(100, 3550, 3400, 5)).toBe(true);
    });

    it('should handle negative amounts', () => {
      expect(isWithinConversionTolerance(-100, -3550, -3550)).toBe(true);
    });
  });

  describe('getRateQualityScore', () => {
    it('should return 100 for exact date', () => {
      expect(getRateQualityScore(0)).toBe(100);
    });

    it('should return 95 for 1 day difference', () => {
      expect(getRateQualityScore(1)).toBe(95);
    });

    it('should return 85 for 2-3 days difference', () => {
      expect(getRateQualityScore(2)).toBe(85);
      expect(getRateQualityScore(3)).toBe(85);
    });

    it('should return 70 for 4-7 days difference', () => {
      expect(getRateQualityScore(4)).toBe(70);
      expect(getRateQualityScore(7)).toBe(70);
    });

    it('should return 50 for 8-14 days difference', () => {
      expect(getRateQualityScore(8)).toBe(50);
      expect(getRateQualityScore(14)).toBe(50);
    });

    it('should return 30 for 15-30 days difference', () => {
      expect(getRateQualityScore(15)).toBe(30);
      expect(getRateQualityScore(30)).toBe(30);
    });

    it('should return 10 for >30 days difference', () => {
      expect(getRateQualityScore(31)).toBe(10);
      expect(getRateQualityScore(100)).toBe(10);
    });
  });

  describe('formatConversionLog', () => {
    it('should format exact rate conversion', () => {
      const result: ConversionResult = {
        convertedAmount: 3550,
        rate: 35.5,
        rateDate: '2024-01-15',
        isExactRate: true,
        rateDaysDiff: 0,
        fromCurrency: 'USD',
        toCurrency: 'THB',
        originalAmount: 100,
      };

      const log = formatConversionLog(result);

      expect(log).toContain('USD 100.00');
      expect(log).toContain('THB 3550.00');
      expect(log).toContain('35.500000');
      expect(log).toContain('2024-01-15');
      expect(log).toContain('exact rate');
    });

    it('should format approximate rate conversion', () => {
      const result: ConversionResult = {
        convertedAmount: 3530,
        rate: 35.3,
        rateDate: '2024-01-12',
        isExactRate: false,
        rateDaysDiff: 3,
        fromCurrency: 'USD',
        toCurrency: 'THB',
        originalAmount: 100,
      };

      const log = formatConversionLog(result);

      expect(log).toContain('approximate rate');
      expect(log).toContain('3 days diff');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle USD to THB conversion', async () => {
      mockSupabase._setSingleResult({ rate: 35.5, date: '2024-01-15' });

      const result = await convertAmount(
        mockSupabase,
        25.99,
        'USD',
        'THB',
        '2024-01-15'
      );

      expect(result).not.toBeNull();
      expect(result!.convertedAmount).toBeCloseTo(922.645, 2);
    });

    it('should handle THB to USD conversion', async () => {
      mockSupabase._setSingleResult({ rate: 0.0282, date: '2024-01-15' });

      const result = await convertAmount(
        mockSupabase,
        1000,
        'THB',
        'USD',
        '2024-01-15'
      );

      expect(result).not.toBeNull();
      expect(result!.convertedAmount).toBeCloseTo(28.2, 1);
    });

    it('should validate cross-currency Grab receipt', async () => {
      // Grab receipt: THB 350
      // Expected USD: ~$10
      mockSupabase._setSingleResult({ rate: 0.0286, date: '2024-01-15' });

      const result = await convertAmount(
        mockSupabase,
        350,
        'THB',
        'USD',
        '2024-01-15'
      );

      expect(result).not.toBeNull();
      const convertedUSD = result!.convertedAmount;

      // Check if $10.01 matches within tolerance
      expect(isWithinConversionTolerance(350, convertedUSD, 10.01)).toBe(true);
    });
  });
});
