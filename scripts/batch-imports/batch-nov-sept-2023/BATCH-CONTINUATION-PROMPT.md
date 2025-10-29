# BATCH IMPORT: November-October-September 2023

**Batch ID:** Nov-Oct-Sept 2023
**Protocol:** BATCH-IMPORT-PROTOCOL v1.2 + MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6
**Start Date:** October 29, 2025
**Processing Order:** Reverse chronological (November → October → September)

---

## BATCH OVERVIEW

### Months to Import (Reverse Chronological)
1. **November 2023** (Month 1 of 3)
2. **October 2023** (Month 2 of 3)
3. **September 2023** (Month 3 of 3)

### CSV Data Ranges
- **November 2023:** Lines 6536-6701
- **October 2023:** Lines 6702-6905
- **September 2023:** Lines 6906-7173

### PDF References
- **November 2023:** Page 24
- **October 2023:** Page 25
- **September 2023:** Page 26

**PDF Location:** `/Users/dennis/Code Projects/joot-app/csv_imports/Master Reference PDFs/Budget for Import-page[NUMBER].pdf`

---

## CRITICAL CONTEXT FROM ANALYSIS

### Success Metrics from Previous Batches
- **Total Transactions Imported:** 2,600+ across 18 months
- **Success Rate:** 99.9%
- **Batches Completed:** 2 recent batches (May-Mar 2024: 451 transactions, Feb-Jan-Dec 2024/2023: 477 transactions)

### Geographic Context (Sept-Nov 2023)
**All three months are USA-based:**
- Location: Conshohocken, PA apartment
- Expected Rent: ~$957 USD (not Thailand THB rent)
- Expected THB: 0-5% (USA months, pre-Thailand relocation)
- Expected Subscriptions: All USA services (T-Mobile, etc.)
- No Thailand expenses expected

### Known Patterns for These Months
- **Transaction Range:** 118-259 normal (USA months typically 120-180)
- **Currency:** 95-100% USD expected
- **Reimbursements:** 0-5 expected (USA months have fewer)
- **Storage:** Storage units active (before Thailand move)

---

## MANDATORY HARD RULES (APPLY TO ALL IMPORTS)

### 1. Currency Handling (CRITICAL - THE HARD RULE)
```javascript
// ALWAYS extract raw amount + currency ONLY
// NEVER use Column 8 (conversion column)
// NEVER perform conversions
if (row[6] && row[6].includes('THB')) {
  amount = parseFloat(match[1].replace(/,/g, ''));
  currency = 'THB';
}
```

**Why:** Dec 2023 had erroneous conversion ($0.00003 instead of $0.0284). Application handles conversions at display time.

### 2. Negative Amount Conversion (DATABASE CONSTRAINT)
```javascript
if (amount < 0) {
  transactionType = 'income';
  amount = Math.abs(amount);
}
```

**Why:** Database has CHECK constraint requiring positive amounts. All refunds/credits must be positive income.

### 3. Two-Step Tag Verification (CRITICAL)
```javascript
// Step 1: Verify tag count > 0
// Step 2: Verify tag UUIDs match expected values
```

**Expected Tag IDs:**
```
Reimbursement:      205d99a2-cf0a-44e0-92f3-e2b9eae1bf72
Business Expense:   973433bd-bf9f-469f-9b9f-20128def8726
Savings/Investment: c0928dfe-1544-4569-bbad-77fea7d7e5aa
Florida House:      178739fd-1712-4356-b21a-8936b6d0a461
```

**Why:** March 2025 disaster - ALL 253 transactions imported with ZERO tags (completely unusable). Required full deletion and re-import.

### 4. Column 3 vs Column 4 (TAG LOGIC)
- **Column 3 "X":** Reimbursable (tracking ONLY, NO TAG)
- **Column 4 "X":** Business Expense (APPLY TAG)

### 5. Deduplication Must Include Merchant
```javascript
const key = `${date}_${description}_${amount}_${currency}_${merchant}`;
```

**Why:** May 2024 batch - Removing merchant caused legitimate identical transactions to be deleted (two Golf Reservations, same day, different courses, same amount).

### 6. Payment Method Schema (CRITICAL)
**Valid Fields ONLY:** `id`, `name`, `user_id`, `sort_order`, `created_at`, `updated_at`
**DO NOT USE:** `icon`, `color`, `preferred_currency` (these fields DO NOT EXIST)

**Why:** May 2024 batch import failure - "column does not exist" error.

### 7. Comma-Formatted Amounts
```javascript
function parseAmount(amountStr) {
  const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
  return parseFloat(cleaned);
}
```

**Why:** Large amounts like "$3,490.02" or "$1,000.00" fail to parse without comma removal.

### 8. Typo-Tolerant Reimbursement Detection
```javascript
const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());
```

**Why:** User occasionally misspells: "Remibursement:", "Rembursement:", "Reimbursment:"

### 9. DSIL Design/LLC Exclusion
```javascript
const isDSILIncome = merchant && (
  merchant.includes('DSIL Design') ||
  merchant.includes('DSIL LLC')
);
if (isReimbursement && !isDSILIncome) {
  tags.push('Reimbursement');
}
```

**Why:** Company income labeled "Reimbursement:" shouldn't get Reimbursement tag.

### 10. Database is Source of Truth
- Level 6 (100% line item verification) MUST pass
- If Level 6 passes but Level 2 (daily totals) shows variance → PDF formula error (acceptable)

---

## THREE-GATE BATCH ARCHITECTURE

### Gate 1: Batch Pre-Flight Analysis (15-20 minutes)
**Objective:** Comprehensive analysis before any imports

**Execute:**
1. Verify all 3 PDFs accessible (pages 24-26)
2. Extract CSV line ranges (6536-7173)
3. Catalog red flags per month
4. Cross-month pattern analysis
5. Create batch manifest

**Create Files:**
- `GATE-1-EXECUTIVE-SUMMARY.md`
- `BATCH-PREFLIGHT-REPORT.md`
- `BATCH-MANIFEST.md`
- Per-month: `RED-FLAGS.md`

**Auto-Proceed if:**
- All PDFs verified
- Line ranges identified
- No BLOCKING red flags without resolution
- Expected patterns match historical

---

### Gate 2: Sequential Month Processing (6-9 hours total)
**Process each month through 4 phases:**

#### Phase 1: Pre-Flight Analysis (5-10 min)
- Verify PDF page
- Extract expected totals
- Document red flags
- Get user approval if blocking

**Create:** `PHASE-1-PREFLIGHT.md`

#### Phase 2: Parse & Prepare (10-15 min)
- Adapt proven parser template
- Apply ALL 10 hard rules above
- Validate parsed JSON

**Create:**
- `parse-[month]-2023.js`
- `[month]-2023-CORRECTED.json`
- `PHASE-2-COMPLETE.md`

#### Phase 3: Database Import (15-30 min)
- Import JSON to database
- TWO-STEP tag verification
- Verify tag UUIDs match expected

**Create:**
- `import-[month]-2023.js`
- `PHASE-3-COMPLETE.md`

#### Phase 4: Comprehensive Validation (15-20 min)
- Run 6-level validation
- Focus on Level 6 (100% match)
- Critical transaction verification

**Create:**
- `verify-[month]-2023.js`
- `PHASE-4-COMPLETE.md`

**Month Auto-Proceed if:**
- Transaction count within ±5%
- Tags verified (count AND UUIDs)
- Rent confirmed (~$957 for USA months)
- Zero negative amounts in database
- Currency distribution matches expected
- Critical transactions found

---

### Gate 3: Batch Validation & PDF Verification (30-45 min)
**Mandatory 100% PDF verification before final approval**

**Execute:**
1. Cross-month consistency (rent, subscriptions)
2. Tag distribution analysis
3. Currency pattern analysis
4. Spending trend analysis
5. **100% PDF verification (all 3 months)**

**Create:**
- `GATE-3-PDF-VERIFICATION.md`
- `BATCH-COMPLETE.md`

**Batch Approval if:**
- All months validated individually
- 100% PDF verification complete
- All rents confirmed
- Subscription continuity verified
- No systematic errors
- All red flags resolved

---

## PROVEN PARSER TEMPLATE LOCATIONS

**Most Recent (Use These):**
- `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/january-2024/parse-january-2024.js`
- `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/december-2023/parse-december-2023.js`

**Key Features:**
- Quote-aware CSV parsing
- Comma-formatted amount handling
- Negative amount conversion
- Typo-tolerant reimbursement regex
- DSIL Design exclusion
- Proper column 3 vs 4 handling

---

## PROVEN IMPORT TEMPLATE

**Most Recent:**
- `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/january-2024/import-january-2024.js`

**Key Features:**
- Map-based caching (vendors, payment methods, tags)
- Progress reporting every 25 transactions
- Proper payment method schema
- Tag lookup (NOT creation)
- Comprehensive error handling

---

## PROVEN VALIDATION TEMPLATE

**Most Recent:**
- `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/january-2024/verify-january-2024.js`

**Key Features:**
- Two-step tag verification
- Tag UUID validation
- Transaction count verification
- Currency distribution check
- Critical transaction spot checks
- Negative amount check
- Unicode apostrophe handling (`\u2019`)

---

## RED FLAG SEVERITY CLASSIFICATION

### BLOCKING (Stop Immediately)
- Payment method schema errors
- Missing merchant in deduplication key
- Tag application failures (zero tags)
- Database constraint violations
- Critical transactions missing (rent)
- Wrong PDF month imported
- Systematic parsing errors

### WARNING (Investigate Before Proceeding)
- Unusual transaction patterns
- Missing merchants/payment methods (use "Unknown")
- PDF formula errors (if Level 6 fails)
- Duplicate transactions
- Multiple rents (check apartment move)
- Unusually large amounts (>$1000 recurring)

### INFO (Document Only)
- Negative amount conversions (expected)
- Typo reimbursements (handled automatically)
- Comma-formatted amounts (handled)
- Transaction count variations (±50% normal)
- THB percentage variations (location-based)
- Zero reimbursements (USA months expected)

---

## EXPECTED PATTERNS FOR SEPT-NOV 2023

### Recurring Transactions
- **Rent:** ~$957 USD (Conshohocken apartment)
- **Phone:** T-Mobile $70 (USA service)
- **Subscriptions:** Google Email $6.36, Netflix ~$24, YouTube ~$20, iCloud ~$10, HBO Max ~$17, Paramount+ ~$13
- **Storage:** Storage units active (pre-Thailand)
- **Utilities:** PECO (electricity), Internet

### Currency Distribution
- **USD:** 95-100% (USA months)
- **THB:** 0-5% (possible advanced bookings for Thailand trip planning)

### Transaction Counts
- **Expected Range:** 120-180 per month (USA months typically lower than Thailand months)
- **Reimbursements:** 0-5 (USA months have minimal reimbursements)

---

## KNOWN ISSUES TO WATCH FOR

### Nov 2023 Specific
- Line 6536 starts November section
- Check for any negative amounts (refunds)
- Verify storage payments present

### Oct 2023 Specific
- Line 6702 starts October section
- Full USA month (no Thailand expenses)
- Check for any travel expenses (possible Thailand planning)

### Sept 2023 Specific
- Line 6906 starts September section
- Last month before Thailand planning begins
- Full USA residence expected

---

## SUCCESS METRICS

### Per Month
- ✅ Transaction count exact match (no ±5% variance)
- ✅ All tags applied and verified (count + UUIDs)
- ✅ Rent found (~$957 USD)
- ✅ Zero negative amounts in database
- ✅ Currency distribution 95-100% USD
- ✅ All critical transactions found
- ✅ Level 6 validation: 100% match

### Per Batch
- ✅ All 3 months individually validated
- ✅ 100% PDF verification complete
- ✅ Cross-month consistency verified
- ✅ All rents confirmed (1 per month)
- ✅ Subscription continuity verified
- ✅ No systematic errors detected

---

## FAILURE RECOVERY PROCEDURES

### Tag Application Failure
1. Delete all transactions from month
2. Fix tag logic in import script
3. Verify tag UUIDs
4. Re-import entire month
5. Run two-step verification

### Payment Method Schema Error
1. Stop immediately
2. Fix schema (remove icon/color)
3. Delete partial transactions
4. Restart import

### Duplicate Detection Issue
1. Review deduplication key
2. Verify merchant included
3. Manually restore missing transactions
4. Document in red flag log

---

## FILE STRUCTURE

```
batch-nov-sept-2023/
├── GATE-1-EXECUTIVE-SUMMARY.md
├── BATCH-PREFLIGHT-REPORT.md
├── BATCH-MANIFEST.md
├── november-2023/
│   ├── PHASE-1-PREFLIGHT.md
│   ├── RED-FLAGS.md
│   ├── parse-november-2023.js
│   ├── november-2023-CORRECTED.json
│   ├── PHASE-2-COMPLETE.md
│   ├── import-november-2023.js
│   ├── PHASE-3-COMPLETE.md
│   ├── verify-november-2023.js
│   └── PHASE-4-COMPLETE.md
├── october-2023/
│   └── [same structure as November]
├── september-2023/
│   └── [same structure as November]
├── GATE-3-PDF-VERIFICATION.md
└── BATCH-COMPLETE.md
```

---

## IMMEDIATE NEXT STEPS

1. **Start Gate 1:** Batch Pre-Flight Analysis
2. **Verify PDFs:** Pages 24-26 accessible
3. **Extract Line Ranges:** Confirm 6536-7173
4. **Catalog Red Flags:** All three months
5. **Create Manifest:** Batch configuration
6. **Get Approval:** Proceed to Gate 2

---

## CONTINUATION PROMPT FOR NEW CLAUDE CODE TAB

Copy and paste this prompt to start the batch import in a new tab:

```
# START BATCH IMPORT: November-October-September 2023

Execute the batch transaction import for **November 2023, October 2023, and September 2023** using the Three-Gate Architecture.

**Protocols:**
- BATCH-IMPORT-PROTOCOL v1.2
- MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6

**CSV Line Ranges:**
- November 2023: 6536-6701
- October 2023: 6702-6905
- September 2023: 6906-7173

**PDF Pages:**
- November 2023: Page 24
- October 2023: Page 25
- September 2023: Page 26

**Critical Context:**
- All USA-based months (Conshohocken, PA)
- Expected rent: ~$957 USD (not THB)
- Expected USD: 95-100%
- No Thailand expenses expected
- Transaction range: 120-180 per month

**HARD RULES (MANDATORY):**
1. Parser extracts raw amount + currency ONLY (NEVER use Column 8)
2. Negative amounts → positive income (database constraint)
3. TWO-STEP tag verification (count + UUID validation)
4. Column 3 = tracking, Column 4 = tag
5. Deduplication includes merchant
6. Payment method schema: NO icon/color fields
7. Comma-formatted amounts must be handled
8. Typo-tolerant reimbursement regex
9. DSIL Design/LLC exclusion from Reimbursement tag
10. Database is source of truth (Level 6 must pass)

**Processing Order:** Reverse chronological (Nov → Oct → Sept)

**Start with Gate 1: Batch Pre-Flight Analysis**

Analyze all three months comprehensively before starting any imports. Create:
1. GATE-1-EXECUTIVE-SUMMARY.md
2. BATCH-PREFLIGHT-REPORT.md
3. BATCH-MANIFEST.md
4. RED-FLAGS.md (per month)

Then proceed through Gate 2 (4 phases per month) and Gate 3 (100% PDF verification).

**Proven Templates:**
- Parser: `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/january-2024/parse-january-2024.js`
- Import: `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/january-2024/import-january-2024.js`
- Validation: `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/january-2024/verify-january-2024.js`

Follow the comprehensive 4-phase process for each month, using specialized agents where appropriate (Explore agent for codebase analysis, code-reviewer agent after significant changes, etc.).

BEGIN NOW with Gate 1.
```

---

**Document Created:** October 29, 2025
**Batch:** Nov-Oct-Sept 2023
**Expected Duration:** 8-12 hours total
**Expected Transactions:** ~360-540 total across 3 months
