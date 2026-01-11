/**
 * Tests for email classification logic
 */

import {
  classifyEmail,
  classifyEmailWithContext,
  detectPaymentContext,
  getStatusFromRules,
  getClassificationRules,
  resetClassificationRules,
  setRuleEnabled,
  addClassificationRule,
  removeClassificationRule,
  type ClassificationContext,
  type PaymentContext,
} from '@/lib/email/classifier';
import { EMAIL_TRANSACTION_STATUS, EMAIL_CLASSIFICATION } from '@/lib/types/email-imports';
import type { RawEmailData } from '@/lib/email/types';

describe('Email Classifier', () => {
  // Reset rules before each test
  beforeEach(() => {
    resetClassificationRules();
  });

  describe('classifyEmail', () => {
    it('should classify Grab emails as receipts', () => {
      const email: RawEmailData = {
        message_id: 'test-1',
        uid: 1,
        folder: 'INBOX',
        subject: 'Your Grab E-Receipt',
        from_address: 'no-reply@grab.com',
        from_name: 'Grab',
        email_date: new Date(),
        text_body: 'Thank you for your order',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const result = classifyEmail(email);
      expect(result.parserKey).toBe('grab');
      expect(result.classification).toBe(EMAIL_CLASSIFICATION.RECEIPT);
      expect(result.confidence).toBe(90);
    });

    it('should classify Bolt emails as receipts', () => {
      const email: RawEmailData = {
        message_id: 'test-2',
        uid: 2,
        folder: 'INBOX',
        subject: 'Your Bolt ride receipt',
        from_address: 'no-reply@bolt.eu',
        from_name: 'Bolt',
        email_date: new Date(),
        text_body: 'Your ride details',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const result = classifyEmail(email);
      expect(result.parserKey).toBe('bolt');
      expect(result.classification).toBe(EMAIL_CLASSIFICATION.RECEIPT);
    });

    it('should classify Bangkok Bank emails as bank transfers', () => {
      const email: RawEmailData = {
        message_id: 'test-3',
        uid: 3,
        folder: 'INBOX',
        subject: 'Transfer Notification',
        from_address: 'bualuang@bangkokbank.com',
        from_name: 'Bangkok Bank',
        email_date: new Date(),
        text_body: 'Your transfer was successful',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const result = classifyEmail(email);
      expect(result.parserKey).toBe('bangkok-bank');
      expect(result.classification).toBe(EMAIL_CLASSIFICATION.BANK_TRANSFER);
      expect(result.status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });

    it('should classify unknown emails with heuristics', () => {
      const email: RawEmailData = {
        message_id: 'test-4',
        uid: 4,
        folder: 'INBOX',
        subject: 'Your receipt from Unknown Store',
        from_address: 'noreply@unknown.com',
        from_name: 'Unknown',
        email_date: new Date(),
        text_body: 'Thank you for your purchase',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const result = classifyEmail(email);
      expect(result.parserKey).toBeNull();
      expect(result.classification).toBe(EMAIL_CLASSIFICATION.RECEIPT);
      expect(result.status).toBe(EMAIL_TRANSACTION_STATUS.PENDING_REVIEW);
    });
  });

  describe('detectPaymentContext', () => {
    it('should detect GrabPay Wallet as e-wallet', () => {
      const email: RawEmailData = {
        message_id: 'test-1',
        uid: 1,
        folder: 'INBOX',
        subject: 'Your Grab E-Receipt',
        from_address: 'no-reply@grab.com',
        from_name: 'Grab',
        email_date: new Date(),
        text_body: 'Paid with GrabPay Wallet',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const context = detectPaymentContext('grab', email);
      expect(context).toBe('e_wallet');
    });

    it('should detect credit card payment', () => {
      const email: RawEmailData = {
        message_id: 'test-2',
        uid: 2,
        folder: 'INBOX',
        subject: 'Your Grab E-Receipt',
        from_address: 'no-reply@grab.com',
        from_name: 'Grab',
        email_date: new Date(),
        text_body: 'Paid with Visa ****1234',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const context = detectPaymentContext('grab', email);
      expect(context).toBe('credit_card');
    });

    it('should return default context when no pattern matches', () => {
      const email: RawEmailData = {
        message_id: 'test-3',
        uid: 3,
        folder: 'INBOX',
        subject: 'Your Grab E-Receipt',
        from_address: 'no-reply@grab.com',
        from_name: 'Grab',
        email_date: new Date(),
        text_body: 'Thank you for your order',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const context = detectPaymentContext('grab', email);
      expect(context).toBe('credit_card'); // Default for Grab
    });
  });

  describe('getStatusFromRules', () => {
    it('should return waiting_for_statement for Grab THB CC payments', () => {
      const context: ClassificationContext = {
        parserKey: 'grab',
        classification: EMAIL_CLASSIFICATION.RECEIPT,
        paymentContext: 'credit_card',
        currency: 'THB',
      };

      const status = getStatusFromRules(context);
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT);
    });

    it('should return ready_to_import for Grab e-wallet payments', () => {
      const context: ClassificationContext = {
        parserKey: 'grab',
        classification: EMAIL_CLASSIFICATION.RECEIPT,
        paymentContext: 'e_wallet',
        currency: 'THB',
      };

      const status = getStatusFromRules(context);
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });

    it('should return ready_to_import for bank transfers', () => {
      const context: ClassificationContext = {
        parserKey: 'bangkok-bank',
        classification: EMAIL_CLASSIFICATION.BANK_TRANSFER,
        paymentContext: 'bank_transfer',
        currency: 'THB',
      };

      const status = getStatusFromRules(context);
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });

    it('should return ready_to_import for USD receipts', () => {
      const context: ClassificationContext = {
        parserKey: 'grab',
        classification: EMAIL_CLASSIFICATION.RECEIPT,
        paymentContext: 'credit_card',
        currency: 'USD',
      };

      const status = getStatusFromRules(context);
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });

    it('should return pending_review for order confirmations', () => {
      const context: ClassificationContext = {
        parserKey: 'lazada',
        classification: EMAIL_CLASSIFICATION.ORDER_CONFIRMATION,
        paymentContext: 'credit_card',
        currency: 'THB',
      };

      const status = getStatusFromRules(context);
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.PENDING_REVIEW);
    });
  });

  describe('classifyEmailWithContext', () => {
    it('should include payment context in result', () => {
      const email: RawEmailData = {
        message_id: 'test-1',
        uid: 1,
        folder: 'INBOX',
        subject: 'Your Grab E-Receipt',
        from_address: 'no-reply@grab.com',
        from_name: 'Grab',
        email_date: new Date(),
        text_body: 'Paid with GrabPay Wallet',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const result = classifyEmailWithContext(email, { currency: 'THB' });
      expect(result.paymentContext).toBe('e_wallet');
      expect(result.status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
      expect(result.matchedRule).toBeDefined();
      expect(result.matchedRule?.id).toBe('e_wallet_ready');
    });

    it('should use currency from extraction data', () => {
      const email: RawEmailData = {
        message_id: 'test-2',
        uid: 2,
        folder: 'INBOX',
        subject: 'Your Grab E-Receipt',
        from_address: 'no-reply@grab.com',
        from_name: 'Grab',
        email_date: new Date(),
        text_body: 'Paid with Visa ****1234',
        html_body: null,
        seen: false,
        has_attachments: false,
      };

      const result = classifyEmailWithContext(email, { currency: 'USD' });
      expect(result.currency).toBe('USD');
      expect(result.status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
      expect(result.matchedRule?.id).toBe('usd_ready');
    });
  });

  describe('Rule Management', () => {
    it('should allow disabling rules', () => {
      // Disable the e-wallet rule
      setRuleEnabled('e_wallet_ready', false);

      const context: ClassificationContext = {
        parserKey: 'grab',
        classification: EMAIL_CLASSIFICATION.RECEIPT,
        paymentContext: 'e_wallet',
        currency: 'THB',
      };

      // Should now fall through to waiting_for_statement (CC rule includes 'unknown')
      const status = getStatusFromRules(context);
      // With e_wallet_ready disabled, it will fall through to fallback
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.PENDING_REVIEW);
    });

    it('should allow adding custom rules', () => {
      addClassificationRule({
        id: 'custom_test',
        description: 'Test rule',
        parserKeys: ['test-parser'],
        classifications: [EMAIL_CLASSIFICATION.RECEIPT],
        paymentContexts: null,
        currencies: null,
        status: EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT,
        priority: 5, // Higher priority than e_wallet_ready
        enabled: true,
      });

      const context: ClassificationContext = {
        parserKey: 'test-parser',
        classification: EMAIL_CLASSIFICATION.RECEIPT,
        paymentContext: 'unknown',
        currency: null,
      };

      const status = getStatusFromRules(context);
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });

    it('should allow removing rules', () => {
      const initialCount = getClassificationRules().length;

      const removed = removeClassificationRule('fallback_review');
      expect(removed).toBe(true);

      const newCount = getClassificationRules().length;
      expect(newCount).toBe(initialCount - 1);
    });

    it('should reset to default rules', () => {
      // Modify rules
      setRuleEnabled('e_wallet_ready', false);
      addClassificationRule({
        id: 'temp_rule',
        description: 'Temporary',
        parserKeys: null,
        classifications: null,
        paymentContexts: null,
        currencies: null,
        status: EMAIL_TRANSACTION_STATUS.SKIPPED,
        priority: 1,
        enabled: true,
      });

      // Reset
      resetClassificationRules();

      // Verify default behavior
      const context: ClassificationContext = {
        parserKey: 'grab',
        classification: EMAIL_CLASSIFICATION.RECEIPT,
        paymentContext: 'e_wallet',
        currency: 'THB',
      };

      const status = getStatusFromRules(context);
      expect(status).toBe(EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT);
    });
  });
});
