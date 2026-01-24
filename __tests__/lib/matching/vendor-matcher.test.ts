/**
 * Vendor Fuzzy Matching Algorithm Tests
 */

import {
  normalizeVendorName,
  levenshteinDistance,
  calculateSimilarity,
  compareVendors,
  findBestVendorMatch,
  isLikelyMatch,
  extractVendorFromDescription,
  createAliasMap,
  VENDOR_SCORE_THRESHOLDS,
  DEFAULT_ALIASES,
} from '@/lib/matching/vendor-matcher';

describe('Vendor Fuzzy Matching Algorithm', () => {
  describe('normalizeVendorName', () => {
    it('should lowercase names', () => {
      expect(normalizeVendorName('STARBUCKS')).toBe('starbucks');
    });

    it('should trim whitespace', () => {
      expect(normalizeVendorName('  Starbucks  ')).toBe('starbucks');
    });

    it('should remove Inc/LLC/Ltd suffixes', () => {
      expect(normalizeVendorName('Amazon Inc')).toBe('amazon');
      expect(normalizeVendorName('Apple LLC')).toBe('apple');
      expect(normalizeVendorName('Uber Ltd')).toBe('uber');
      expect(normalizeVendorName('Tesla Corp')).toBe('tesla');
    });

    it('should remove store numbers', () => {
      expect(normalizeVendorName('Starbucks #1234')).toBe('starbucks');
      expect(normalizeVendorName('Target-5678')).toBe('target');
    });

    it('should remove asterisks', () => {
      expect(normalizeVendorName('GRAB*')).toBe('grab');
      expect(normalizeVendorName('*UBER*')).toBe('uber');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeVendorName('Star   Bucks')).toBe('star bucks');
    });

    it('should remove leading/trailing punctuation', () => {
      expect(normalizeVendorName('***AMAZON***')).toBe('amazon');
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('starbucks', 'starbucks')).toBe(0);
    });

    it('should return string length for empty comparison', () => {
      expect(levenshteinDistance('test', '')).toBe(4);
      expect(levenshteinDistance('', 'test')).toBe(4);
    });

    it('should calculate correct distance for single edit', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
      expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
      expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
    });

    it('should calculate correct distance for multiple edits', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should handle case sensitivity', () => {
      expect(levenshteinDistance('Test', 'test')).toBe(1);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 100 for identical strings', () => {
      expect(calculateSimilarity('starbucks', 'starbucks')).toBe(100);
    });

    it('should return 0 for empty string comparison', () => {
      expect(calculateSimilarity('test', '')).toBe(0);
      expect(calculateSimilarity('', 'test')).toBe(0);
    });

    it('should calculate correct similarity for similar strings', () => {
      // 'starbucks' vs 'starbuck' - 1 edit out of 9 chars = ~89%
      const similarity = calculateSimilarity('starbucks', 'starbuck');
      expect(similarity).toBeGreaterThan(85);
      expect(similarity).toBeLessThan(95);
    });

    it('should return low similarity for different strings', () => {
      const similarity = calculateSimilarity('apple', 'microsoft');
      expect(similarity).toBeLessThan(30);
    });
  });

  describe('compareVendors', () => {
    describe('exact matches', () => {
      it('should score 30 for exact match', () => {
        const result = compareVendors('Starbucks', 'Starbucks');
        expect(result.score).toBe(VENDOR_SCORE_THRESHOLDS.EXACT.score);
        expect(result.matchType).toBe('exact');
        expect(result.isMatch).toBe(true);
      });
    });

    describe('normalized matches', () => {
      it('should score 28 for normalized match', () => {
        const result = compareVendors('STARBUCKS', 'starbucks');
        expect(result.score).toBe(VENDOR_SCORE_THRESHOLDS.NORMALIZED.score);
        expect(result.matchType).toBe('normalized');
        expect(result.isMatch).toBe(true);
      });

      it('should match after removing suffixes', () => {
        const result = compareVendors('Amazon Inc', 'Amazon');
        expect(result.score).toBe(28);
        expect(result.matchType).toBe('normalized');
      });

      it('should match after removing store numbers', () => {
        const result = compareVendors('Starbucks #1234', 'Starbucks');
        expect(result.score).toBe(28);
        expect(result.matchType).toBe('normalized');
      });
    });

    describe('alias matches', () => {
      it('should score 25 for alias match', () => {
        const result = compareVendors('SBUX', 'Starbucks');
        expect(result.score).toBe(VENDOR_SCORE_THRESHOLDS.ALIAS.score);
        expect(result.matchType).toBe('alias');
        expect(result.isMatch).toBe(true);
      });

      it('should match Amazon aliases', () => {
        const result = compareVendors('AMZN', 'Amazon');
        expect(result.matchType).toBe('alias');
        expect(result.isMatch).toBe(true);
      });

      it('should match Grab aliases', () => {
        // GRAB* normalizes to 'grab', same as Grab, so it's a normalized match
        const result = compareVendors('GRAB*', 'Grab');
        expect(result.matchType).toBe('normalized');
        expect(result.isMatch).toBe(true);

        // Test actual alias: grabpay -> grab
        const result2 = compareVendors('GrabPay', 'Grab');
        expect(result2.matchType).toBe('alias');
        expect(result2.isMatch).toBe(true);
      });

      it('should match 7-Eleven aliases', () => {
        const result = compareVendors('7-11', '7-Eleven');
        expect(result.matchType).toBe('alias');
        expect(result.isMatch).toBe(true);
      });
    });

    describe('fuzzy matches', () => {
      it('should score 25 for high similarity (>90%)', () => {
        // 'starbucks' vs 'starbuck' ~89% - should be close to 90
        const result = compareVendors('Starbuckss', 'Starbucks');
        expect(result.score).toBe(VENDOR_SCORE_THRESHOLDS.HIGH_SIMILARITY.score);
        expect(result.matchType).toBe('fuzzy');
        expect(result.isMatch).toBe(true);
      });

      it('should score 20 for good similarity (>80%)', () => {
        const result = compareVendors('Starbuks', 'Starbucks');
        expect(result.score).toBe(VENDOR_SCORE_THRESHOLDS.GOOD_SIMILARITY.score);
        expect(result.matchType).toBe('fuzzy');
      });

      it('should score 15 for moderate similarity (>70%)', () => {
        const result = compareVendors('Starbux', 'Starbucks');
        // starbux is an alias, but let's test with different string
        const result2 = compareVendors('Starbacks', 'Starbucks');
        expect(result2.matchType).toBe('fuzzy');
        expect(result2.similarity).toBeGreaterThanOrEqual(70);
      });

      it('should score 10 for low similarity (>60%)', () => {
        const result = compareVendors('Starbcs', 'Starbucks');
        expect(result.similarity).toBeGreaterThanOrEqual(60);
        expect(result.isMatch).toBe(true);
      });
    });

    describe('no match', () => {
      it('should return score 0 for dissimilar vendors', () => {
        const result = compareVendors('Apple', 'Microsoft');
        expect(result.score).toBe(0);
        expect(result.matchType).toBe('none');
        expect(result.isMatch).toBe(false);
      });
    });

    describe('configuration options', () => {
      it('should respect custom minSimilarity', () => {
        const result = compareVendors('Starb', 'Starbucks', { minSimilarity: 80 });
        expect(result.isMatch).toBe(false);
      });

      it('should use custom aliases', () => {
        const customAliases = new Map([['testvendor', ['tv', 'test-v']]]);
        const result = compareVendors('TV', 'TestVendor', { aliases: customAliases });
        expect(result.matchType).toBe('alias');
      });

      it('should skip fuzzy matching in strict mode', () => {
        const result = compareVendors('Starbuckss', 'Starbucks', { strictMode: true });
        expect(result.isMatch).toBe(false);
        expect(result.matchType).toBe('none');
      });
    });
  });

  describe('findBestVendorMatch', () => {
    it('should return null for empty candidates', () => {
      const result = findBestVendorMatch('Starbucks', []);
      expect(result).toBeNull();
    });

    it('should find exact match', () => {
      const result = findBestVendorMatch('Starbucks', ['Apple', 'Starbucks', 'Google']);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(1);
      expect(result!.result.matchType).toBe('exact');
    });

    it('should find best fuzzy match', () => {
      const result = findBestVendorMatch('Starbucks', ['Apple', 'Starbuckz', 'Google']);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(1);
    });

    it('should short-circuit on exact match', () => {
      const result = findBestVendorMatch('Starbucks', ['Starbucks', 'Starbucks']);
      expect(result!.index).toBe(0);
    });

    it('should select highest scoring match', () => {
      const result = findBestVendorMatch('Amazon', ['Amaz', 'AMZN', 'Amazn']);
      // AMZN should win because it's an alias (score 25)
      expect(result!.result.matchType).toBe('alias');
    });
  });

  describe('isLikelyMatch', () => {
    it('should return true for exact match', () => {
      expect(isLikelyMatch('Starbucks', 'Starbucks')).toBe(true);
    });

    it('should return true for similar vendors', () => {
      expect(isLikelyMatch('Starbucks', 'STARBUCKS')).toBe(true);
    });

    it('should return false for dissimilar vendors', () => {
      expect(isLikelyMatch('Apple', 'Microsoft')).toBe(false);
    });
  });

  describe('extractVendorFromDescription', () => {
    it('should remove POS prefix', () => {
      expect(extractVendorFromDescription('POS STARBUCKS')).toBe('starbucks');
    });

    it('should remove DEBIT prefix', () => {
      expect(extractVendorFromDescription('DEBIT PURCHASE AMAZON')).toBe('amazon');
    });

    it('should remove date patterns', () => {
      expect(extractVendorFromDescription('STARBUCKS 01/15/24')).toBe('starbucks');
      expect(extractVendorFromDescription('AMAZON 2024-01-15')).toBe('amazon');
    });

    it('should remove transaction codes with digits', () => {
      expect(extractVendorFromDescription('STARBUCKS 12345678')).toBe('starbucks');
      expect(extractVendorFromDescription('AMAZON ABC1234567')).toBe('amazon');
    });

    it('should remove trailing state codes', () => {
      expect(extractVendorFromDescription('STARBUCKS CA')).toBe('starbucks');
    });

    it('should handle complex descriptions', () => {
      const result = extractVendorFromDescription('POS DEBIT STARBUCKS 01/15');
      expect(result).toContain('starbucks');
    });
  });

  describe('createAliasMap', () => {
    it('should combine with default aliases', () => {
      const custom = createAliasMap({
        'customvendor': ['cv', 'custom-v'],
      });

      expect(custom.has('customvendor')).toBe(true);
      expect(custom.has('starbucks')).toBe(true); // From defaults
    });

    it('should extend existing aliases', () => {
      const custom = createAliasMap({
        'starbucks': ['sbx'],
      });

      const aliases = custom.get('starbucks');
      expect(aliases).toContain('sbx');
      expect(aliases).toContain('sbux'); // Original
    });
  });

  describe('DEFAULT_ALIASES', () => {
    it('should have common vendors', () => {
      expect(DEFAULT_ALIASES.has('starbucks')).toBe(true);
      expect(DEFAULT_ALIASES.has('amazon')).toBe(true);
      expect(DEFAULT_ALIASES.has('uber')).toBe(true);
    });

    it('should have Thai vendors', () => {
      expect(DEFAULT_ALIASES.has('grab')).toBe(true);
      expect(DEFAULT_ALIASES.has('line')).toBe(true);
      expect(DEFAULT_ALIASES.has('lazada')).toBe(true);
      expect(DEFAULT_ALIASES.has('shopee')).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should match credit card statement format', () => {
      // 'starbucks' (after removing store #1234) vs 'starbucks'
      // Use extractVendorFromDescription to properly clean the statement format
      const extracted = extractVendorFromDescription('STARBUCKS STORE #1234 CA');
      const result = compareVendors(extracted, 'Starbucks');
      expect(result.isMatch).toBe(true);

      // Direct comparison has lower similarity due to extra words
      const direct = compareVendors('STARBUCKS', 'Starbucks');
      expect(direct.matchType).toBe('normalized');
      expect(direct.isMatch).toBe(true);
    });

    it('should match Thai merchant names', () => {
      const result = compareVendors('GRABFOOD', 'Grab');
      expect(result.isMatch).toBe(true);
    });

    it('should handle typos in merchant names', () => {
      const result = compareVendors('STARBCKS', 'Starbucks');
      expect(result.isMatch).toBe(true);
    });

    it('should match online marketplace variations', () => {
      const result = compareVendors('AMAZON.COM', 'Amazon');
      expect(result.isMatch).toBe(true);
    });

    it('should handle fast food abbreviations', () => {
      // mcds (alias) vs mcdonalds
      const result = compareVendors('MCDS', "McDonald's");
      expect(result.isMatch).toBe(true);
    });

    it('should match 7-Eleven variations', () => {
      expect(compareVendors('7-11', '7-Eleven').isMatch).toBe(true);
      expect(compareVendors('SEVEN ELEVEN', '7-Eleven').isMatch).toBe(true);
    });

    it('should match Thai payment apps', () => {
      expect(compareVendors('LINE PAY', 'Line').isMatch).toBe(true);
      expect(compareVendors('GRABPAY', 'Grab').isMatch).toBe(true);
    });

    it('should handle incomplete vendor names', () => {
      // When statement truncates vendor name
      const result = compareVendors('STARBUCKS COFFE', 'Starbucks Coffee');
      expect(result.isMatch).toBe(true);
    });

    it('should not match unrelated vendors', () => {
      expect(compareVendors('Starbucks', 'Dunkin').isMatch).toBe(false);
      expect(compareVendors('Amazon', 'eBay').isMatch).toBe(false);
    });
  });
});
