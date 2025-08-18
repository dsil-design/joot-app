/**
 * @jest-environment jsdom
 */

import { ECBFetcher, ecbFetcher, ecbUtils } from '../../src/lib/services/ecb-fetcher';
import { RateCalculator, rateCalculator, rateUtils } from '../../src/lib/services/rate-calculator';
import { ECBErrorType, ECBError } from '../../src/lib/types/exchange-rates';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock DOMParser for XML parsing
const mockParseFromString = jest.fn();
global.DOMParser = jest.fn().mockImplementation(() => ({
  parseFromString: mockParseFromString
}));

// Sample ECB XML response for testing
const sampleECBXML = `
<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <Cube>
    <Cube time="2024-08-16">
      <Cube currency="USD" rate="1.0945"/>
      <Cube currency="THB" rate="39.755"/>
      <Cube currency="GBP" rate="0.8502"/>
      <Cube currency="SGD" rate="1.4523"/>
      <Cube currency="VND" rate="26854.21"/>
      <Cube currency="MYR" rate="4.8932"/>
    </Cube>
    <Cube time="2024-08-15">
      <Cube currency="USD" rate="1.0932"/>
      <Cube currency="THB" rate="39.621"/>
      <Cube currency="GBP" rate="0.8495"/>
      <Cube currency="SGD" rate="1.4501"/>
      <Cube currency="VND" rate="26798.45"/>
      <Cube currency="MYR" rate="4.8876"/>
    </Cube>
  </Cube>
</gesmes:Envelope>
`;

// Mock DOM document for XML parsing
const createMockDocument = (xmlString: string) => {
  const mockDoc = {
    querySelector: jest.fn(),
    querySelectorAll: jest.fn()
  };

  // Mock XML structure for successful parsing
  const timeCubes = [
    {
      getAttribute: jest.fn((attr) => attr === 'time' ? '2024-08-16' : null),
      querySelectorAll: jest.fn().mockReturnValue([
        { getAttribute: jest.fn((attr) => attr === 'currency' ? 'USD' : attr === 'rate' ? '1.0945' : null) },
        { getAttribute: jest.fn((attr) => attr === 'currency' ? 'THB' : attr === 'rate' ? '39.755' : null) },
        { getAttribute: jest.fn((attr) => attr === 'currency' ? 'GBP' : attr === 'rate' ? '0.8502' : null) }
      ])
    },
    {
      getAttribute: jest.fn((attr) => attr === 'time' ? '2024-08-15' : null),
      querySelectorAll: jest.fn().mockReturnValue([
        { getAttribute: jest.fn((attr) => attr === 'currency' ? 'USD' : attr === 'rate' ? '1.0932' : null) },
        { getAttribute: jest.fn((attr) => attr === 'currency' ? 'THB' : attr === 'rate' ? '39.621' : null) }
      ])
    }
  ];

  mockDoc.querySelector.mockReturnValue(null); // No parser errors
  mockDoc.querySelectorAll.mockImplementation((selector) => {
    if (selector === 'Cube[time]') return timeCubes;
    return [];
  });

  return mockDoc;
};

describe('ECBFetcher', () => {
  let fetcher: ECBFetcher;

  beforeEach(() => {
    jest.clearAllMocks();
    fetcher = new ECBFetcher();
    mockParseFromString.mockImplementation(() => createMockDocument(sampleECBXML));
  });

  describe('fetchDailyRates', () => {
    it('should successfully fetch and parse daily rates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(sampleECBXML)
      });

      const result = await fetcher.fetchDailyRates();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
      expect(result.data![0]).toHaveProperty('date');
      expect(result.data![0]).toHaveProperty('currency');
      expect(result.data![0]).toHaveProperty('rate');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetcher.fetchDailyRates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });

    it('should handle network errors with retry', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetcher.fetchDailyRates();

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Should retry 3 times
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const result = await fetcher.fetchDailyRates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limited');
    });
  });

  describe('fetchHistoricalRates', () => {
    it('should successfully fetch historical rates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(sampleECBXML)
      });

      const result = await fetcher.fetchHistoricalRates();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('fetchRatesForDateRange', () => {
    it('should filter rates by date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(sampleECBXML)
      });

      const result = await fetcher.fetchRatesForDateRange('2024-08-15', '2024-08-16');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Should include both dates in our sample data
      if (result.data) {
        const dates = [...new Set(result.data.map(r => r.date))];
        expect(dates).toContain('2024-08-16');
        expect(dates).toContain('2024-08-15');
      }
    });
  });

  describe('XML parsing', () => {
    it('should handle malformed XML', async () => {
      mockParseFromString.mockReturnValue({
        querySelector: jest.fn().mockReturnValue({ textContent: 'Parser error' }),
        querySelectorAll: jest.fn()
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('invalid xml')
      });

      const result = await fetcher.fetchDailyRates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('XML parsing failed');
    });

    it('should validate rate values', async () => {
      const invalidDoc = {
        querySelector: jest.fn().mockReturnValue(null),
        querySelectorAll: jest.fn().mockReturnValue([
          {
            getAttribute: jest.fn((attr) => attr === 'time' ? '2024-08-16' : null),
            querySelectorAll: jest.fn().mockReturnValue([
              { getAttribute: jest.fn((attr) => attr === 'currency' ? 'USD' : attr === 'rate' ? '-1.5' : null) }
            ])
          }
        ])
      };

      mockParseFromString.mockReturnValue(invalidDoc);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(sampleECBXML)
      });

      const result = await fetcher.fetchDailyRates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });
  });

  describe('metrics', () => {
    it('should track performance metrics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(sampleECBXML)
      });

      await fetcher.fetchDailyRates();
      const metrics = fetcher.getMetrics();

      expect(metrics.apiCalls).toBe(1);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.ratesProcessed).toBeGreaterThan(0);
      expect(metrics.errors).toBe(0);
    });
  });
});

describe('RateCalculator', () => {
  let calculator: RateCalculator;

  beforeEach(() => {
    calculator = new RateCalculator();
  });

  describe('calculateCrossRates', () => {
    it('should calculate USD/THB from EUR rates', () => {
      const eurRates = [
        { date: '2024-08-16', currency: 'USD', rate: 1.0945 },
        { date: '2024-08-16', currency: 'THB', rate: 39.755 }
      ];

      const crossRates = calculator.calculateCrossRates(eurRates);

      // Find USD/THB rate
      const usdThbRate = crossRates.find(
        rate => rate.from_currency === 'USD' && rate.to_currency === 'THB'
      );

      expect(usdThbRate).toBeDefined();
      // 39.755 / 1.0945 ≈ 36.32
      expect(usdThbRate!.rate).toBeCloseTo(36.32, 1);
    });

    it('should calculate EUR rates correctly', () => {
      const eurRates = [
        { date: '2024-08-16', currency: 'USD', rate: 1.0945 }
      ];

      const crossRates = calculator.calculateCrossRates(eurRates);

      // Find EUR/USD rate
      const eurUsdRate = crossRates.find(
        rate => rate.from_currency === 'EUR' && rate.to_currency === 'USD'
      );

      expect(eurUsdRate).toBeDefined();
      expect(eurUsdRate!.rate).toBe(1.0945);
    });

    it('should calculate inverse rates', () => {
      const rate = 1.0945;
      const inverseRate = calculator.calculateInverseRate(rate);

      expect(inverseRate).toBeCloseTo(1 / 1.0945, 6);
    });
  });

  describe('validateRequiredCurrencies', () => {
    it('should validate required currencies are present', () => {
      const rates = [
        { date: '2024-08-16', currency: 'USD', rate: 1.0945 },
        { date: '2024-08-16', currency: 'THB', rate: 39.755 }
      ];

      const validation = calculator.validateRequiredCurrencies(rates, ['USD', 'THB', 'EUR']);

      expect(validation.isValid).toBe(true);
      expect(validation.missingCurrencies).toHaveLength(0);
    });

    it('should identify missing currencies', () => {
      const rates = [
        { date: '2024-08-16', currency: 'USD', rate: 1.0945 }
      ];

      const validation = calculator.validateRequiredCurrencies(rates, ['USD', 'THB', 'GBP']);

      expect(validation.isValid).toBe(false);
      expect(validation.missingCurrencies).toContain('THB');
      expect(validation.missingCurrencies).toContain('GBP');
    });
  });

  describe('interpolateRate', () => {
    it('should interpolate rate between two dates', () => {
      const startRate = 36.0;
      const endRate = 37.0;
      const startDate = new Date('2024-08-15');
      const endDate = new Date('2024-08-17');
      const targetDate = new Date('2024-08-16');

      const interpolatedRate = calculator.interpolateRate(
        startRate, endRate, startDate, endDate, targetDate
      );

      // Should be halfway between 36.0 and 37.0
      expect(interpolatedRate).toBe(36.5);
    });
  });

  describe('calculateRateWithConfidence', () => {
    it('should calculate confidence intervals', () => {
      const historicalRates = [36.0, 36.5, 37.0, 36.8, 36.2];
      const currentRate = 36.5;

      const result = calculator.calculateRateWithConfidence(historicalRates, currentRate);

      expect(result.rate).toBe(36.5);
      expect(result.confidenceInterval.lower).toBeLessThan(currentRate);
      expect(result.confidenceInterval.upper).toBeGreaterThan(currentRate);
      expect(result.volatility).toBeGreaterThan(0);
    });
  });
});

describe('ECBUtils', () => {
  describe('isECBUpdateTime', () => {
    it('should identify ECB update times', () => {
      // This is a basic test - in practice would need to mock Date
      const isUpdateTime = ecbUtils.isECBUpdateTime();
      expect(typeof isUpdateTime).toBe('boolean');
    });
  });

  describe('getMostRecentECBDate', () => {
    it('should return most recent business day', () => {
      const recentDate = ecbUtils.getMostRecentECBDate();
      expect(recentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('RateUtils', () => {
  describe('formatRate', () => {
    it('should format rates with appropriate decimals', () => {
      expect(rateUtils.formatRate(36.3245, 'USD', 'THB')).toBe('36.3245');
      expect(rateUtils.formatRate(26854.21, 'USD', 'VND')).toBe('26854.21');
    });
  });

  describe('calculatePercentageChange', () => {
    it('should calculate percentage change correctly', () => {
      const change = rateUtils.calculatePercentageChange(100, 110);
      expect(change).toBe(10);
    });

    it('should handle zero old rate', () => {
      const change = rateUtils.calculatePercentageChange(0, 110);
      expect(change).toBe(0);
    });
  });

  describe('isRateReasonable', () => {
    it('should validate reasonable USD/THB rates', () => {
      expect(rateUtils.isRateReasonable(36.5, 'USD', 'THB')).toBe(true);
      expect(rateUtils.isRateReasonable(100, 'USD', 'THB')).toBe(false);
      expect(rateUtils.isRateReasonable(0, 'USD', 'THB')).toBe(false);
    });

    it('should validate reasonable USD/EUR rates', () => {
      expect(rateUtils.isRateReasonable(0.85, 'USD', 'EUR')).toBe(true);
      expect(rateUtils.isRateReasonable(2.0, 'USD', 'EUR')).toBe(false);
    });
  });

  describe('getPairDisplayString', () => {
    it('should format currency pair display string', () => {
      expect(rateUtils.getPairDisplayString('USD', 'THB')).toBe('USD/THB');
    });
  });
});

describe('Integration Tests', () => {
  it('should process complete ECB workflow', async () => {
    // Mock successful ECB response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(sampleECBXML)
    });

    // Fetch rates from ECB
    const fetchResult = await ecbFetcher.fetchDailyRates();
    expect(fetchResult.success).toBe(true);

    if (fetchResult.data) {
      // Calculate cross rates
      const crossRates = rateCalculator.calculateCrossRates(fetchResult.data);
      expect(crossRates.length).toBeGreaterThan(0);

      // Verify all rates are reasonable
      for (const rate of crossRates) {
        expect(rate.rate).toBeGreaterThan(0);
        expect(rate.source).toBe('ECB');
        expect(rate.is_interpolated).toBe(false);
      }
    }
  });
});

describe('Error Handling', () => {
  it('should handle ECBError correctly', () => {
    const error = new ECBError(ECBErrorType.NETWORK_ERROR, 'Test error');
    expect(error.type).toBe(ECBErrorType.NETWORK_ERROR);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ECBError');
  });

  it('should handle network timeouts', async () => {
    mockFetch.mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );

    const result = await ecbFetcher.fetchDailyRates();
    expect(result.success).toBe(false);
  });
});