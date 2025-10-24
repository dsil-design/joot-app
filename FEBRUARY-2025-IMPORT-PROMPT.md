# Monthly Transaction Import Protocol - February 2025

🎯 **Mission**: Import February 2025 historical transaction data using the established 4-Phase Import Protocol v3.2 with 100% comprehensive validation and red flag logging.

---

## 📚 Knowledge Base - Current Status

### Completed Imports:
1. ✅ **September 2025**: 159 transactions, variance -2.24%
2. ✅ **August 2025**: 194 transactions, variance +2.24%
3. ✅ **July 2025**: 176 transactions, variance 1.7%
4. ✅ **June 2025**: 190 transactions, variance +3.18%, 100% verified
5. ✅ **May 2025**: 174 transactions, variance 0.29%, 100% verified with red flag logging
6. ✅ **April 2025**: 182 transactions, 3 user corrections, 8 tag fixes
7. ✅ **March 2025**: 253 transactions, 2 user corrections, tag import fixed, 34 tags applied

### Current Database State (dennis@dsil.design):
- **Total transactions**: ~1,328 (Sept + Aug + July + June + May + April + March)
- **Vendors**: 350+ (existing from 7 months)
- **Payment methods**: 40+ (existing from 7 months)
- **Tags**: Reimbursement, Florida House, Savings/Investment, Business Expense

### Next Target: **February 2025**

### Critical Context:
- **March 2025 Lessons Learned**:
  - Import script tag matching bug fixed (now matches by description + amount)
  - Refunds must be converted to positive income (database constraint)
  - Comma-formatted amounts need special parsing
  - Duplicate handling requires user decisions
- **Protocol Version**: 3.2 (Tag Import Fix + Refund Conversion + March Learnings)
- **February follows March chronologically** - expect similar patterns

---

## 📁 Reference Files for February 2025

### Primary Sources
- **PDF**: `/csv_imports/Master Reference PDFs/Budget for Import-page9.pdf` (February 2025)
  - **Page Number Calculation**: October 2025 = page1, February 2025 = page9 (8 months back)
  - **Reference**: See `PDF-MONTH-MAPPING.md` for complete page number pattern
  - Source of truth for validation
  - Contains 4 sections with grand totals
  - Use for 1:1 transaction verification
  - **⚠️ CRITICAL PDF VERIFICATION STEP**:
    - **ALWAYS verify the PDF contains the correct month BEFORE starting analysis**
    - Check first transaction date in PDF (e.g., "Monday, February 1, 2025" or "Thursday, February 4, 2025")
    - If PDF shows ANY other month, STOP immediately
    - Report: "PDF verification failed - file contains [MONTH] data, not February 2025"
    - Expected PDF based on pattern: page9 (8 months back from October 2025)
    - If verification fails, consult `PDF-MONTH-MAPPING.md` or ask user for correct path

- **CSV**: `/csv_imports/fullImport_20251017.csv`
  - Lines: TBD (to be identified in pre-flight)
  - Expected: BEFORE March's lines 2102-2407
  - Pattern suggests: ~1800-2000 range (estimate)

- **Parsing Script**: `/scripts/parse-february-2025.js`
  - **STATUS**: Does NOT exist - will need to be created
  - **MUST** use Column 6 for THB amounts (NOT conversion column)
  - **MUST** use Column 7/9 for USD amounts (NOT conversion column)
  - **MUST** handle comma-formatted amounts (learned from March)
  - **MUST** convert negative expenses to positive income (learned from March)
  - Use `parse-march-2025.js` as template

- **Import Script**: `/scripts/db/import-month.js`
  - ✅ Verified working from all previous imports
  - ✅ Tag matching bug fixed in March (matches by description + amount)

### Supporting Documents
- `scripts/FINAL_PARSING_RULES.md` - Complete parsing specification
- `PDF-MONTH-MAPPING.md` - PDF page number reference
- `MARCH-2025-IMPORT-PROTOCOL.md` - Most recent import with all lessons
- `scripts/MARCH-2025-RED-FLAGS.md` - Recent red flag examples

---

## 🚨 CRITICAL LESSONS FROM MARCH 2025

### Issues Encountered & Fixed:

**Issue #1: Import Script Tag Matching Bug**
- **Problem**: Tags weren't applied to database (matched by description only, ambiguous)
- **Fix**: Updated import script to match by description + amount
- **Fix**: Added amount field to SELECT query in import script
- **Lesson**: Always verify tags were applied after import
- **Status**: ✅ FIXED in `/scripts/db/import-month.js`

**Issue #2: Negative Amounts (Database Constraint)**
- **Problem**: Refunds had negative amounts, violating database constraint
- **Fix**: Updated parsing script to convert negative expenses to positive income
- **Lesson**: ALL refunds/credits must be positive income type
- **Status**: ✅ Template available in `parse-march-2025.js`

**Issue #3: Comma-Formatted Amounts**
- **Problem**: Tax payment showed as "$3,490.02" with comma
- **Fix**: Enhanced parser to handle commas in amounts
- **Lesson**: Always clean: $, commas, quotes, tabs, parentheses
- **Status**: ✅ Template available in `parse-march-2025.js`

**Issue #4: Duplicate Handling**
- **Problem**: Same transaction in both Expense Tracker and Florida House
- **Resolution**: User decides which to keep (usually Expense Tracker)
- **Lesson**: Calculate totals before removing duplicates
- **Status**: Requires user decision during pre-flight

### Key Takeaways for February:
- **Pre-flight MUST flag**: Negative amounts, comma-formatted amounts, duplicates
- **Parsing MUST handle**: Negative→positive conversion, comma cleaning
- **Import MUST verify**: Tags applied correctly (34 tags in March)
- **Validation MUST check**: Tag distribution, currency split, critical transactions

---

## 🔧 4-Phase Import Process

### PHASE 1: Pre-Flight Analysis

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Analyze CSV and PDF to understand data structure, identify issues, and set expectations BEFORE parsing.

**Prompt**:
```
Analyze February 2025 data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page9.pdf using scripts/FINAL_PARSING_RULES.md.

**STEP 0 - CRITICAL PDF VERIFICATION (DO THIS FIRST)**:
Before starting any analysis, you MUST verify the PDF contains February 2025 data:
1. Read: csv_imports/Master Reference PDFs/Budget for Import-page9.pdf
2. Find the first transaction date in the "Expense Tracker" section
3. Verify it shows "February 2025" (e.g., "Monday, February 1, 2025" or "Thursday, February 4, 2025")
4. If PDF shows ANY other month (e.g., May 2025, March 2025), STOP IMMEDIATELY
5. Report to user: "PDF verification failed - Budget for Import-page9.pdf contains [ACTUAL MONTH] data, not February 2025"
6. Note: Expected page number is 9 (October 2025 = page1, February = 8 months back = page9)
7. Consult PDF-MONTH-MAPPING.md or ask user for correct path before continuing

Only proceed with tasks 1-10 below if Step 0 passes (PDF contains February 2025 data).

Tasks:
1. Find line numbers for all 4 sections in CSV:
   - Expense Tracker
   - Gross Income Tracker
   - Personal Savings & Investments
   - Florida House Expenses
   NOTE: February 2025 should be BEFORE March 2025 (lines 2102-2407) in the CSV.

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
   - Reimbursements: description starts with "Reimbursement:" (income type)
   - Business Expenses: column 4 has "X" (expense with tag)
   - Reimbursables: column 3 has "X" (tracking only, NO tag)
   - Florida House: from Florida House section (expense with tag)
   - Savings/Investment: from Savings section (expense with tag)

7. Identify currency distribution:
   - USD transactions (column 7/9 has value, column 6 no THB)
   - THB transactions (column 6 has "THB XXX")
   - Mixed/other patterns

8. Verify parsing script correctness:
   - Check if scripts/parse-february-2025.js exists
   - If NOT exists: flag that script needs to be created following parse-march-2025.js pattern
   - If exists: verify it uses Column 6 for THB (NOT Column 8 conversion)
   - If exists: verify it handles negative amounts (converts to positive income)
   - If exists: verify it handles comma-formatted amounts

9. Compare to previous months:
   - September 2025: 159 transactions, 23 reimbursements, ~70 THB
   - August 2025: 194 transactions, 32 reimbursements, 82 THB
   - July 2025: 176 transactions, 26 reimbursements, ~90 THB
   - June 2025: 190 transactions, 27 reimbursements, 85 THB
   - May 2025: 174 transactions, 16 reimbursements, 89 THB
   - April 2025: 182 transactions, 22 reimbursements, 93 THB
   - March 2025: 253 transactions, 28 reimbursements, 109 THB
   - Flag significant structural differences

10. Identify anomalies (CRITICAL - LESSONS FROM MARCH):
    - **Negative amounts**: Check for $(xxx) or negative signs in expense rows (MUST convert to income)
    - **Comma-formatted amounts**: Check for amounts like "$3,490.02" (MUST handle in parser)
    - **Unusually large amounts**: Flag USD amounts >$1000 that seem abnormal for recurring expenses
    - **Currency errors**: Compare recurring expenses (rent, cleaning, utilities) to previous months
    - Missing amounts
    - Invalid dates (e.g., wrong year)
    - Unusual patterns
    - Data quality issues

Output Files:
- scripts/FEBRUARY-2025-PREFLIGHT-REPORT.md
- scripts/FEBRUARY-2025-RED-FLAGS.md (for tracking anomalies/issues for later review)

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
- Comparison to previous months
- **Negative amounts flagged** (with line numbers) - CRITICAL for March lesson
- **Comma-formatted amounts flagged** (with line numbers) - CRITICAL for March lesson
- **Currency anomalies flagged** (comparing to typical patterns)
- Red flags or structural differences
- Parsing strategy recommendations

Red Flag Log Must Include:
For EACH anomaly/issue discovered:
- Transaction details (date, description, amount, line number)
- Issue type (negative amount, comma-formatted, duplicate, currency error, etc.)
- Severity (CRITICAL / WARNING / INFO)
- Phase detected (Pre-Flight)
- Status (OPEN / RESOLVED / ACCEPTED)
- Notes/context
- **Comparison to previous months** (if applicable)

CRITICAL VERIFICATION:
- Verify PDF month matches February 2025 (MUST DO FIRST)
- Verify rent transaction should be THB 35,000.00 (NOT ~$1074)
- Verify parsing script uses Column 6 for THB amounts (or flag if needs creation)
- Verify parsing script does NOT use Column 8 (conversion column)
- **Flag ANY negative amounts for conversion to income**
- **Flag ANY comma-formatted amounts for special parsing**
- **Flag ANY unusually large recurring expense amounts**

This is critical pre-import validation - flag any anomalies before we proceed to parsing.

IMPORTANT: Create both output files (report and red flag log) with all findings. Return a summary of the key findings including any red flags that need human review before proceeding.
```

**Output**:
- `scripts/FEBRUARY-2025-PREFLIGHT-REPORT.md`
- `scripts/FEBRUARY-2025-RED-FLAGS.md`

**Human Checkpoint**: ⏸️ Review pre-flight report and red flag log, address any critical issues before Phase 2. Confirm PDF month is correct, approve parsing strategy.

---

### PHASE 2: Parse & Prepare

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Parse CSV data following FINAL_PARSING_RULES.md exactly, producing clean JSON for import with all March lessons applied.

**Prerequisites**:
- ✅ Pre-flight report reviewed and approved
- ✅ PDF verified as February 2025
- ✅ Line ranges identified
- ✅ User corrections confirmed for any red flags

**Prompt**:
```
Parse February 2025 transactions following scripts/FINAL_PARSING_RULES.md exactly, incorporating all lessons learned from March 2025.

Source: csv_imports/fullImport_20251017.csv

Line Ranges: [from pre-flight report]

**USER-CONFIRMED CORRECTIONS** (if any from Phase 1):
[List any corrections confirmed by user during pre-flight review]

Critical Requirements:

1. **Currency Handling (MOST IMPORTANT):**
   - THB transactions: Use Column 6 value (e.g., "THB 35000.00")
   - USD transactions: Use Column 7 or Column 9 (subtotal) value
   - NEVER use Column 8 (conversion column)
   - Store currency as 'THB' or 'USD' in the currency field
   - Store amount as the ORIGINAL currency amount (e.g., 35000 for THB, not 1074)

2. **CRITICAL: Negative Amount Handling (MARCH LESSON):**
   - ANY negative expense amount MUST be converted to positive income
   - This includes refunds, credits, and partial refunds
   - Implementation:
     ```javascript
     else if (amount < 0) {
       transactionType = 'income';
       amount = Math.abs(amount);
       console.log(`✓ REFUND: Converting negative expense to positive income`);
     }
     ```
   - Database constraint requires ALL amounts to be positive

3. **CRITICAL: Comma-Formatted Amount Handling (MARCH LESSON):**
   - Clean ALL currency symbols: $, commas, quotes, tabs, parentheses, spaces
   - Example: "$3,490.02" or "$ 3,490.02" → 3490.02
   - Implementation:
     ```javascript
     function parseAmount(amountStr) {
       const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
       return parseFloat(cleaned);
     }
     ```

4. Parse all 4 sections:
   - Expense Tracker (lines X-Y from pre-flight)
   - Gross Income Tracker (lines X-Y)
   - Personal Savings & Investments (lines X-Y)
   - Florida House Expenses (lines X-Y)

5. Apply tag logic:
   - "Reimbursement": description starts with "Reimbursement:" → income type + tag
   - "Florida House": from Florida House section → expense type + tag
   - "Business Expense": column 4 has "X" → expense type + tag
   - "Savings/Investment": from Savings section → expense type + tag
   - Reimbursable (column 3): NO tag, tracking only

   **CRITICAL EXCEPTIONS** (learned from April/March):
   - If description contains "Reimbursement:" BUT merchant is "DSIL Design" or "DSIL LLC":
     → This is company income, NOT a reimbursement
     → Type: income, Tags: EMPTY (no Reimbursement tag)
   - If transaction is from Florida House section BUT description contains "CNX" or "Chiang Mai":
     → This is Thailand expense, NOT Florida
     → Review with user before tagging as Florida House

6. Handle duplicates (per user decisions from pre-flight):
   - Remove duplicates between Expense Tracker and Florida House
   - Keep Expense Tracker version per FINAL_PARSING_RULES.md (unless user specifies otherwise)
   - Document which transactions were removed

7. Date conversion:
   - "Monday, February 1, 2025" → "2025-02-01"
   - "2/1/2025" → "2025-02-01"

8. Transaction structure:
   ```json
   {
     "date": "2025-02-01",
     "description": "This Month's Rent",
     "merchant": "Landlord",
     "payment_method": "Bangkok Bank Account",
     "amount": 35000,
     "currency": "THB",
     "transaction_type": "expense",
     "tags": []
   }
   ```

Expected Outputs (from pre-flight):
- Total transactions: [from pre-flight]
- Transaction types: [expenses vs income counts]
- Tag distribution:
  - Reimbursement: [count]
  - Florida House: [count]
  - Business Expense: [count]
  - Savings/Investment: [count]
- Currency split: [USD vs THB counts]
- Duplicates removed: [list]
- User corrections applied: [list]
- **Negative amounts converted**: [count]
- **Comma-formatted amounts handled**: [count]

Output Files:
1. scripts/february-2025-CORRECTED.json - Parsed transaction data
2. scripts/FEBRUARY-2025-PARSE-REPORT.md - Detailed parsing report
3. scripts/FEBRUARY-2025-RED-FLAGS.md - APPEND new issues found during parsing

Parse Report Must Include:
- Transaction counts by section
- Transaction counts by type (expense vs income)
- Tag distribution (actual counts)
- Currency distribution (USD vs THB)
- Duplicates removed (with details)
- **User corrections applied** (with before/after values)
- **Negative amounts converted** (with count and details)
- **Comma-formatted amounts handled** (with count and details)
- Expected totals from parsed data
- Date corrections applied (if any)
- Warnings or issues encountered
- Sample transactions (first 3 from each section)

Critical Verification:
- Rent transaction MUST be 35000 THB (NOT ~1074 USD)
- All THB transactions stored as THB with original amounts
- All USD transactions stored as USD with original amounts
- **NO negative amounts in output** (all converted to positive income)
- **All comma-formatted amounts parsed correctly**
- All user corrections from pre-flight applied

Red Flag Logging:
- APPEND any new parsing errors, currency issues, or anomalies to scripts/FEBRUARY-2025-RED-FLAGS.md
- Include line numbers, transaction details, and resolution status
- Flag duplicates removed for human review (mark as INFO/RESOLVED)
- Log any transactions excluded due to missing data
- **Document all negative→positive conversions as INFO/RESOLVED**
- **Document all comma-formatted amounts as INFO/RESOLVED**
- **Document all user corrections as RESOLVED** with confirmation note

IMPORTANT: Create parse-february-2025.js following scripts/parse-march-2025.js as template. Run the parsing script and create all output files (JSON, report, and updated red flag log). Return a summary showing transaction counts, rent verification, currency distribution, corrections applied, negative conversions, and ready-for-import confirmation.
```

**Output**:
- `scripts/february-2025-CORRECTED.json`
- `scripts/FEBRUARY-2025-PARSE-REPORT.md`
- `scripts/FEBRUARY-2025-RED-FLAGS.md` (updated)

**Human Checkpoint**: ⏸️ Verify rent = 35000 THB, no negative amounts, user corrections applied, review red flags, approve for import.

---

### PHASE 3: Database Import

**Execution**: Direct command (no agent needed)

**Prerequisites**:
- ✅ Parse report reviewed and approved
- ✅ Rent transaction verified as 35000 THB
- ✅ No negative amounts in JSON
- ✅ Currency split verified
- ✅ User corrections verified as applied

**Command**:
```bash
node scripts/db/import-month.js --file=scripts/february-2025-CORRECTED.json --month=2025-02
```

**What This Does**:
- Matches existing vendors (350+ in database from previous imports)
- Matches existing payment methods (40+ in database)
- Matches existing tags (Reimbursement, Florida House, Savings/Investment, Business Expense)
- Creates new vendors/payment methods only when no match found
- Skips duplicate transactions (same date + description + amount + vendor)
- Inserts transactions in batches of 50
- **CRITICAL**: Tags are applied by matching description + amount (fixed in March)
- Creates transaction_tag relationships
- Reports: new vendors, new payment methods, import counts

**Expected Output**:
```
📥 INCREMENTAL MONTH IMPORT
==================================================
Target Month: 2025-02
Data File: scripts/february-2025-CORRECTED.json
User: dennis@dsil.design

📊 Loaded XXX transactions from file

👤 User ID: [uuid]

🔍 Found 0 existing transactions in 2025-02
✅ No existing transactions - proceeding with clean import.

🔄 Processing X batches of 50 transactions...

   Batch 1/X: Processing 50 transactions...
   ✅ Imported 50 transactions
   [...]

==================================================
📋 IMPORT SUMMARY
==================================================
Total Transactions: XXX imported, 0 skipped (duplicates)
Transaction Types: XXX expenses, XX income
New Vendors: X
New Payment Methods: X
New Tags: X (should be 0 - all tags exist)
==================================================
✅ Import complete!
```

**CRITICAL: Verify Tags Were Applied (MARCH LESSON)**

After import completes, immediately run tag verification:

```bash
node scripts/check-february-tags.js
```

Create this script (copy from `check-march-tags.js`):
```javascript
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTags() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const { data: tags } = await supabase
    .from('transactions')
    .select(`
      id,
      transaction_tags (
        tags (name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-02-01')
    .lte('transaction_date', '2025-02-28');

  const tagCounts = {};
  let totalWithTags = 0;

  tags.forEach(t => {
    if (t.transaction_tags && t.transaction_tags.length > 0) {
      totalWithTags++;
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags.name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('✅ Tag Distribution:', JSON.stringify(tagCounts, null, 2));
  console.log(`\n📊 Total transactions with tags: ${totalWithTags}`);
  console.log(`📊 Expected: [from parse report]`);

  if (totalWithTags > 0) {
    console.log('\n✅ SUCCESS: Tags were applied!');
  } else {
    console.log('\n❌ FAILURE: NO TAGS APPLIED - Import script issue detected!');
    console.log('Need to delete February data and re-import with fixed script.');
  }
}

checkTags().catch(console.error);
```

**If Tags NOT Applied (MARCH LESSON)**:
1. Create cleanup script: `scripts/cleanup-february-2025.js` (use March's as template)
2. Run cleanup to delete February 2025 transactions
3. Verify import script fix is still in place
4. Re-run import
5. Re-verify tags

**If Import Fails** (learned from March):
- **Error: "positive_amount" constraint violation**:
  → A negative amount got through parsing
  → Delete partial import
  → Fix parsing script to convert negatives to income
  → Re-parse and re-import

- **Error: Other database constraint**:
  → Review error message for details
  → Clean up partial import
  → Fix issue in parsing script or data
  → Re-parse and re-import

**Red Flag Logging**:
- If import reveals issues, APPEND to scripts/FEBRUARY-2025-RED-FLAGS.md
- Document any new vendors/payment methods created for review
- Flag any transactions that were skipped as duplicates for verification
- **Document tag verification results**

**Human Checkpoint**: ⏸️ Verify import summary matches parse report counts, verify tags were applied, review any new red flags.

---

### PHASE 4: Comprehensive Validation (100% Coverage)

**Agent**: Task tool → subagent_type=data-scientist

**Objective**: Validate imported data against PDF source of truth using comprehensive multi-level verification with 100% transaction coverage.

**Prerequisites**:
- ✅ Database import completed
- ✅ Import summary reviewed
- ✅ Tags verified as applied

**Prompt**:
```
Validate February 2025 import against PDF source of truth using comprehensive multi-level validation with 100% coverage.

Source Documents:
- PDF: csv_imports/Master Reference PDFs/Budget for Import-page9.pdf
- Parse Report: scripts/FEBRUARY-2025-PARSE-REPORT.md
- Database: Supabase (use environment variables from .env.local)
- User: dennis@dsil.design

Exchange Rate (from PDF rent transaction):
- February: This Month's Rent = THB 35,000.00 = $XXXX (extract from PDF)
- Rate: Calculate from rent transaction (use for all USD conversions in validation)

Validation Levels:

LEVEL 1: Section Grand Totals

- Query Expense Tracker transactions (expenses + reimbursements, exclude Florida House, exclude Savings, exclude non-reimbursement income)
- Convert THB to USD using calculated rate
- Calculate grand total
- Compare to PDF Expense Tracker GRAND TOTAL: $[from PDF]
- Acceptance: ±2% variance OR ±$150 absolute

- Query Florida House tagged transactions
- Convert and total
- Compare to PDF Florida House GRAND TOTAL: $[from PDF]
- Account for any user-confirmed duplicate removals
- Acceptance: Exact match or ±$5 (or expected variance from duplicate removal)

- Query Savings/Investment tagged transactions
- Convert and total
- Compare to PDF Savings GRAND TOTAL: $[from PDF]
- Acceptance: Exact match

- Query Gross Income (exclude reimbursements)
- Convert and total
- Compare to PDF Gross Income GRAND TOTAL: $[from PDF]
- Acceptance: Exact match

LEVEL 2: Daily Subtotals (Expense Tracker)

- Query daily totals from Expense Tracker section (February 1-28, 2025)
- Compare each day to PDF "Daily Total" rows
- Create comparison table:
  | Date | DB Total | PDF Total | Difference | Status |
- Track: days within $1.00, days within $5.00, days >$5.00
- Acceptance: ≥50% of days within $1.00, no day >$100 variance

LEVEL 3: Transaction Count Verification

- Count total transactions in database for February 2025
- Compare to import summary: XXX imported
- Break down by type: expense vs income
- Break down by currency: USD vs THB
- Break down by section/tag
- Acceptance: Exact match to import summary

LEVEL 4: Tag Distribution Verification

- Count each tag in database:
  - Reimbursement: expected [from parse report]
  - Florida House: expected [from parse report]
  - Business Expense: expected [from parse report]
  - Savings/Investment: expected [from parse report]
- Compare to parse report expected counts
- **CRITICAL**: If counts are 0, flag as CRITICAL ERROR (March lesson)
- Acceptance: Exact match

LEVEL 5: Critical Transaction Spot Checks

- Verify rent transaction:
  - Description: "This Month's Rent"
  - Amount: 35000
  - Currency: THB
  - Date: 2025-02-XX (find in PDF)
- Verify any user-corrected transactions (from pre-flight/parsing phases)
- Verify any comma-formatted amounts parsed correctly
- Verify refunds converted to income (if any)
- Verify largest THB transaction
- Verify largest USD transaction
- Verify first and last transaction of month
- Acceptance: All match PDF

LEVEL 6: 100% Comprehensive 1:1 PDF Verification

**CRITICAL REQUIREMENT**: Verify EVERY transaction in both directions (PDF→DB and DB→PDF).

Task 6.1: PDF → Database Verification (100% Coverage)

For EACH section in the PDF:
1. Extract ALL transaction rows (ignore headers/totals/summaries)
2. For EVERY transaction, search for match in database:
   - Date: exact match
   - Description: fuzzy match ≥80% similarity acceptable
   - Amount: within $0.10 tolerance
   - Currency: exact match (THB or USD)
3. Create complete verification table showing ALL transactions

Items to IGNORE from PDF:
- Section header rows
- Column header rows
- Daily total summary rows
- Grand total rows
- Blank/separator rows
- Date-only rows (calendar markers)

Track statistics:
- Total PDF transaction rows
- Found in DB (with percentage)
- Not found (list EVERY missing transaction)
- Amount mismatches >$0.10 (list EVERY mismatch)
- Currency mismatches

Task 6.2: Database → PDF Verification (100% Coverage)

1. Query ALL February 2025 transactions from database
2. For EVERY database transaction:
   - Which section should it be in based on tags/type?
   - Is it present in that section?
   - Do amounts and currency match?
3. Create complete verification table

Track statistics:
- Total DB transactions
- Found in PDF (with percentage)
- Not found (list EVERY extra transaction)
- Amount mismatches

Task 6.3: Discrepancy Analysis

For EVERY discrepancy found:
1. Document in detail
2. Root cause analysis
3. Classify: CRITICAL / WARNING / ACCEPTABLE

**USER-CONFIRMED CORRECTIONS TO ACCOUNT FOR**:
[List from parsing phase]

Output Files:
1. scripts/FEBRUARY-2025-VALIDATION-REPORT.md - Executive summary and all validation levels
2. scripts/FEBRUARY-2025-COMPREHENSIVE-VALIDATION.md - Complete 1:1 verification tables
3. scripts/FEBRUARY-2025-RED-FLAGS.md - APPEND all discrepancies found during validation

Report Structure:
1. Executive Summary
2. Level 1: Section Grand Totals
3. Level 2: Daily Subtotals Analysis
4. Level 3: Transaction Count Verification
5. Level 4: Tag Distribution
6. Level 5: Critical Transactions
7. Level 6: 100% Comprehensive 1:1 Verification
8. Final Recommendation

Acceptance Criteria (Overall):
- Level 1: All sections within variance thresholds
- Level 2: ≥50% daily match rate within $1.00, no day >$100 variance
- Level 3: Exact transaction count match
- Level 4: Exact tag distribution match (>0 tags, not 0!)
- Level 5: All critical transactions verified
- Level 6: 100% of PDF transactions found in DB, 100% of DB transactions found in PDF

IMPORTANT: Create all 3 output files and return a comprehensive executive summary with pass/fail recommendation.
```

**Output**:
- `scripts/FEBRUARY-2025-VALIDATION-REPORT.md`
- `scripts/FEBRUARY-2025-COMPREHENSIVE-VALIDATION.md`
- `scripts/FEBRUARY-2025-RED-FLAGS.md` (final update with all issues)

**Human Checkpoint**: ⏸️ Review validation report and complete red flag log, accept/reject import based on results. If tag fixes needed, proceed to Phase 4.5.

---

### PHASE 4.5: Post-Validation Tag Fixes (If Needed)

**Context**: Based on April 2025 experience, tag fixes may be needed after validation. This phase is OPTIONAL and only executed if validation reveals tag count mismatches.

**When to Execute**:
- Level 4 validation fails (tag distribution doesn't match expected)
- Validation report identifies specific missing or incorrect tags

**Process** (refer to MARCH-2025-IMPORT-PROTOCOL.md for detailed steps if needed):
1. Run diagnostic to find missing tags
2. Human review of findings
3. Apply fixes
4. Re-validate
5. Update red flag log

---

## 📊 Expected Results for February 2025

### From Previous Month Patterns:
- **Transactions**: ~170-190 (typical range, March was 253 due to travel)
- **Currency Split**: ~45-50% USD, ~50-55% THB
- **Tag Breakdown**:
  - Reimbursements: ~16-28 (varies by month)
  - Florida House: ~4-6
  - Business Expense: ~0-2
  - Savings/Investment: ~0-1

### Critical Transaction:
- **Rent**: THB 35,000.00 on February 1 or 5 (MUST verify)

### Expected Section Totals (from PDF page 9):
- Expense Tracker NET: $[extract from PDF]
- Gross Income: $[extract from PDF]
- Savings/Investment: $[extract from PDF]
- Florida House: $[extract from PDF]

---

## ✅ Success Criteria

### Must Pass (All Required):
- ✅ Pre-flight analysis completed with no critical blockers
- ✅ PDF verified as February 2025 (STEP 0)
- ✅ Parsing script created with March lessons (negative conversion, comma handling)
- ✅ Rent transaction = 35,000 THB (NOT ~$1074)
- ✅ All transactions stored in original currency (THB or USD)
- ✅ **NO negative amounts in database** (all converted to positive income)
- ✅ **All comma-formatted amounts parsed correctly**
- ✅ All user corrections applied (if any)
- ✅ Import completes without errors
- ✅ **Tags verified as applied** (>0 count, not 0)
- ✅ Transaction count matches parse report
- ✅ Tag distribution matches parse report
- ✅ Expense Tracker grand total within 2% of PDF
- ✅ Florida House exact match or within $5 (account for user decisions)
- ✅ All section grand totals within acceptable variance
- ✅ No daily variance >$100
- ✅ 100% of PDF transactions found in database
- ✅ 100% of database transactions found in PDF
- ✅ Critical transactions verified against PDF

### Should Pass (Expected):
- ⚠️ ≥50% of daily totals within $1.00
- ✅ All daily totals within $5.00 (acceptable if failed)
- ✅ 100% PDF-DB bidirectional match
- ✅ Minimal new vendors/payment methods (most should match existing)
- ✅ Overall variance <2%

---

## 🚨 Red Flags - Stop and Investigate

### Parsing Issues:
- ❌ Rent transaction ≠ 35000 THB
- ❌ Currency field shows "USD" for Thai rent
- ❌ Amount shows ~1078 instead of 35000
- ❌ THB transactions stored as USD amounts
- ❌ Conversion column (column 8) being used
- ❌ **Any negative amounts in JSON output** (CRITICAL - March lesson)
- ❌ **Comma-formatted amounts not parsed** (CRITICAL - March lesson)

### Import Issues:
- ❌ Transaction count doesn't match parse report
- ❌ Large number of duplicates skipped unexpectedly
- ❌ **Tags count = 0** (CRITICAL - March lesson)
- ❌ Tags not applied correctly
- ❌ New tags created (all should exist from previous imports)
- ❌ Database constraint violation (negative amounts)

### Validation Issues:
- ❌ Variance >5% on any section grand total
- ❌ Daily variance >$100 on any day
- ❌ Transaction count mismatch
- ❌ **Tag count = 0 or mismatch** (CRITICAL - March lesson)
- ❌ Critical transactions not found in database
- ❌ Any PDF transaction not found in database
- ❌ Any database transaction not found in PDF

---

## 🔄 Recovery Procedures

### If Tags Not Applied (MARCH LESSON):
1. **IMMEDIATELY** create cleanup script: `scripts/cleanup-february-2025.js`
2. Run cleanup to delete February 2025 transactions
3. Verify import script fix is in place (`/scripts/db/import-month.js` line 357, 370-373)
4. Re-run import from Phase 3
5. Re-verify tags with check script
6. If still fails, investigate import script further

### If Negative Amounts Cause Error (MARCH LESSON):
1. Create cleanup script
2. Run cleanup to delete February 2025 transactions
3. Fix parsing script to convert ALL negative expenses to positive income
4. Re-run from Phase 2 (parsing)
5. Verify no negative amounts in JSON
6. Re-import to database

### If Comma-Formatted Amounts Wrong (MARCH LESSON):
1. Create cleanup script
2. Run cleanup
3. Fix parsing script `parseAmount()` function
4. Re-run from Phase 2
5. Verify comma amounts parsed correctly
6. Re-import

### Other Issues (General):
- **Parsing error** → fix script, re-parse, re-import
- **Import error** → delete and re-import
- **Tag issues** → proceed to Phase 4.5 (post-validation tag fixes)
- **PDF vs CSV mismatch** → document and accept if minor

---

## 📝 Comprehensive Lessons Learned

### From March 2025 (Most Recent):
1. ✅ **Import script tag matching bug** - Fixed (matches by description + amount)
2. ✅ **Negative amounts cause database errors** - Parser converts to positive income
3. ✅ **Comma-formatted amounts** - Parser cleans $, commas, quotes, tabs
4. ✅ **Tag verification critical** - Always check after import
5. ✅ **Recovery procedure** - Cleanup script + re-import pattern

### From April 2025:
1. ✅ Pre-flight catches data issues (negative amounts, currency errors)
2. ✅ Post-import tag fixes may be needed (DSIL income, CNX utilities)
3. ✅ User decisions on duplicates (keep which version?)

### From May-September 2025:
1. ✅ 4-Phase protocol with human checkpoints
2. ✅ Store original currency values (not conversions)
3. ✅ 100% bidirectional PDF verification
4. ✅ Red flag logging for comprehensive issue tracking
5. ✅ Daily match rate of 50-60% acceptable if variances <$100

### Key Metrics:
- **Pre-Flight Time**: 10-15 minutes
- **Parsing Time**: 10-15 minutes (including user review)
- **Import Time**: 2-3 minutes
- **Tag Verification**: 1 minute
- **Validation Time**: 15-20 minutes
- **Tag Fixes Time** (if needed): 10-15 minutes
- **Total Time**: 40-70 minutes

---

## 🚀 Ready to Execute

**Current Status**: ✅ Ready to begin Phase 1 (Pre-Flight Analysis) for February 2025

**Next Action**: Launch data-engineer agent with Phase 1 prompt

**Expected Timeline**:
- Phase 1: 10-15 minutes
- Human Review: 5 minutes
- Phase 2: 10-15 minutes
- Human Review: 5 minutes
- Phase 3: 2-3 minutes + Tag Verification: 1 minute
- Human Review: 2 minutes
- Phase 4: 15-20 minutes
- Tag Fixes (if needed): 10-15 minutes
- Human Review: 5 minutes

**Total**: 50-80 minutes

---

**Protocol Version**: 3.2 (Tag Import Fix + Refund Conversion + Comma Handling + March Learnings)
**Last Updated**: October 24, 2025 (after March 2025 completion)
**Created By**: Human + Claude Code collaboration
**Status**: APPROVED FOR PRODUCTION USE

---

## 📋 Quick Reference Card

**CSV Columns**:
- Column 3: Reimbursable flag (X) - tracking only, NO tag
- Column 4: Business expense flag (X) - add Business Expense tag
- Column 6: THB amount (e.g., "THB 35000.00") ← **USE THIS**
- Column 7: USD amount (for expenses)
- Column 8: **CONVERSION - NEVER USE**
- Column 9: USD subtotal (use if Column 7 empty)

**Tag Logic**:
```
Reimbursement:
  ✅ Income + "Reimbursement:" prefix
  ❌ UNLESS merchant is DSIL Design/LLC

Florida House:
  ✅ Expense + from Florida House section
  ❌ UNLESS contains CNX/Chiang Mai

Business Expense:
  ✅ Expense + Column 4 has "X"

Savings/Investment:
  ✅ Expense + from Savings section
```

**Exchange Rate Calculation**:
```
Find rent in PDF: THB 35,000 = $X
Rate = X / 35000
Use this rate for ALL THB→USD conversions
```

**File Locations**:
- PDF: `csv_imports/Master Reference PDFs/Budget for Import-page9.pdf` (February 2025)
- CSV: `csv_imports/fullImport_20251017.csv`
- Rules: `scripts/FINAL_PARSING_RULES.md`
- Template: `scripts/parse-march-2025.js` (includes all fixes)
- PDF Mapping: `PDF-MONTH-MAPPING.md` (page number reference)

**Human Checkpoints** (⏸️ = STOP):
1. ⏸️ After Pre-Flight: Review red flags, confirm PDF month, confirm corrections
2. ⏸️ After Parsing: Verify rent=35000 THB, no negatives, corrections applied
3. ⏸️ After Import: Verify counts match, **VERIFY TAGS APPLIED**
4. ⏸️ After Validation: Review full report, accept/reject
5. ⏸️ After Tag Fixes (if needed): Verify all sections pass

**Critical Verifications** (March Lessons):
- ✅ PDF month is February 2025 (STEP 0)
- ✅ NO negative amounts in parsed JSON
- ✅ Comma-formatted amounts parsed correctly
- ✅ Tags applied after import (count > 0, not 0)
- ✅ Rent = 35,000 THB

---

Ready to begin? Copy the Phase 1 prompt above and launch the data-engineer agent to start the February 2025 import process.
