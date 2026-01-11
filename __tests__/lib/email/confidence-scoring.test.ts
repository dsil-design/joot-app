/**
 * Tests for Email Transaction Extraction Confidence Scoring
 *
 * Tests the confidence scoring module that calculates extraction
 * confidence based on field completeness and pattern match quality.
 */

import {
  calculateConfidenceScore,
  determineStatusFromConfidence,
  getConfidenceLevel,
  isHighConfidence,
  isLowConfidence,
  formatScoreAsNotes,
  getConfidenceSummary,
  CONFIDENCE_THRESHOLDS,
  SCORE_WEIGHTS,
} from '@/lib/email/confidence-scoring';
import type { ExtractedTransaction } from '@/lib/email/types';
import { EMAIL_TRANSACTION_STATUS } from '@/lib/types/email-imports';

describe('Confidence Scoring', () => {
  describe('SCORE_WEIGHTS', () => {
    it('should have correct point values per spec', () => {
      expect(SCORE_WEIGHTS.REQUIRED_FIELDS).toBe(40);
      expect(SCORE_WEIGHTS.AMOUNT).toBe(20);
      expect(SCORE_WEIGHTS.DATE).toBe(20);
      expect(SCORE_WEIGHTS.VENDOR).toBe(10);
      expect(SCORE_WEIGHTS.ORDER_ID).toBe(10);
    });

    it('should sum to 100 total points', () => {
      const total =
        SCORE_WEIGHTS.REQUIRED_FIELDS +
        SCORE_WEIGHTS.AMOUNT +
        SCORE_WEIGHTS.DATE +
        SCORE_WEIGHTS.VENDOR +
        SCORE_WEIGHTS.ORDER_ID;
      expect(total).toBe(100);
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('should have correct threshold values per spec', () => {
      expect(CONFIDENCE_THRESHOLDS.LOW).toBe(55);
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(90);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return 0 for undefined data', () => {
      const result = calculateConfidenceScore(undefined);
      expect(result.totalScore).toBe(0);
      expect(result.level).toBe('low');
      expect(result.components).toHaveLength(5);
      expect(result.components.every(c => !c.satisfied)).toBe(true);
    });

    it('should return full score (100) when all fields are present', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'GrabFood',
        amount: 250.5,
        currency: 'THB',
        transaction_date: new Date('2025-01-11'),
        description: 'Lunch: Restaurant',
        order_id: 'A-123456789012',
        vendor_id: '6b451d8c-b8db-4475-b19b-6c3cf38b93d0',
      };

      const result = calculateConfidenceScore(data);

      expect(result.totalScore).toBe(100);
      expect(result.level).toBe('high');
      expect(result.components).toHaveLength(5);
      expect(result.components.every(c => c.satisfied)).toBe(true);
    });

    it('should score 40 for required fields when all present', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Bolt',
        amount: 150,
        currency: 'THB',
        transaction_date: new Date(),
      };

      const result = calculateConfidenceScore(data);
      const requiredFields = result.components.find(c => c.name === 'Required Fields');

      expect(requiredFields?.satisfied).toBe(true);
      expect(requiredFields?.earnedPoints).toBe(40);
    });

    it('should score 0 for required fields when any is missing', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Bolt',
        amount: 150,
        currency: 'THB',
        transaction_date: undefined as unknown as Date, // Missing date
      };

      const result = calculateConfidenceScore(data);
      const requiredFields = result.components.find(c => c.name === 'Required Fields');

      expect(requiredFields?.satisfied).toBe(false);
      expect(requiredFields?.earnedPoints).toBe(0);
    });

    it('should score 20 for valid positive amount', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Test',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date(),
      };

      const result = calculateConfidenceScore(data);
      const amount = result.components.find(c => c.name === 'Amount');

      expect(amount?.satisfied).toBe(true);
      expect(amount?.earnedPoints).toBe(20);
    });

    it('should score 0 for zero or negative amount', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Test',
        amount: 0,
        currency: 'THB',
        transaction_date: new Date(),
      };

      const result = calculateConfidenceScore(data);
      const amount = result.components.find(c => c.name === 'Amount');

      expect(amount?.satisfied).toBe(false);
      expect(amount?.earnedPoints).toBe(0);
    });

    it('should score 20 for valid date', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Test',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date('2025-01-11'),
      };

      const result = calculateConfidenceScore(data);
      const date = result.components.find(c => c.name === 'Date');

      expect(date?.satisfied).toBe(true);
      expect(date?.earnedPoints).toBe(20);
    });

    it('should score 0 for invalid date', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Test',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date('invalid'),
      };

      const result = calculateConfidenceScore(data);
      const date = result.components.find(c => c.name === 'Date');

      expect(date?.satisfied).toBe(false);
      expect(date?.earnedPoints).toBe(0);
    });

    it('should score 10 for vendor when present', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'GrabFood',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date(),
      };

      const result = calculateConfidenceScore(data);
      const vendor = result.components.find(c => c.name === 'Vendor');

      expect(vendor?.satisfied).toBe(true);
      expect(vendor?.earnedPoints).toBe(10);
    });

    it('should score 10 for order ID when present', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'GrabFood',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date(),
        order_id: 'A-123456789012',
      };

      const result = calculateConfidenceScore(data);
      const orderId = result.components.find(c => c.name === 'Order ID');

      expect(orderId?.satisfied).toBe(true);
      expect(orderId?.earnedPoints).toBe(10);
    });

    it('should score 0 for order ID when missing', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'GrabFood',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date(),
      };

      const result = calculateConfidenceScore(data);
      const orderId = result.components.find(c => c.name === 'Order ID');

      expect(orderId?.satisfied).toBe(false);
      expect(orderId?.earnedPoints).toBe(0);
    });

    it('should calculate 90 (high confidence) without order ID', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Bangkok Bank',
        amount: 500,
        currency: 'THB',
        transaction_date: new Date(),
        // No order_id
      };

      const result = calculateConfidenceScore(data);

      // 40 (required) + 20 (amount) + 20 (date) + 10 (vendor) = 90
      expect(result.totalScore).toBe(90);
      expect(result.level).toBe('high');
    });

    it('should include notes about matched vendor in database', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'GrabFood',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date(),
        vendor_id: '6b451d8c-b8db-4475-b19b-6c3cf38b93d0',
      };

      const result = calculateConfidenceScore(data);
      const vendor = result.components.find(c => c.name === 'Vendor');

      expect(vendor?.notes).toContain('matched to database');
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return "low" for scores below 55', () => {
      expect(getConfidenceLevel(0)).toBe('low');
      expect(getConfidenceLevel(30)).toBe('low');
      expect(getConfidenceLevel(54)).toBe('low');
    });

    it('should return "medium" for scores 55-89', () => {
      expect(getConfidenceLevel(55)).toBe('medium');
      expect(getConfidenceLevel(70)).toBe('medium');
      expect(getConfidenceLevel(89)).toBe('medium');
    });

    it('should return "high" for scores 90 and above', () => {
      expect(getConfidenceLevel(90)).toBe('high');
      expect(getConfidenceLevel(95)).toBe('high');
      expect(getConfidenceLevel(100)).toBe('high');
    });
  });

  describe('isHighConfidence', () => {
    it('should return true for scores >= 90', () => {
      expect(isHighConfidence(90)).toBe(true);
      expect(isHighConfidence(100)).toBe(true);
    });

    it('should return false for scores < 90', () => {
      expect(isHighConfidence(89)).toBe(false);
      expect(isHighConfidence(55)).toBe(false);
      expect(isHighConfidence(0)).toBe(false);
    });
  });

  describe('isLowConfidence', () => {
    it('should return true for scores < 55', () => {
      expect(isLowConfidence(0)).toBe(true);
      expect(isLowConfidence(54)).toBe(true);
    });

    it('should return false for scores >= 55', () => {
      expect(isLowConfidence(55)).toBe(false);
      expect(isLowConfidence(90)).toBe(false);
      expect(isLowConfidence(100)).toBe(false);
    });
  });

  describe('determineStatusFromConfidence', () => {
    it('should return pending_review for low confidence regardless of classification', () => {
      const status = determineStatusFromConfidence(
        40,
        EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT
      );
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.PENDING_REVIEW);
    });

    it('should use classification status for medium confidence', () => {
      const status = determineStatusFromConfidence(
        70,
        EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT
      );
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT);
    });

    it('should use classification status for high confidence', () => {
      const status = determineStatusFromConfidence(
        95,
        EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT
      );
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });

    it('should preserve pending_review status at any confidence level', () => {
      // Even with high confidence, if classification says pending_review, keep it
      const status = determineStatusFromConfidence(
        95,
        EMAIL_TRANSACTION_STATUS.PENDING_REVIEW
      );
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.PENDING_REVIEW);
    });

    it('should override to pending_review at exactly threshold boundary', () => {
      // Score of 54 (just below 55) should be pending_review
      const status = determineStatusFromConfidence(
        54,
        EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT
      );
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.PENDING_REVIEW);
    });

    it('should use classification status at exactly threshold', () => {
      // Score of 55 (exactly at threshold) should use classification
      const status = determineStatusFromConfidence(
        55,
        EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT
      );
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });
  });

  describe('formatScoreAsNotes', () => {
    it('should include summary line', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Test',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date(),
      };

      const breakdown = calculateConfidenceScore(data);
      const notes = formatScoreAsNotes(breakdown);

      expect(notes).toContain('confidence');
      expect(notes).toContain('/100');
    });

    it('should include component breakdown with checkmarks', () => {
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Test',
        amount: 100,
        currency: 'THB',
        transaction_date: new Date(),
        order_id: 'ABC123',
      };

      const breakdown = calculateConfidenceScore(data);
      const notes = formatScoreAsNotes(breakdown);

      expect(notes).toContain('✓');
      expect(notes).toContain('Required Fields');
      expect(notes).toContain('Amount');
      expect(notes).toContain('Date');
      expect(notes).toContain('Vendor');
      expect(notes).toContain('Order ID');
    });

    it('should include X marks for missing components', () => {
      const breakdown = calculateConfidenceScore(undefined);
      const notes = formatScoreAsNotes(breakdown);

      expect(notes).toContain('✗');
    });
  });

  describe('getConfidenceSummary', () => {
    it('should return green for high confidence', () => {
      const summary = getConfidenceSummary(95);
      expect(summary.level).toBe('high');
      expect(summary.label).toBe('High Confidence');
      expect(summary.color).toBe('green');
    });

    it('should return yellow for medium confidence', () => {
      const summary = getConfidenceSummary(70);
      expect(summary.level).toBe('medium');
      expect(summary.label).toBe('Medium Confidence');
      expect(summary.color).toBe('yellow');
    });

    it('should return red for low confidence', () => {
      const summary = getConfidenceSummary(30);
      expect(summary.level).toBe('low');
      expect(summary.label).toBe('Needs Review');
      expect(summary.color).toBe('red');
    });
  });

  describe('Real-world scoring scenarios', () => {
    it('should score Grab receipt with all fields correctly', () => {
      // Simulating a typical Grab extraction result
      const data: ExtractedTransaction = {
        vendor_name_raw: 'GrabFood',
        amount: 350.0,
        currency: 'THB',
        transaction_date: new Date('2025-01-10T19:30:00'),
        description: 'Dinner: McDonald\'s',
        order_id: 'A-123456789012',
        vendor_id: '6b451d8c-b8db-4475-b19b-6c3cf38b93d0',
      };

      const result = calculateConfidenceScore(data);

      // Full score: 40 + 20 + 20 + 10 + 10 = 100
      expect(result.totalScore).toBe(100);
      expect(result.level).toBe('high');
    });

    it('should score bank transfer without order ID correctly', () => {
      // Bank transfers often don't have order IDs
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Bangkok Bank Transfer',
        amount: 1500.0,
        currency: 'THB',
        transaction_date: new Date('2025-01-10'),
        description: 'Transfer to Savings',
        // No order_id
      };

      const result = calculateConfidenceScore(data);

      // Score: 40 + 20 + 20 + 10 + 0 = 90
      expect(result.totalScore).toBe(90);
      expect(result.level).toBe('high');
    });

    it('should score failed extraction with low confidence', () => {
      // Simulating a partial extraction with missing amount
      const data: ExtractedTransaction = {
        vendor_name_raw: 'Unknown Vendor',
        amount: 0, // Invalid amount
        currency: 'THB',
        transaction_date: new Date('2025-01-10'),
      };

      const result = calculateConfidenceScore(data);

      // Score: 0 (required incomplete) + 0 (amount invalid) + 20 (date) + 10 (vendor) = 30
      // Required fields check fails because amount is 0 (falsy in the check)
      expect(result.totalScore).toBeLessThan(55);
      expect(result.level).toBe('low');
    });
  });
});
