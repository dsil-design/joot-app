# Matching Algorithm Specification: Document to Transaction

**Project:** Joot Document Management System
**Component:** Automatic Document-Transaction Matching
**Version:** 1.0
**Date:** October 29, 2025

---

## Overview

The matching algorithm automatically links uploaded documents (receipts, emails, statements) to existing transactions in the user's account. It uses a confidence-based scoring system that combines amount matching, date proximity, and vendor name similarity.

---

## Algorithm Objectives

1. **Maximize True Positives:** Match as many correct document-transaction pairs as possible
2. **Minimize False Positives:** Avoid incorrectly linking documents to wrong transactions
3. **Transparent Scoring:** Provide clear explanation of why a match was suggested
4. **User-Configurable:** Allow users to adjust matching sensitivity
5. **Performance:** Match documents in <2 seconds for users with 1000+ transactions

---

## Matching Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Document Extraction Complete                            │
│     (amount, date, vendor extracted)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  2. Query Candidate Transactions                            │
│     • Date range: ±7 days from document date               │
│     • Same user_id                                          │
│     • Amount within ±10% tolerance                          │
│     • Limit 50 candidates (sorted by date proximity)       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  3. Calculate Confidence Score for Each Candidate           │
│     • Amount Match Score (40% weight)                       │
│     • Date Match Score (30% weight)                         │
│     • Vendor Match Score (30% weight)                       │
│     • Combined confidence = weighted sum                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  4. Rank Matches by Confidence                              │
│     • Sort descending                                       │
│     • Return top 5 matches                                  │
│     • Store in document_matches table                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  5. Auto-Approve Decision                                   │
│     • IF highest confidence ≥ user threshold (default 95%)  │
│     • AND exactly 1 match above threshold                   │
│     • THEN auto-approve                                     │
│     • ELSE send to review queue                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Confidence Scoring Formula

### Overall Confidence Score

```
Confidence = (Amount_Score × 0.40) + (Date_Score × 0.30) + (Vendor_Score × 0.30)
```

**Range:** 0.00 to 100.00

**Thresholds:**
- **High Confidence:** ≥95% - Auto-approve eligible
- **Medium Confidence:** 80-95% - Suggest for review
- **Low Confidence:** <80% - Show but deprioritize

---

## Component 1: Amount Match Score (40% weight)

### Formula

```typescript
function calculateAmountScore(
  docAmount: number,
  txnAmount: number,
  tolerance: number = 1.0  // default 1%
): number {
  const diff = Math.abs(docAmount - txnAmount);
  const percentDiff = (diff / txnAmount) * 100;

  if (percentDiff === 0) {
    return 100;  // Exact match
  } else if (percentDiff <= tolerance) {
    // Linear decay within tolerance
    return 100 - (percentDiff / tolerance) * 20;  // 100 to 80
  } else if (percentDiff <= tolerance * 3) {
    // Steep decay beyond tolerance
    return 80 - ((percentDiff - tolerance) / (tolerance * 2)) * 60;  // 80 to 20
  } else {
    return 0;  // Too far off
  }
}
```

### Examples

| Document | Transaction | Tolerance | % Diff | Score | Explanation |
|----------|-------------|-----------|--------|-------|-------------|
| ฿234.50 | ฿234.50 | 1% | 0% | 100 | Exact match |
| ฿234.50 | ฿235.00 | 1% | 0.21% | 96 | Within tolerance |
| ฿234.50 | ฿237.00 | 1% | 1.06% | 79 | Just beyond tolerance |
| ฿234.50 | ฿245.00 | 1% | 4.48% | 23 | Significantly different |
| ฿234.50 | ฿300.00 | 1% | 27.92% | 0 | No match |

### Currency Handling

- Convert all amounts to USD equivalent using exchange rate on document date
- This allows matching THB receipt to USD transaction if same underlying amount
- Example: ฿1,000 matches $30.00 if rate is 33.33 THB/USD

---

## Component 2: Date Match Score (30% weight)

### Formula

```typescript
function calculateDateScore(
  docDate: Date,
  txnDate: Date,
  toleranceDays: number = 3
): number {
  const daysDiff = Math.abs(
    (docDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff === 0) {
    return 100;  // Same day
  } else if (daysDiff <= toleranceDays) {
    // Linear decay within tolerance
    return 100 - (daysDiff / toleranceDays) * 20;  // 100 to 80
  } else if (daysDiff <= toleranceDays * 2) {
    // Steep decay beyond tolerance
    return 80 - ((daysDiff - toleranceDays) / toleranceDays) * 60;  // 80 to 20
  } else {
    return 0;  // Too far off
  }
}
```

### Examples

| Document Date | Transaction Date | Tolerance | Days Diff | Score | Explanation |
|---------------|------------------|-----------|-----------|-------|-------------|
| 2025-10-15 | 2025-10-15 | 3 days | 0 | 100 | Same day |
| 2025-10-15 | 2025-10-16 | 3 days | 1 | 93 | Next day |
| 2025-10-15 | 2025-10-18 | 3 days | 3 | 80 | Within tolerance |
| 2025-10-15 | 2025-10-20 | 3 days | 5 | 40 | Beyond tolerance |
| 2025-10-15 | 2025-10-25 | 3 days | 10 | 0 | Too far |

### Date Tolerance Rationale

**Default 3 days:** Accounts for:
- Credit card processing delay (1-2 days)
- Statement closing date vs transaction date
- User entering transaction on different day
- Time zone differences

**User-adjustable:** 0-7 days in settings

---

## Component 3: Vendor Match Score (30% weight)

### Formula

```typescript
function calculateVendorScore(
  docVendor: string,
  txnVendor: string
): number {
  // Normalize both strings
  const normalize = (s: string) =>
    s.toLowerCase()
     .trim()
     .replace(/[^\w\s]/g, '')  // Remove punctuation
     .replace(/\s+/g, ' ');     // Normalize whitespace

  const doc = normalize(docVendor);
  const txn = normalize(txnVendor);

  // Exact match after normalization
  if (doc === txn) {
    return 100;
  }

  // Check if one contains the other
  if (doc.includes(txn) || txn.includes(doc)) {
    const similarity = Math.min(doc.length, txn.length) / Math.max(doc.length, txn.length);
    return 85 + (similarity * 15);  // 85 to 100
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(doc, txn);
  const maxLength = Math.max(doc.length, txn.length);
  const similarity = 1 - (distance / maxLength);

  if (similarity >= 0.8) {
    return similarity * 100;  // 80 to 100
  } else if (similarity >= 0.6) {
    return 50 + ((similarity - 0.6) / 0.2) * 30;  // 50 to 80
  } else {
    return similarity * 50;  // 0 to 50
  }
}
```

### Examples

| Document Vendor | Transaction Vendor | Similarity | Score | Explanation |
|-----------------|--------------------|-----------:|------:|-------------|
| "Grab" | "Grab" | 100% | 100 | Exact match |
| "GrabFood" | "Grab" | 88% | 94 | Contains match |
| "Starbucks Coffee" | "Starbucks" | 64% | 88 | Contains match |
| "7-Eleven" | "7-11" | 83% | 83 | Fuzzy match (high) |
| "Burger King" | "Berger King" | 91% | 91 | Typo fuzzy match |
| "McDonald's" | "McDonalds" | 95% | 95 | Punctuation normalized |
| "Amazon.com" | "Amazon" | 77% | 88 | Contains match |
| "Tesco Lotus" | "Lotus" | 50% | 75 | Partial match |
| "Shell Gas" | "Starbucks" | 22% | 11 | No match |

### Vendor Matching Edge Cases

**Aliases:** Maintain alias map for common variations
```typescript
const VENDOR_ALIASES = {
  'grab': ['grabfood', 'grabtaxi', 'grab thailand'],
  'amazon': ['amazon.com', 'amazon.co.th', 'amzn'],
  '7-eleven': ['7-11', '7 eleven', 'seven eleven'],
  // ...
};
```

**Empty Vendor:** If document vendor is empty (OCR failed)
- Score = 0 if transaction has vendor
- Score = 50 if transaction also has no vendor (neutral)

---

## Matching Factors Storage

For each match, store detailed breakdown in `document_matches.matching_factors` (JSONB):

```json
{
  "amount": {
    "document": 234.50,
    "transaction": 235.00,
    "diff_percent": 0.21,
    "score": 96
  },
  "date": {
    "document": "2025-10-15",
    "transaction": "2025-10-16",
    "days_diff": 1,
    "score": 93
  },
  "vendor": {
    "document": "GrabFood",
    "transaction": "Grab",
    "similarity": 0.88,
    "score": 94
  },
  "overall_confidence": 94.3
}
```

This enables:
- Showing user why match was suggested
- Debugging false positives/negatives
- Improving algorithm over time

---

## Auto-Approval Rules

### Rule 1: Single High-Confidence Match

```typescript
function shouldAutoApprove(
  matches: Match[],
  userPreferences: UserPreferences
): boolean {
  const highConfidenceMatches = matches.filter(
    m => m.confidence >= userPreferences.auto_approve_threshold
  );

  // Exactly one match above threshold
  if (highConfidenceMatches.length === 1) {
    return true;
  }

  // Multiple high-confidence matches = ambiguous = require review
  if (highConfidenceMatches.length > 1) {
    return false;
  }

  // No high-confidence matches = require review
  return false;
}
```

### Rule 2: Gap Between Top Matches

Additional safety check to prevent ambiguous auto-approval:

```typescript
function hasConfidenceGap(matches: Match[]): boolean {
  if (matches.length < 2) return true;

  const topMatch = matches[0].confidence;
  const secondMatch = matches[1].confidence;

  // Require at least 10% gap between #1 and #2
  return (topMatch - secondMatch) >= 10;
}
```

**Example:**
- Match 1: 96% confidence
- Match 2: 85% confidence
- Gap: 11% → **Auto-approve eligible**

- Match 1: 96% confidence
- Match 2: 94% confidence
- Gap: 2% → **Require review** (too close)

---

## User Preferences

Stored in `user_document_preferences` table:

```typescript
interface UserDocumentPreferences {
  auto_approve_threshold: number;  // 90-99, default 95
  date_tolerance_days: number;     // 0-7, default 3
  amount_tolerance_percent: number; // 0-5, default 1.0
  enable_auto_approval: boolean;   // default true
}
```

### Preset Modes

**Cautious Mode:**
- auto_approve_threshold: 98%
- date_tolerance_days: 1
- amount_tolerance_percent: 0.5%
- Result: Very few auto-approvals, high precision

**Balanced Mode (Default):**
- auto_approve_threshold: 95%
- date_tolerance_days: 3
- amount_tolerance_percent: 1.0%
- Result: Most receipts auto-match, low false positives

**Aggressive Mode:**
- auto_approve_threshold: 90%
- date_tolerance_days: 5
- amount_tolerance_percent: 2.0%
- Result: Maximum automation, slightly more errors

---

## Performance Optimizations

### Database Query Optimization

```sql
-- Create composite index for fast candidate lookup
CREATE INDEX idx_transactions_matching ON transactions(
  user_id,
  transaction_date,
  amount
) WHERE deleted_at IS NULL;

-- Query only date range candidates (avoid full table scan)
SELECT * FROM transactions
WHERE user_id = $1
  AND transaction_date BETWEEN $2 - INTERVAL '7 days' AND $2 + INTERVAL '7 days'
  AND amount BETWEEN $3 * 0.9 AND $3 * 1.1
  AND deleted_at IS NULL
ORDER BY ABS(EXTRACT(EPOCH FROM (transaction_date - $2)))
LIMIT 50;
```

### Fuzzy Matching Cache

Cache vendor similarity calculations:

```typescript
const vendorSimilarityCache = new Map<string, number>();

function getCachedVendorScore(v1: string, v2: string): number {
  const key = `${v1.toLowerCase()}:${v2.toLowerCase()}`;
  if (vendorSimilarityCache.has(key)) {
    return vendorSimilarityCache.get(key);
  }

  const score = calculateVendorScore(v1, v2);
  vendorSimilarityCache.set(key, score);
  return score;
}
```

### Parallel Processing

For batch uploads, process matches in parallel:

```typescript
async function matchDocumentsBatch(documentIds: string[]): Promise<Match[][]> {
  return Promise.all(
    documentIds.map(id => findMatchesForDocument(id))
  );
}
```

**Target Performance:**
- Single document: <500ms
- 10 documents: <2s (parallel)
- User with 1000+ transactions: <1s per document

---

## Testing Strategy

### Unit Tests

```typescript
describe('calculateAmountScore', () => {
  test('exact match returns 100', () => {
    expect(calculateAmountScore(234.50, 234.50, 1.0)).toBe(100);
  });

  test('within tolerance returns 80-100', () => {
    expect(calculateAmountScore(234.50, 235.00, 1.0)).toBeGreaterThan(80);
  });

  test('beyond tolerance returns 0-80', () => {
    expect(calculateAmountScore(234.50, 245.00, 1.0)).toBeLessThan(80);
  });
});
```

### Integration Tests

```typescript
describe('findMatches', () => {
  test('finds exact match with 100% confidence', async () => {
    const doc = await createTestDocument({ amount: 100, date: '2025-10-15', vendor: 'Grab' });
    const txn = await createTestTransaction({ amount: 100, date: '2025-10-15', vendor: 'Grab' });

    const matches = await findMatches(doc.id);

    expect(matches).toHaveLength(1);
    expect(matches[0].transaction_id).toBe(txn.id);
    expect(matches[0].confidence).toBeGreaterThan(95);
  });

  test('returns multiple ranked matches', async () => {
    const doc = await createTestDocument({ amount: 100, date: '2025-10-15', vendor: 'Grab' });
    await createTestTransaction({ amount: 100, date: '2025-10-15', vendor: 'Grab' });      // 100% match
    await createTestTransaction({ amount: 101, date: '2025-10-16', vendor: 'GrabFood' });  // 90% match
    await createTestTransaction({ amount: 105, date: '2025-10-18', vendor: 'Grab' });      // 80% match

    const matches = await findMatches(doc.id);

    expect(matches).toHaveLength(3);
    expect(matches[0].confidence).toBeGreaterThan(matches[1].confidence);
    expect(matches[1].confidence).toBeGreaterThan(matches[2].confidence);
  });
});
```

### Accuracy Testing

Manual review of 100 real receipts:

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| True Positive Rate | >85% | Correctly matched / Total matchable |
| False Positive Rate | <5% | Incorrectly auto-approved / Total auto-approved |
| Precision (auto-approve) | >95% | Correct auto-approvals / All auto-approvals |
| Recall (auto-approve) | >70% | Auto-approved / Should be auto-approved |

---

## Edge Cases & Handling

### Case 1: Multiple Documents for Same Transaction

**Example:** User uploads receipt + email confirmation for same purchase

**Handling:**
- Allow multiple documents per transaction
- `transactions.document_ids` is JSONB array
- Show all documents in transaction detail
- First match auto-approved, subsequent require review

### Case 2: No Candidates Found

**Example:** Document date is 2 months old, no transactions in range

**Handling:**
- Return empty match list
- Show in "Unmatched" section of review queue
- Suggest "Create Transaction from Document"
- Don't show error (valid state)

### Case 3: Identical Recurring Transactions

**Example:** Monthly Netflix subscription, multiple transactions with same amount/vendor

**Handling:**
- Prefer transaction closest to document date
- If tie, prefer most recent transaction
- If confidence gap <10%, require review

### Case 4: Currency Conversion Variance

**Example:** Receipt in THB, transaction in USD, exchange rate fluctuates

**Handling:**
- Use exchange rate from document date (not transaction date)
- Allow 2% tolerance for FX variance
- If outside tolerance, lower confidence but still match

### Case 5: Partial Refunds

**Example:** ฿500 purchase, ฿100 refund, receipt shows ฿500

**Handling:**
- Match to original transaction (not refund)
- Show both transactions as suggestions
- User decides which to link

---

## Monitoring & Analytics

### Key Metrics to Track

```typescript
interface MatchingMetrics {
  // Volume
  documents_processed: number;
  matches_found: number;
  auto_approvals: number;
  manual_approvals: number;
  rejections: number;

  // Quality
  avg_confidence: number;
  confidence_distribution: {
    high: number;      // ≥95%
    medium: number;    // 80-95%
    low: number;       // <80%
  };

  // Performance
  avg_matching_time_ms: number;
  p95_matching_time_ms: number;

  // User Behavior
  undo_rate: number;           // Undos / Auto-approvals
  manual_correction_rate: number;  // Edits / Approvals
}
```

### Feedback Loop

Track user corrections to improve algorithm:

```sql
CREATE TABLE matching_feedback (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  suggested_transaction_id UUID REFERENCES transactions(id),
  actual_transaction_id UUID REFERENCES transactions(id),
  suggested_confidence DECIMAL(5,2),
  user_action TEXT, -- 'approved', 'rejected', 'corrected'
  feedback_reason TEXT, -- Optional user-provided reason
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Analyze weekly:
- Which confidence ranges have highest rejection rate?
- Which vendor pairs frequently mismatch?
- Should thresholds be adjusted?

---

## Future Improvements (v2.0)

### Machine Learning Enhancements

1. **Personalized Thresholds**
   - Learn user's approval/rejection patterns
   - Adjust thresholds per user automatically
   - Example: Cautious users → raise threshold to 97%

2. **Vendor Embeddings**
   - Use text embeddings for vendor similarity
   - Better handle typos and variations
   - Example: "McDonald's" → "Mcdonald" (vector similarity)

3. **Historical Match Learning**
   - Weight factors based on what works for user
   - Example: If user's dates often off by 5 days, increase tolerance

4. **Category-Based Matching**
   - Consider transaction/vendor category
   - Example: Gas receipt unlikely to match restaurant transaction

### Advanced Features

5. **Multi-Transaction Documents**
   - Statement with 20 line items → match all 20
   - Show progress: "Matched 15 of 20"

6. **Duplicate Detection**
   - Warn if uploading duplicate document
   - Fingerprint images (perceptual hash)

7. **Smart Splitting**
   - Itemized receipt → split into multiple transactions
   - Tax/tip separation
   - Per-item categorization

---

## API Reference

### Find Matches for Document

```typescript
POST /api/documents/{document_id}/match

Request Body: None

Response:
{
  "document_id": "uuid",
  "matches": [
    {
      "id": "uuid",
      "transaction_id": "uuid",
      "confidence": 94.3,
      "matching_factors": {
        "amount": { "score": 96, "diff_percent": 0.21 },
        "date": { "score": 93, "days_diff": 1 },
        "vendor": { "score": 94, "similarity": 0.88 }
      },
      "transaction": {
        "id": "uuid",
        "amount": 235.00,
        "date": "2025-10-16",
        "vendor": "Grab",
        "description": "Food delivery"
      }
    }
  ],
  "auto_approved": true,
  "auto_approved_match_id": "uuid"
}
```

### Get User Preferences

```typescript
GET /api/users/document-preferences

Response:
{
  "auto_approve_threshold": 95.0,
  "date_tolerance_days": 3,
  "amount_tolerance_percent": 1.0,
  "enable_auto_approval": true,
  "notify_on_auto_match": true
}
```

### Update User Preferences

```typescript
PATCH /api/users/document-preferences

Request Body:
{
  "auto_approve_threshold": 98.0,
  "date_tolerance_days": 1
}

Response: Updated preferences object
```

---

## Conclusion

This matching algorithm balances automation with user control:

✅ **High Precision:** 95%+ threshold ensures low false positives
✅ **Transparent:** Clear confidence scores and matching factors
✅ **Customizable:** User can adjust sensitivity
✅ **Performant:** <500ms per document match
✅ **Monitorable:** Comprehensive metrics and feedback loop

The weighted scoring approach (Amount 40%, Date 30%, Vendor 30%) reflects the relative importance of each factor in determining a match. Amount is weighted highest because it's most objective, while vendor names can vary significantly.

---

**Document Version:** 1.0
**Last Updated:** October 29, 2025
**Status:** Ready for Implementation

**Related Documents:**
- `/docs/IMPLEMENTATION-PLAN-Document-Management-v2.md`
- `/docs/AI-ML-ARCHITECTURE.md`
- `/docs/UX-DESIGN-Document-Management-System.md`

---

**Questions?** Review with engineering team and test with sample data before production deployment.
