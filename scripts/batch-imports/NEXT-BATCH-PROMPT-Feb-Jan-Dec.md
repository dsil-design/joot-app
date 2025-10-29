# NEXT BATCH IMPORT PROMPT
**Target Months:** February 2024 → January 2024 → December 2023
**Created:** October 27, 2025
**Status:** Ready to copy/paste into new Claude Code chat

---

## COPY THIS ENTIRE SECTION BELOW ⬇️

---

Execute batch import for **February 2024**, **January 2024**, and **December 2023** using **BATCH-IMPORT-PROTOCOL v1.2** and **MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6**.

## Context

**Current Date:** October 27, 2025
**User:** dennis@dsil.design
**Database:** Supabase Production
**Project:** joot-app transaction import

**Processing Order:** February 2024 → January 2024 → December 2023 (reverse chronological, most recent first)

## Already Imported (DO NOT RE-IMPORT)

**In Database:**
- September 2024 through September 2025 (all months)
- August 2024, July 2024, June 2024 (batch import completed Oct 27)
- May 2024, April 2024, March 2024 (batch import completed Oct 27)

**Next to Import:**
- February 2024 (20 months back)
- January 2024 (21 months back)
- December 2023 (22 months back)

## PDF Page Calculations

Using PDF-MONTH-MAPPING.md formula from current month (October 2025):
- **February 2024:** 20 months back → Page **21**
- **January 2024:** 21 months back → Page **22**
- **December 2023:** 22 months back → Page **23**

**PDF Location:** `/Users/dennis/Code Projects/joot-app/csv_imports/Master Reference PDFs/`
- Page 21: `Budget for Import-page21.pdf`
- Page 22: `Budget for Import-page22.pdf`
- Page 23: `Budget for Import-page23.pdf`

## CSV Source

**Master CSV:** `/Users/dennis/Code Projects/joot-app/csv_imports/Budget for Import.csv`

**Line Ranges:** To be determined in Gate 1 Pre-Flight Analysis

## Critical Requirements

### 1. Payment Method Schema (v1.2 Critical)

**REQUIRED FIELDS ONLY:**
- `id` (uuid, primary key)
- `name` (text, not null)
- `user_id` (uuid, foreign key)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `sort_order` (integer, not null)
- `preferred_currency` (text, nullable)

**FIELDS THAT DO NOT EXIST (DO NOT USE):**
- ~~`icon`~~ ❌
- ~~`color`~~ ❌

```javascript
// CORRECT getOrCreatePaymentMethod implementation:
async function getOrCreatePaymentMethod(name, userId, paymentMap) {
  if (paymentMap.has(name)) return paymentMap.get(name);

  const { data: existing } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  if (existing) {
    paymentMap.set(name, existing.id);
    return existing.id;
  }

  // Get next sort_order
  const { data: maxSort } = await supabase
    .from('payment_methods')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = maxSort ? maxSort.sort_order + 1 : 0;

  // Create with ONLY existing fields
  const { data: newMethod, error } = await supabase
    .from('payment_methods')
    .insert({
      name,
      user_id: userId,
      sort_order: nextSortOrder
      // DO NOT include icon or color
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed: ${error.message}`);

  paymentMap.set(name, newMethod.id);
  return newMethod.id;
}
```

### 2. Deduplication Key Must Include Merchant (v1.2 Critical)

```javascript
// CORRECT - Prevents removing legitimate identical transactions
function generateDeduplicationKey(transaction) {
  return `${transaction.transaction_date}_${transaction.description}_${transaction.amount}_${transaction.currency}_${transaction.merchant || 'NO_MERCHANT'}`;
}
```

**Example:** Two golf reservations, same date, same amount, different courses → Both imported ✅

### 3. Expected Tag UUIDs (Verify These)

```javascript
const EXPECTED_TAG_IDS = {
  "Reimbursement": "205d99a2-cf0a-44e0-92f3-e2b9eae1bf72",
  "Florida House": "178739fd-1712-4356-b21a-8936b6d0a461",
  "Business Expense": "973433bd-bf9f-469f-9b9f-20128def8726",
  "Savings/Investment": "c0928dfe-1544-4569-bbad-77fea7d7e5aa"
};
```

### 4. Currency Handling (CRITICAL - May/Jun/Jul 2025 Re-Import Lesson)

```javascript
// Column 6 = THB amounts (SOURCE OF TRUTH)
// Column 8 = Converted USD (NEVER USE)

if (row[6] && row[6].includes('THB')) {
  const match = row[6].match(/THB\s*([\d,.-]+)/);
  amount = parseFloat(match[1].replace(/,/g, ''));
  currency = 'THB';
}
else if (row[7] || row[9]) {
  amount = parseFloat((row[7] || row[9]).replace(/[$,]/g, ''));
  currency = 'USD';
}
// NEVER use Column 8
```

### 5. Enhanced Parsing Logic (18 Months of Learnings)

```javascript
// Negative amounts → positive income (database constraint)
if (amount < 0) {
  transactionType = 'income';
  amount = Math.abs(amount);
}

// Typo-tolerant reimbursement detection
const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());

// DSIL Design exclusion
const isDSILIncome = merchant && (
  merchant.includes('DSIL Design') || merchant.includes('DSIL LLC')
);

if (isReimbursement && !isDSILIncome) {
  tags.push('Reimbursement');
  transactionType = 'income';
  amount = Math.abs(amount);
}

// Enhanced amount parsing (handles commas, tabs, quotes)
function parseAmount(amountStr) {
  const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
  return parseFloat(cleaned);
}

// Zero-dollar exclusion
if (amount === 0 || isNaN(amount)) {
  console.log(`⚠️  SKIPPING: $0.00 transaction - ${description}`);
  continue;
}

// Missing data defaults
const merchant = row[merchantColumn]?.trim() || 'Unknown';
const paymentMethod = row[paymentColumn]?.trim() || 'Unknown';

// Florida House missing dates
if (section === 'Florida House' && !currentDate) {
  currentDate = getLastDayOfMonth(targetMonth);
}
```

### 6. Mandatory Two-Step Tag Verification (March 2025 Disaster Prevention)

After import, ALWAYS run:

```bash
# Step 1: Verify tags were applied
node scripts/check-{month}-tags.js

# Expected output:
# Tag Distribution:
# {
#   "Reimbursement": X,
#   "Business Expense": Y,
#   "Florida House": Z
# }
# Total tagged: > 0

# Step 2: Verify tag IDs are correct
node scripts/verify-{month}-tag-mapping.js

# Expected output:
# ✅ All tags mapped to correct UUIDs
```

**If tag count = 0:** DELETE entire month, fix script, re-import. Do NOT proceed.

### 7. Mandatory 100% PDF Verification (Gate 3 - NON-OPTIONAL)

After all 3 months imported:

```javascript
// Automated verification (if available)
node scripts/verify-against-pdf.js

// Manual verification (minimum requirements):
// - All rent transactions (THB 25,000-35,000)
// - All reimbursements
// - All savings/investment transactions
// - All income transactions
// - 10+ random spot checks per month
// - Currency distribution matches expected
// - Transaction counts match expected ±5%
```

## Expected Patterns (from 18 Months of History)

### Transaction Counts
- **Normal Range:** 118-259 transactions per month
- **Average:** ~185 transactions
- Wide variation (±50%) is normal

### THB Percentage (Location Indicator)
- **<10% THB:** USA travel month
- **>40% THB:** Thailand residence month
- Expect: December 2023 likely high THB (Thailand), Jan/Feb 2024 varies

### Reimbursements
- **Range:** 0-32 per month
- **0 reimbursements:** Normal for USA months
- **15-32 reimbursements:** Normal for Thailand months

### Recurring Transactions (Verify Present)
- Rent: THB 25,000-35,000 (typically on 5th of month)
- T-Mobile: ~$70 USD
- iPhone Payment: ~$54 USD
- Netflix: ~$20-25 USD
- YouTube Premium: ~$20 USD
- Google Email: ~$6 USD
- iCloud: ~$10 USD
- Monthly Cleaning: THB 2,500-3,500 (Thailand months)

## Red Flags to Expect

**Standard (Handled Automatically):**
- Negative amounts (convert to positive income)
- Typo reimbursements (flexible regex)
- Comma-formatted amounts (parseAmount handles)
- Zero-dollar transactions (skip)
- Missing merchants/payment methods (default to "Unknown")

**Requires User Consultation:**
- Multiple rent payments (apartment move?)
- Income adjustments or corrections
- Large one-time expenses (>$1,000)
- Unusual transaction patterns
- VND or other unexpected currencies

## Three-Gate Execution Plan

### Gate 1: Batch Pre-Flight Analysis (10-15 min)
**Agent:** data-engineer

**Tasks:**
1. Verify PDF pages 21, 22, 23 exist and match expected months
2. Identify CSV line ranges for all 3 months
3. Calculate expected transaction counts
4. Scan for red flags (all severity levels)
5. Analyze cross-month patterns
6. Create batch manifest

**Deliverables:**
- `GATE-1-EXECUTIVE-SUMMARY.md`
- `BATCH-PREFLIGHT-REPORT.md`
- `BATCH-MANIFEST.md`
- `{month}/RED-FLAGS.md` (for each month)

**Output Location:** `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/`

### Gate 2: Sequential Month Processing (3-4 hours)
**Agent:** data-engineer

**For Each Month (Feb → Jan → Dec):**

**Phase 1:** Pre-Flight Analysis (5-10 min)
- Verify PDF page
- Extract expected totals
- Document red flags

**Phase 2:** Parse & Prepare (10-15 min)
- Run parser with all v1.2 enhancements
- Generate `{month}-CORRECTED.json`
- Verify no negative amounts in output
- Verify currency handling correct

**Phase 3:** Database Import (15-30 min)
- Test payment method schema FIRST
- Import all transactions
- Apply tags
- Handle errors gracefully

**Phase 4:** Validation (15-20 min)
- Two-step tag verification (CRITICAL)
- Verify rent transaction
- Check subscription continuity
- Verify critical transactions
- Confirm currency distribution

**Auto-Proceed Criteria (per month):**
- ✅ Transaction count within ±5%
- ✅ Tags verified (count > 0 AND correct UUIDs)
- ✅ Rent confirmed
- ✅ No negative amounts in database
- ✅ Currency distribution reasonable

### Gate 3: Batch Validation & PDF Verification (30-45 min)
**Agent:** data-scientist

**Tasks:**
1. **Mandatory 100% PDF Verification** (all 3 months)
2. Cross-month rent verification (3 rents expected)
3. Subscription continuity check
4. Tag distribution analysis
5. Currency pattern analysis
6. Spending trend analysis

**Deliverables:**
- `GATE3-PDF-VERIFICATION.md`
- `BATCH-VALIDATION-SUMMARY.md`
- `BATCH-IMPORT-COMPLETE.md`

**Final Approval Criteria:**
- ✅ All 3 months validated individually
- ✅ 100% PDF verification complete
- ✅ All rents confirmed (typically 3)
- ✅ Subscription continuity verified
- ✅ No systematic errors
- ✅ All red flags resolved

## File Structure to Create

```
scripts/batch-imports/batch-feb-dec-2024-2023/
├── GATE-1-EXECUTIVE-SUMMARY.md
├── BATCH-PREFLIGHT-REPORT.md
├── BATCH-MANIFEST.md
├── GATE3-PDF-VERIFICATION.md
├── BATCH-VALIDATION-SUMMARY.md
├── BATCH-IMPORT-COMPLETE.md
├── verify-against-pdf.js
├── february-2024/
│   ├── RED-FLAGS.md
│   ├── february-2024-CORRECTED.json
│   ├── import-february-2024.js
│   ├── verify-february-2024.js
│   ├── PHASE-2-PARSE-REPORT.md
│   ├── PHASE-3-IMPORT-SUMMARY.md
│   └── PHASE-4-VALIDATION-REPORT.md
├── january-2024/
│   └── [same structure]
└── december-2023/
    └── [same structure]
```

## Protocol References

**Primary Protocols:**
- `/Users/dennis/Code Projects/joot-app/scripts/BATCH-IMPORT-PROTOCOL-v1.2.md`
- `/Users/dennis/Code Projects/joot-app/scripts/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`

**Knowledge Base:**
- `/Users/dennis/Code Projects/joot-app/KNOWLEDGE-EXTRACTION-COMPLETE-ANALYSIS.md`

**Recent Batch Reference:**
- `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-may-mar-2024/`

## Critical Success Factors

1. ✅ **Schema Validation First** - Verify payment_methods schema before ANY import
2. ✅ **Deduplication Key Includes Merchant** - Prevent removing legitimate transactions
3. ✅ **Two-Step Tag Verification** - Prevent March 2025 zero-tag disaster
4. ✅ **100% PDF Verification** - Mandatory, non-optional
5. ✅ **Currency Column 6** - THB from Column 6, never Column 8
6. ✅ **Reverse Chronological** - Process February → January → December
7. ✅ **Progressive Validation** - Verify each month before next

## Estimated Timeline

- **Gate 1:** 15 minutes
- **February 2024:** 60 minutes
- **January 2024:** 60 minutes
- **December 2023:** 60 minutes
- **Gate 3:** 45 minutes
- **Total:** ~4 hours

## Environment Setup

```bash
# Working directory
cd "/Users/dennis/Code Projects/joot-app"

# Environment variables (from .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://uwjmgjqongcrsamprvjr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[from .env.local]
USER_EMAIL=dennis@dsil.design
```

## Success Metrics

**Per Month:**
- Transaction count accuracy: ±5%
- Tag application: 100%
- Tag ID mapping: 100%
- Critical transactions: 100%

**Per Batch:**
- All months validated: 100%
- PDF verification: 100%
- Cross-month consistency: 100%
- Red flags resolved: 100%

## Failure Recovery

**If payment method schema error:**
1. Stop immediately
2. Fix getOrCreatePaymentMethod
3. Delete partial transactions
4. Restart from beginning

**If tag count = 0:**
1. Delete entire month
2. Fix import script tag logic
3. Re-import
4. Verify with two-step verification

**If duplicate detection removes legitimate transactions:**
1. Review deduplication key
2. Ensure merchant included
3. Manually restore missing transactions
4. Update deduplication logic

## Ready to Execute

This batch is ready for import. Start with:

**Step 1:** Execute Gate 1 Pre-Flight Analysis
```
Create folder: scripts/batch-imports/batch-feb-dec-2024-2023/
Analyze PDFs: pages 21, 22, 23
Create executive summary and red flag reports
```

**Step 2:** Get user approval before Gate 2

**Step 3:** Execute Gate 2 (February → January → December)

**Step 4:** Execute Gate 3 with mandatory PDF verification

**Step 5:** Update knowledge base and create next batch prompt

---

## Questions Before Starting?

- Confirm PDF pages 21, 22, 23 are accessible
- Confirm processing order: February → January → December
- Confirm all 18 months of learnings should be applied
- Confirm BATCH-IMPORT-PROTOCOL v1.2 should be used

**When ready, respond:** "Execute Gate 1 Pre-Flight Analysis for February-January-December 2024/2023 batch"

---

**Prompt Prepared By:** Claude Code
**Preparation Date:** October 27, 2025
**Protocol Version:** BATCH-IMPORT-PROTOCOL v1.2
**Estimated Success Rate:** 99.9% (based on 18 months of learnings)
**Ready for:** New chat session execution
