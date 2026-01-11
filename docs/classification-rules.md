# Email Classification Rules

This document describes the email classification system used to determine the initial status for imported email transactions.

## Overview

When emails are synced from iCloud, the system extracts transaction data and assigns an initial status that determines how the email should be processed:

- **`waiting_for_statement`**: THB receipts paid via credit card that need to be matched with USD credit card charges
- **`ready_to_import`**: Transactions that can be directly imported without additional matching
- **`pending_review`**: Transactions that need manual review before import

The classification system uses a rule-based approach that considers:
1. **Parser type** - Which email parser matched (Grab, Bolt, Bangkok Bank, etc.)
2. **Classification type** - Receipt, bank transfer, order confirmation, etc.
3. **Payment context** - E-wallet (GrabPay, Bolt Balance) vs credit card
4. **Currency** - THB vs USD

## Default Classification Rules

Rules are evaluated in priority order (lower number = higher priority). The first matching rule determines the status.

| Priority | Rule ID | Description | Status |
|----------|---------|-------------|--------|
| 10 | `e_wallet_ready` | E-wallet payments (GrabPay, Bolt Balance) | `ready_to_import` |
| 20 | `grab_bolt_cc_thb` | Grab/Bolt THB receipts (credit card) | `waiting_for_statement` |
| 25 | `usd_ready` | USD receipts from any parser | `ready_to_import` |
| 30 | `bank_transfer_ready` | Bangkok Bank/Kasikorn transfers | `ready_to_import` |
| 35 | `bill_payment_ready` | Bill payments | `ready_to_import` |
| 40 | `order_confirmation_review` | Lazada order confirmations | `pending_review` |
| 100 | `unknown_default` | Unknown classification | `pending_review` |
| 999 | `fallback_review` | Fallback for unmatched | `pending_review` |

## Classification Logic

### Grab/Bolt Receipts (THB)

Most Grab and Bolt transactions in Thailand are:
- **Paid in THB** (local currency)
- **Charged to a USD credit card** (for international users)

This creates a currency conversion scenario where:
1. The email receipt shows THB amount (e.g., ฿150 for a GrabFood order)
2. The credit card statement shows USD amount (e.g., $4.50)

**Default behavior**: THB receipts from Grab/Bolt are marked as `waiting_for_statement` to allow matching with the corresponding USD credit card charge.

**Exception**: If GrabPay Wallet or Bolt Balance was used (detected by patterns like "GrabPay Wallet", "Paid with GrabPay"), the transaction is marked as `ready_to_import` since no credit card matching is needed.

### Bank Transfers

Bangkok Bank (Bualuang) and Kasikorn Bank (K PLUS) transfers are:
- **Direct THB transactions**
- **Not charged to credit card**

These are marked as `ready_to_import` since they represent the final transaction amount.

### Order Confirmations

Lazada and similar e-commerce order confirmations are marked as `pending_review` because:
- Amounts may change (discounts, partial cancellation)
- Final charge may differ from initial order total
- Multiple items may be shipped separately

## Payment Context Detection

The system detects payment context by analyzing email content for specific patterns:

### E-Wallet Patterns (→ ready_to_import)
```
GrabPay Wallet
Paid with GrabPay
GrabPay Balance
Wallet Balance
Grab Credits
Bolt Balance
Bolt Credits
```

### Credit Card Patterns (→ waiting_for_statement for THB)
```
Visa ****1234
Mastercard ****5678
Credit Card
Card ending in 1234
****1234
```

## Programmatic Rule Management

Classification rules can be modified at runtime using the following functions:

```typescript
import {
  getClassificationRules,
  setClassificationRules,
  addClassificationRule,
  removeClassificationRule,
  setRuleEnabled,
  resetClassificationRules,
} from '@/lib/email';

// Get current rules
const rules = getClassificationRules();

// Add a custom rule
addClassificationRule({
  id: 'custom_rule',
  description: 'Custom rule for specific vendor',
  parserKeys: ['custom-parser'],
  classifications: ['receipt'],
  paymentContexts: null,
  currencies: null,
  status: 'ready_to_import',
  priority: 15,
  enabled: true,
});

// Disable a rule
setRuleEnabled('grab_bolt_cc_thb', false);

// Reset to defaults
resetClassificationRules();
```

## Classification Rule Interface

```typescript
interface ClassificationRule {
  /** Rule identifier for debugging */
  id: string;

  /** Human-readable description */
  description: string;

  /** Parser keys this rule applies to (null = all parsers) */
  parserKeys: string[] | null;

  /** Classification types this rule applies to (null = all) */
  classifications: EmailClassification[] | null;

  /** Payment contexts this rule applies to (null = all) */
  paymentContexts: PaymentContext[] | null;

  /** Currency codes this rule applies to (null = all) */
  currencies: string[] | null;

  /** Resulting status when rule matches */
  status: EmailTransactionStatus;

  /** Priority (lower = evaluated first) */
  priority: number;

  /** Whether this rule is active */
  enabled: boolean;
}
```

## Types

### Payment Context
```typescript
type PaymentContext = 'credit_card' | 'e_wallet' | 'bank_transfer' | 'unknown';
```

### Email Classification
```typescript
type EmailClassification =
  | 'receipt'
  | 'order_confirmation'
  | 'bank_transfer'
  | 'bill_payment'
  | 'unknown';
```

### Email Transaction Status
```typescript
type EmailTransactionStatus =
  | 'pending_review'
  | 'matched'
  | 'waiting_for_statement'
  | 'ready_to_import'
  | 'imported'
  | 'skipped';
```

## Debugging Classification

When an email is classified, the extraction notes include:
- The matched rule ID and description
- The detected payment context

Example extraction notes:
```
Confidence: 85/100 (High) | Scoring: ✓ Required: 40/40, ✓ Amount: 20/20, ✓ Date: 20/20, ✗ Vendor: 0/10, ✓ OrderID: 10/10 | Classified by rule: grab_bolt_cc_thb (Grab/Bolt THB receipts (credit card) wait for USD statement) | Payment context: credit_card
```

## Adding Support for New Email Sources

To add a new email source:

1. **Create a parser** in `src/lib/email/extractors/`
2. **Add parser pattern** to `PARSER_PATTERNS` in `classifier.ts`
3. **Add classification rule(s)** to `DEFAULT_CLASSIFICATION_RULES`
4. **Register parser** in `extraction-service.ts`

See existing parsers (Grab, Bolt, Bangkok Bank) for implementation examples.
