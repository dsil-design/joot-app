# Monthly Transaction Import Protocol - October 2024

**Mission**: Import October 2024 historical transaction data using the established 4-Phase Import Protocol v3.6 with 100% comprehensive validation and red flag logging.

**Status**: READY TO START
**Protocol Version**: 3.6 (see `scripts/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`)
**Target**: October 2024 (13 months back from October 2025)

---

## Knowledge Base - Current Status

### Completed Imports (12 Months):
1. ✅ **October 2025**: 119 transactions
2. ✅ **September 2025**: 159 transactions, variance -2.24%
3. ✅ **August 2025**: 194 transactions, variance +2.24%
4. ✅ **July 2025**: 176 transactions, variance 1.7%
5. ✅ **June 2025**: 190 transactions, variance +3.18%, 100% verified
6. ✅ **May 2025**: 174 transactions, variance 0.29%, 100% verified with red flag logging
7. ✅ **April 2025**: 182 transactions, 3 user corrections, 8 tag fixes
8. ✅ **March 2025**: 253 transactions, 2 user corrections, tag import fixed, 34 tags applied
9. ✅ **February 2025**: 211 transactions, 99.55% accuracy, 3 typo reimbursements, Florida House date fix
10. ✅ **January 2025**: 195 transactions, 100% validation pass, apartment move (2 rents), income adjustment handling
11. ✅ **December 2024**: 259 transactions, 1.88% variance, HIGHEST count, 1 missing tag fixed manually
12. ✅ **November 2024**: 118 transactions, 0.79% variance, 3 refunds, 1 comma amount

### Current Database State (dennis@dsil.design):
- **Total transactions**: ~2,111 (all 12 months above)
- **Vendors**: 588+
- **Payment methods**: 46+
- **Tags**: Reimbursement, Florida House, Savings/Investment, Business Expense

### Next Target: **October 2024**

### Critical Context:
- **Protocol Version**: 3.6 (ALL lessons from 12 imports incorporated)
- **October 2024 is 3RD EARLIEST month** - may have different spending patterns
- **Position**: BEFORE November 2024 (lines 3403-3617 in CSV)
- **Pattern Analysis**:
  - November 2024: 118 transactions (very low reimbursement count)
  - December 2024: 259 transactions (HIGHEST count seen)
  - Expected: ~115-130 transactions (based on early month patterns)

---

## Reference Files for October 2024

### Primary Sources

**PDF**: `/csv_imports/Master Reference PDFs/Budget for Import-page13.pdf`
- **Page Calculation**: October 2025 = page1, October 2024 = page13 (13 months back)
- **Reference**: See `PDF-MONTH-MAPPING.md` for page pattern
- **CRITICAL**: Must verify PDF shows October 2024 before starting

**CSV**: `/csv_imports/fullImport_20251017.csv`
- **Expected Position**: BEFORE November 2024 (lines 3403-3617)
- **Estimated Range**: ~3200-3402 (approximate - to be confirmed in pre-flight)
- **Pattern**: Lines decrease as we go back in time

**Parsing Script**: `/scripts/parse-october-2024.js`
- **STATUS**: Does NOT exist - must be created
- **Template**: Use `parse-november-2024.js` or `parse-december-2024.js`
- **MUST incorporate ALL v3.6 lessons** (see protocol)

**Import Script**: `/scripts/db/import-month.js`
- ✅ Verified working from all 12 previous imports
- ✅ Tag matching bug fixed (March 2025)
- ⚠️ May have edge case where 1 tag doesn't apply (manual fix acceptable)

### Supporting Documents
- **`scripts/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`** - COMPLETE protocol (READ THIS FIRST)
- **`scripts/FINAL_PARSING_RULES.md`** - Column mapping and parsing rules
- **`PDF-MONTH-MAPPING.md`** - PDF page number reference
- **`scripts/NOVEMBER-2024-RED-FLAGS.md`** - Most recent similar month
- **`scripts/DECEMBER-2024-RED-FLAGS.md`** - Highest transaction count example

---

## Expected Tag IDs (Verify After Import)

```javascript
{
  "Reimbursement": "205d99a2-cf0a-44e0-92f3-e2b9eae1bf72",
  "Florida House": "178739fd-1712-4356-b21a-8936b6d0a461",
  "Business Expense": "973433bd-bf9f-469f-9b9f-20128def8726",
  "Savings/Investment": "c0928dfe-1544-4569-bbad-77fea7d7e5aa"
}
```

---

## PHASE 1: Pre-Flight Analysis

**Agent**: data-engineer (via Task tool)

**Copy/Paste Prompt**:

```
Analyze October 2024 data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page13.pdf using scripts/FINAL_PARSING_RULES.md.

**STEP 0 - CRITICAL PDF VERIFICATION (DO THIS FIRST)**:
Before starting any analysis, you MUST verify the PDF contains October 2024 data:
1. Read: csv_imports/Master Reference PDFs/Budget for Import-page13.pdf
2. Find the first transaction date in the "Expense Tracker" section
3. Verify it shows "October 2024" (e.g., "Tuesday, October 1, 2024" or "Wednesday, October 2, 2024")
4. If PDF shows ANY other month, STOP IMMEDIATELY
5. Report to user: "PDF verification failed - Budget for Import-page13.pdf contains [ACTUAL MONTH] data, not October 2024"
6. Note: Expected page number is 13 (October 2025 = page1, October 2024 = 13 months back = page13)
7. Consult PDF-MONTH-MAPPING.md or ask user for correct path before continuing

Only proceed with tasks 1-10 below if Step 0 passes (PDF contains October 2024 data).

Tasks:
1. Find line numbers for all 4 sections in CSV:
   - Expense Tracker
   - Gross Income Tracker
   - Personal Savings & Investments
   - Florida House Expenses
   NOTE: October 2024 should be BEFORE November 2024 (lines 3403-3617) in the CSV.

2. Count transactions per section (raw count before deduplication)

3. Extract GRAND TOTALS from PDF (NOT CSV):
   - Expense Tracker NET total
   - Gross Income total
   - Savings/Investment total
   - Florida House total

4. Calculate expected total: Expense Tracker NET + Florida House + Savings

5. Detect potential duplicates between sections:
   - Compare Expense Tracker vs Florida House (same merchant + amount + date)
   - Document which version to keep (per FINAL_PARSING_RULES.md: keep Expense Tracker)
   - NOTE from March: User must decide on duplicates

6. Count tag conditions:
   - Reimbursements: description matches `/^Re(im|mi|m)?burs[e]?ment:?/i` (includes typos + no colon variants)
   - EXCLUDE from Reimbursement count: DSIL Design or DSIL LLC merchant (company income, no tag - learned from December)
   - Business Expenses: column 4 has "X" (expense with tag)
   - Reimbursables: column 3 has "X" (tracking only, NO tag - learned from December)
   - Florida House: from Florida House section (expense with tag)
   - Savings/Investment: from Savings section (expense with tag)

7. Identify currency distribution:
   - USD transactions (column 7/9 has value, column 6 no THB)
   - THB transactions (column 6 has "THB XXX")
   - Mixed/other patterns

8. Verify parsing script correctness:
   - Check if scripts/parse-october-2024.js exists
   - If NOT exists: flag that script needs to be created following parse-november-2024.js pattern
   - If exists: verify it uses Column 6 for THB (NOT Column 8 conversion)
   - If exists: verify it handles negative amounts (converts to positive income)
   - If exists: verify it handles comma-formatted amounts
   - If exists: verify it has typo reimbursement regex (learned from February)
   - If exists: verify it defaults Florida House dates to 2024-10-31 (learned from February)
   - If exists: verify it excludes DSIL Design/LLC from Reimbursement tag (learned from December)

9. Compare to previous months:
   - October 2025: 119 transactions
   - September 2025: 159 transactions, 23 reimbursements, ~70 THB
   - August 2025: 194 transactions, 32 reimbursements, 82 THB
   - July 2025: 176 transactions, 26 reimbursements, ~90 THB
   - June 2025: 190 transactions, 27 reimbursements, 85 THB
   - May 2025: 174 transactions, 16 reimbursements, 89 THB
   - April 2025: 182 transactions, 22 reimbursements, 93 THB
   - March 2025: 253 transactions, 28 reimbursements, 109 THB
   - February 2025: 211 transactions, 19 reimbursements, 144 THB (69.2%)
   - January 2025: 195 transactions, 15 reimbursements, 103 THB (53%)
   - December 2024: 259 transactions, 18 reimbursements, 115 THB (44.4%) - HIGHEST count
   - November 2024: 118 transactions, 0 reimbursements, 6 THB (5%) - LOW count
   - Flag significant structural differences
   - NOTE: October 2024 is 3rd earliest month - may have different patterns, similar to November 2024

10. Identify anomalies (CRITICAL - LESSONS FROM ALL 12 PREVIOUS MONTHS):
    - **Negative amounts**: Check for $(xxx) or negative signs in expense rows (MUST convert to income)
    - **Comma-formatted amounts**: Check for amounts like "$3,490.02" or "$1,000.00" (MUST handle in parser)
    - **Typo reimbursements**: Check for "Remibursement", "Rembursement", "Reimbursment" variants (learned from February)
    - **DSIL Design reimbursements**: Flag any DSIL Design/LLC transactions with "Reimbursement:" in description (should NOT get tag - learned from December)
    - **Unusual transactions**: Multiple rents, income adjustments, large one-time expenses (learned from January)
    - **Unusually large amounts**: Flag USD amounts >$1000 that seem abnormal for recurring expenses
    - **Currency errors**: Compare recurring expenses (rent, cleaning, utilities) to later months
    - **Missing dates in Florida House**: Check if Florida House section has dates (learned from February)
    - Missing amounts
    - Invalid dates (e.g., wrong year)
    - Unusual patterns
    - Data quality issues

Output Files:
- scripts/OCTOBER-2024-PREFLIGHT-REPORT.md
- scripts/OCTOBER-2024-RED-FLAGS.md (for tracking anomalies/issues for later review)

Report must include:
- PDF verification status (CRITICAL - must pass before continuing)
- Line number ranges for each section
- Transaction counts per section
- Expected totals from PDF (source of truth)
- Expected total calculation
- Duplicate detection results with line numbers
- Tag distribution preview (counts)
- Currency breakdown (USD vs THB vs other)
- Parsing script verification status (exists/needs creation/needs correction)
- Comparison to previous months (all 12 completed imports)
- **Negative amounts flagged** (with line numbers) - CRITICAL
- **Comma-formatted amounts flagged** (with line numbers) - CRITICAL
- **Typo reimbursements flagged** (with line numbers) - CRITICAL
- **DSIL Design reimbursements flagged** (with line numbers) - CRITICAL
- **Unusual transactions flagged** (with line numbers) - CRITICAL for user consultation
- **Missing dates in Florida House flagged** - CRITICAL
- **Currency anomalies flagged** (comparing to typical patterns)
- Red flags or structural differences
- Parsing strategy recommendations

Red Flag Log Must Include:
For EACH anomaly/issue discovered:
- Transaction details (date, description, amount, line number)
- Issue type (negative amount, comma-formatted, duplicate, currency error, typo reimbursement, DSIL Design reimbursement, missing date, unusual transaction, etc.)
- Severity (CRITICAL / WARNING / INFO)
- Phase detected (Pre-Flight)
- Status (OPEN / RESOLVED / ACCEPTED)
- Notes/context
- **Comparison to previous months** (if applicable)
- **User consultation needed** (YES / NO)

CRITICAL VERIFICATION:
- Verify PDF month matches October 2024 (MUST DO FIRST)
- Verify rent transaction should be THB 25,000-35,000 (or flag if different pattern)
- Verify parsing script uses Column 6 for THB amounts (or flag if needs creation)
- Verify parsing script does NOT use Column 8 (conversion column)
- **Flag ANY negative amounts for conversion to income**
- **Flag ANY comma-formatted amounts for special parsing**
- **Flag ANY typo reimbursements for regex detection**
- **Flag ANY DSIL Design reimbursements for exclusion from tag**
- **Flag ANY unusual transactions for user consultation**
- **Flag ANY missing dates in Florida House section**
- **Flag ANY currency anomalies**

This is critical pre-import validation - flag any anomalies before we proceed to parsing.

IMPORTANT: Create both output files (report and red flag log) with all findings. Return a summary of the key findings including any red flags that need human review before proceeding, especially any unusual transactions that require user consultation and any DSIL Design reimbursements that should not get tags.
```

**Output**:
- `scripts/OCTOBER-2024-PREFLIGHT-REPORT.md`
- `scripts/OCTOBER-2024-RED-FLAGS.md`

**Human Checkpoint**: ⏸️ Review pre-flight report and red flag log, address any critical issues before Phase 2. **Confirm PDF month is correct, provide guidance on unusual transactions, confirm DSIL Design exclusions, approve parsing strategy.**

---

## PHASE 2: Parse & Prepare

**Agent**: data-engineer (via Task tool)

**Prerequisites**:
- ✅ Pre-flight report reviewed and approved
- ✅ PDF verified as October 2024
- ✅ Line ranges identified
- ✅ User corrections confirmed for any red flags

**Copy/Paste Prompt** (fill in line ranges from pre-flight):

```
Parse October 2024 transactions following scripts/FINAL_PARSING_RULES.md exactly, incorporating ALL lessons learned from 12 previous imports.

Source: csv_imports/fullImport_20251017.csv
Line Ranges: [FILL IN FROM PRE-FLIGHT REPORT]
  - Expense Tracker: lines X-Y
  - Gross Income: lines X-Y
  - Savings/Investment: lines X-Y
  - Florida House: lines X-Y

**USER-CONFIRMED CORRECTIONS** (if any from Phase 1):
[LIST ANY CORRECTIONS CONFIRMED BY USER]

Critical Requirements:

1. **Currency Handling (MOST IMPORTANT - FOUNDATIONAL LESSON):**
   - THB transactions: Use Column 6 value (e.g., "THB 25000.00")
   - USD transactions: Use Column 7 or Column 9 (subtotal) value
   - NEVER use Column 8 (conversion column)
   - Store currency as 'THB' or 'USD' in the currency field
   - Store amount as the ORIGINAL currency amount (e.g., 25000 for THB, not 735)
   - **Verification**: Rent should be THB 25,000-35,000 (NOT ~$740 USD)

2. **CRITICAL: Negative Amount Handling (MARCH LESSON):**
   - ANY negative expense amount MUST be converted to positive income
   - This includes refunds, credits, partial refunds, winnings, trade-ins, compensation, settlements
   - Implementation:
     ```javascript
     else if (amount < 0) {
       transactionType = 'income';
       amount = Math.abs(amount);
       console.log(`✓ REFUND/INCOME: Converting negative expense to positive income`);
     }
     ```
   - Database constraint requires ALL amounts to be positive
   - Document all conversions in red flag log

3. **CRITICAL: Comma-Formatted Amount Handling (MARCH LESSON):**
   - Clean ALL currency symbols: $, commas, quotes, tabs, parentheses, spaces
   - Example: "$3,490.02" or "$ 3,490.02" or "$1,000.00" or "$\t1,000.00" → 3490.02 or 1000.00
   - Implementation:
     ```javascript
     function parseAmount(amountStr) {
       const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
       return parseFloat(cleaned);
     }
     ```

4. **CRITICAL: Typo Reimbursement Detection (FEBRUARY LESSON):**
   - Standard: description starts with "Reimbursement:"
   - Also detect: "Remibursement:", "Rembursement:", "Reimbursment:"
   - Also allow without colon: "Reimbursement" (January lesson)
   - Implementation:
     ```javascript
     const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());
     ```

5. **CRITICAL: DSIL Design/LLC Exclusion (DECEMBER LESSON):**
   - Check merchant BEFORE applying Reimbursement tag
   - DSIL Design and DSIL LLC transactions = company income (NO tag)
   - Implementation:
     ```javascript
     const isDSILIncome = merchant && (
       merchant.includes('DSIL Design') ||
       merchant.includes('DSIL LLC')
     );

     if (isReimbursement && !isDSILIncome) {
       tags.push('Reimbursement');
       transactionType = 'income';
     }
     ```

6. **CRITICAL: Florida House Date Handling (FEBRUARY LESSON):**
   - Florida House section may have missing dates in CSV
   - Default to last day of month if no date found: '2024-10-31'
   - Implementation:
     ```javascript
     // Section 4: Florida House Expenses
     console.log('\nParsing Florida House Expenses...');
     // Default to last day of month for Florida House transactions without specific dates
     currentDate = '2024-10-31';
     ```

7. **CRITICAL: Column 3 vs Column 4 Distinction (DECEMBER LESSON):**
   - Column 3 "X" = Reimbursable (tracking only, NO TAG)
   - Column 4 "X" = Business Expense (apply tag)
   - Implementation:
     ```javascript
     // Only column 4 creates a tag
     if (row[4] === 'X' || row[4] === 'x') {
       tags.push('Business Expense');
     }
     // Column 3 "X" creates NO TAG
     ```

8. **CRITICAL: Preserve Original Descriptions (DECEMBER LESSON):**
   - Import ALL descriptions exactly as-is from CSV
   - No rewrites, corrections, or modifications
   - User prefers authentic original data

9. Parse all 4 sections with identified line ranges

10. Apply tag logic correctly (see protocol for full details)

11. Handle duplicates per user decisions from pre-flight

12. Quality checks:
    - Verify total transaction count matches pre-flight expectation
    - Verify tag counts match pre-flight expectations
    - Verify currency distribution matches pre-flight
    - Verify NO negative amounts in output
    - Verify all dates are valid and in October 2024
    - Verify rent transaction is THB (not USD conversion)

Output Files:
- scripts/october-2024-CORRECTED.json (formatted, ready for import)
- Update scripts/OCTOBER-2024-RED-FLAGS.md with parsing results

Final Verification Summary in Red Flag Log:
✅ Rent: [amount] [currency] (verify THB, not USD)
✅ Line [number]: $[amount] USD (comma-formatted, if applicable)
✅ Refunds: [count] found (all converted to positive income)
✅ Negative amounts in output: 0
✅ Currency distribution: [usd_count] USD, [thb_count] THB
✅ Typo reimbursements detected: [count]
✅ Negative conversions: [count]
✅ Comma-formatted amounts: [count]
✅ Florida dates defaulted: [count]
✅ DSIL Design exclusions: [count]

Ready for Import: ✅ YES / ❌ NO

IMPORTANT: Update the red flag log with comprehensive parsing results. Document EVERY correction, conversion, and special handling for full audit trail. Use parse-november-2024.js as your template.
```

**Output**:
- `scripts/october-2024-CORRECTED.json`
- Updated `scripts/OCTOBER-2024-RED-FLAGS.md`

**Human Checkpoint**: ⏸️ Review parsing results, verify counts, spot-check critical transactions, confirm ready for import.

---

## PHASE 3: Database Import

**Direct Commands** (NOT an agent):

**Step 1: Import to Database**
```bash
cd /Users/dennis/Code\ Projects/joot-app
node scripts/db/import-month.js scripts/october-2024-CORRECTED.json
```

**Step 2: Verify Tag Application**
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const startDate = '2024-10-01';
  const endDate = '2024-10-31';

  const { data: transactions } = await supabase
    .from('transactions')
    .select(\`
      id,
      description,
      amount,
      transaction_date,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    \`)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  const tagCounts = {};
  transactions.forEach(t => {
    if (t.transaction_tags?.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags?.name || 'Unknown';
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('Tag Distribution:');
  console.log(tagCounts);
  console.log(\`Total transactions: \${transactions.length}\`);
  console.log(\`Tagged transactions: \${transactions.filter(t => t.transaction_tags?.length > 0).length}\`);
})();
"
```

**Step 3: Verify Tag ID Mapping**
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXPECTED_TAG_IDS = {
  'Reimbursement': '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72',
  'Florida House': '178739fd-1712-4356-b21a-8936b6d0a461',
  'Business Expense': '973433bd-bf9f-469f-9b9f-20128def8726',
  'Savings/Investment': 'c0928dfe-1544-4569-bbad-77fea7d7e5aa'
};

(async () => {
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name')
    .in('name', Object.keys(EXPECTED_TAG_IDS));

  console.log('Tag ID Verification:');
  tags.forEach(tag => {
    const expected = EXPECTED_TAG_IDS[tag.name];
    const match = tag.id === expected ? '✅' : '❌';
    console.log(\`\${match} \${tag.name}: \${tag.id} (expected: \${expected})\`);
  });
})();
"
```

**Human Checkpoint**: ⏸️ Review import summary, verify tag verification results, confirm all expected tags applied. If 1 tag missing, apply manual fix (see protocol Section: Recovery Procedures).

---

## PHASE 4: Comprehensive Validation

**Agent**: data-scientist (via Task tool)

**Prerequisites**:
- ✅ Import completed successfully
- ✅ Tag verification passed
- ✅ Tag ID mapping verified

**Copy/Paste Prompt** (fill in expected counts from pre-flight):

```
Perform comprehensive 6-level validation of October 2024 import against PDF source of truth.

**Data Sources:**
- PDF: csv_imports/Master Reference PDFs/Budget for Import-page13.pdf
- Database: Supabase (user: dennis@dsil.design)
- Month: 2024-10-01 to 2024-10-31

**Expected Counts (from pre-flight):**
- Total transactions: [FILL IN]
- Expenses: [FILL IN]
- Income: [FILL IN]
- USD: [FILL IN]
- THB: [FILL IN]
- Reimbursement tags: [FILL IN]
- Florida House tags: [FILL IN]
- Business Expense tags: [FILL IN]
- Savings/Investment tags: [FILL IN]

**Validation Levels:**

**Level 1: Section Grand Totals**

Compare database totals against PDF section totals:
1. Expense Tracker NET total (±2% OR ±$150)
2. Florida House total (±$5)
3. Savings/Investment total (exact match)
4. Gross Income total (±$1)

**Level 2: Daily Subtotals Analysis**
- Extract daily totals from PDF and compare to database
- Flag variances > $1
- NOTE: If Level 1 passes but Level 2 shows variance → likely PDF formula error (acceptable)

**Level 3: Transaction Count Verification**
- Verify exact match for all categories

**Level 4: Tag Distribution**
- Verify tag counts match expectations

**CRITICAL (November 2024 lesson):**
- Do NOT query for negative amounts when looking for refunds
- Refunds are stored as POSITIVE income transactions
- Query by: transaction_type='income' AND description ILIKE '%refund%'

**Level 5: Critical Transaction Spot Checks**
1. Rent transaction (THB 25,000-35,000)
2. Florida House count
3. Refunds (if any - as positive income)
4. Comma-formatted amounts (if flagged)

**Level 6: 100% Comprehensive 1:1 Verification**
- PDF → Database: 100% match rate
- Database → PDF: 100% match rate
- Must achieve 100% in both directions

**Exchange Rate Calculation:**
From PDF rent transaction:
- Amount: THB [amount] = $[usd_amount] USD
- Calculated Rate: [usd_amount / thb_amount]

**Output Files:**
1. scripts/OCTOBER-2024-VALIDATION-REPORT.md (executive summary, all levels, pass/fail)
2. Update scripts/OCTOBER-2024-RED-FLAGS.md (validation results, discrepancies)
3. scripts/OCTOBER-2024-COMPREHENSIVE-VALIDATION.md (optional - 100% verification details)

**Red Flag Criteria:**
- Section variance > threshold (CRITICAL)
- Transaction count mismatch (CRITICAL)
- Tag count mismatch (CRITICAL)
- Critical transaction missing (CRITICAL)
- Daily variance > $10 (WARNING unless Level 6 passes)
- Amount mismatch > $0.10 (WARNING)

**Success Criteria:**
- All 6 levels pass
- 100% match rate both directions
- All critical transactions verified
- Zero unexplained discrepancies

**IMPORTANT NOTES:**

1. **Refund Verification (November 2024 lesson):**
   - Do NOT look for negative amounts
   - Query: transaction_type='income' AND description contains 'refund'
   - Verify stored as POSITIVE income amounts

2. **PDF Formula Errors (February/December lesson):**
   - If Level 1 shows variance but Level 6 shows 100% line item match
   - Likely PDF daily total formula error
   - Status: ACCEPTABLE (database is source of truth)

Please perform all 6 levels of validation and create comprehensive reports. Flag any discrepancies for human review.
```

**Output**:
- `scripts/OCTOBER-2024-VALIDATION-REPORT.md`
- Updated `scripts/OCTOBER-2024-RED-FLAGS.md`
- `scripts/OCTOBER-2024-COMPREHENSIVE-VALIDATION.md` (optional)

**Human Checkpoint**: ⏸️ Review validation report, investigate any red flags, approve import as production-ready OR identify fixes needed.

**Final Status**:
- ✅ **APPROVED FOR PRODUCTION** - All validations passed
- ⚠️ **APPROVED WITH NOTES** - Minor acceptable variances (PDF formula errors)
- ❌ **FAILED - REQUIRES FIXES** - Critical discrepancies found

---

## Quick Reference - October 2024 Specifics

### Key Differences from November 2024:
- **Month earlier**: October comes before November, may have different spending patterns
- **Expected count**: ~115-130 transactions (similar to November's 118)
- **Location**: Lines should be BEFORE November 2024 (lines 3403-3617)
- **PDF page**: page13 (November was page12)

### CSV Line Position:
- November 2024: lines 3403-3617
- October 2024: lines ~3200-3402 (to be confirmed in pre-flight)
- Pattern: Earlier months = lower line numbers

### Critical October 2024 Checks:
1. **PDF Verification**: MUST show "October 2024" dates (Oct 1, 2, 3, etc.)
2. **Rent Amount**: Should be THB 25,000-35,000 (typical pattern)
3. **Line Numbers**: MUST be before 3403 (start of November 2024)
4. **Similar Patterns**: November had very low reimbursement count, October may be similar

### Expected Patterns Based on Position:
- Early month (3rd earliest imported)
- May be in USA (similar to November 2024 pattern)
- Lower THB transaction percentage likely (November was only 5%)
- Transaction count likely in 115-130 range

---

## Protocol Reference

For complete details on:
- All 12 months of lessons learned
- Detailed parsing requirements
- Comprehensive validation methodology
- Recovery procedures
- Red flag categories

**See**: `scripts/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`

---

## Status: READY TO START

**Next Steps:**
1. Copy Phase 1 prompt above
2. Launch data-engineer agent
3. Review pre-flight report
4. Proceed through phases 2-4
5. Final validation and approval

**Expected Duration:**
- Phase 1: 10-15 minutes
- Phase 2: 15-20 minutes
- Phase 3: 5 minutes
- Phase 4: 15-20 minutes
- **Total**: ~45-60 minutes

**Success Probability**: HIGH (all lessons from 12 previous imports incorporated)

---

**Last Updated**: October 26, 2025
**Protocol Version**: 3.6
**Status**: APPROVED FOR EXECUTION
