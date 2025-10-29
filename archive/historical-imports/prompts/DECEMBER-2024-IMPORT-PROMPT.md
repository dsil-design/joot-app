# Monthly Transaction Import Protocol - December 2024

🎯 **Mission**: Import December 2024 historical transaction data using the established 4-Phase Import Protocol v3.4 with 100% comprehensive validation and red flag logging.

---

## 📚 Knowledge Base - Current Status

### Completed Imports:
1. ✅ **September 2025**: 159 transactions, variance -2.24%
2. ✅ **August 2025**: 194 transactions, variance +2.24%
3. ✅ **July 2025**: 177 transactions, variance 1.7%
4. ✅ **June 2025**: 190 transactions, variance +3.18%, 100% verified
5. ✅ **May 2025**: 174 transactions, variance 0.29%, 100% verified with red flag logging
6. ✅ **April 2025**: 182 transactions, 3 user corrections, 8 tag fixes
7. ✅ **March 2025**: 253 transactions, 2 user corrections, tag import fixed, 34 tags applied
8. ✅ **February 2025**: 211 transactions, 99.55% accuracy, 3 typo reimbursements, Florida House date fix
9. ✅ **January 2025**: 195 transactions, 100% validation pass, apartment move (2 rents), income adjustment handling
10. ✅ **October 2025**: 119 transactions

### Current Database State (dennis@dsil.design):
- **Total transactions**: ~1,854 (Oct + Sept + Aug + July + June + May + April + March + Feb + Jan 2025)
- **Vendors**: 400+ (existing from 10 months of 2025 imports)
- **Payment methods**: 46+ (existing from 10 months of 2025 imports)
- **Tags**: Reimbursement, Florida House, Savings/Investment, Business Expense

### Next Target: **December 2024** (FIRST 2024 MONTH - Going backwards from 2025)

### Critical Context:
- **Protocol Version**: 3.4
- **December 2024 is FIRST 2024 MONTH** - going backwards from 2025 imports
- **Most vendors/payment methods should match** - existing from 10 months of 2025 data
- **Key Parsing Requirements**:
  - Convert negative expenses to positive income (database constraint)
  - Handle comma-formatted amounts
  - Flexible reimbursement detection: `/^Re(im|mi|m)?burs[e]?ment:/i`
  - Default Florida House dates to 2024-12-31 if missing
  - Preserve ALL original descriptions (user preference)
  - Column 3 = Reimbursable (tracking only, NO TAG)
  - Column 4 = Business Expense (apply tag)
  - DSIL Design/LLC reimbursements = company income (NO TAG)

---

## 📁 Reference Files for December 2024

### Primary Sources
- **PDF**: `/csv_imports/Master Reference PDFs/Budget for Import-page11.pdf` (December 2024)
  - **Page Number Calculation**: October 2025 = page1, December 2024 = page11 (10 months back)
  - **Reference**: See `PDF-MONTH-MAPPING.md` for complete page number pattern
  - Source of truth for validation
  - Contains 4 sections with grand totals
  - Use for 1:1 transaction verification
  - **⚠️ CRITICAL PDF VERIFICATION STEP**:
    - **ALWAYS verify the PDF contains the correct month BEFORE starting analysis**
    - Check first transaction date in PDF (e.g., "Sunday, December 1, 2024" or "Monday, December 2, 2024")
    - If PDF shows ANY other month, STOP immediately
    - Report: "PDF verification failed - file contains [MONTH] data, not December 2024"
    - Expected PDF based on pattern: page11 (10 months back from October 2025)
    - If verification fails, consult `PDF-MONTH-MAPPING.md` or ask user for correct path

- **CSV**: `/csv_imports/fullImport_20251017.csv`
  - Lines: TBD (to be identified in pre-flight)
  - Expected: BEFORE January 2025's lines (2753-3040)
  - Pattern suggests: ~1200-1400 range (estimate)

- **Parsing Script**: `/scripts/parse-december-2024.js`
  - **STATUS**: Does NOT exist - will need to be created
  - **MUST** use Column 6 for THB amounts (NOT conversion column)
  - **MUST** use Column 7/9 for USD amounts (NOT conversion column)
  - **MUST** handle comma-formatted amounts (learned from March)
  - **MUST** convert negative expenses to positive income (learned from March)
  - **MUST** use flexible regex for typo reimbursements: `/^Re(im|mi|m)?burs[e]?ment:/i` (learned from February)
  - **MUST** default Florida House dates to 2024-12-31 if missing (learned from February)
  - **MUST** handle special transactions with user consultation (learned from January)
  - Use `parse-january-2025.js` or `parse-february-2025.js` as template

- **Import Script**: `/scripts/db/import-month.js`
  - ✅ Verified working from all previous imports
  - ✅ Tag matching bug fixed in March (matches by description + amount)
  - ⚠️ "New Tags" reporting is misleading - verify actual tag mapping after import

### Supporting Documents
- `scripts/FINAL_PARSING_RULES.md` - Complete parsing specification
- `PDF-MONTH-MAPPING.md` - PDF page number reference
- `JANUARY-2025-IMPORT-PROMPT.md` - Most recent import with all lessons
- `FEBRUARY-2025-IMPORT-PROTOCOL.md` - Typo reimbursements and Florida House fixes
- `MARCH-2025-IMPORT-PROTOCOL.md` - Tag fix lessons and negative amount handling
- `scripts/JANUARY-2025-RED-FLAGS.md` - Recent red flag examples with special transactions

---

## 🚨 CRITICAL REQUIREMENTS FOR DECEMBER 2024 (FIRST IMPORT)

### Key Parsing Requirements:

**Issue #1: Negative Amount Handling**
- **Requirement**: ALL negative expenses must be converted to positive income
- **Reason**: Database constraint requires positive amounts only
- **Examples**: Refunds, credits, compensation, trade-ins
- **Implementation**: Parser must detect negative values and convert to positive income type

**Issue #2: Comma-Formatted Amounts**
- **Requirement**: Clean ALL currency symbols: $, commas, quotes, tabs, parentheses
- **Examples**: "$3,490.02" → 3490.02, "$1,000.00" → 1000.00
- **Implementation**: Parser must strip formatting before parsing amounts

**Issue #3: Reimbursement Detection**
- **Requirement**: Flexible regex pattern to match typo variants
- **Pattern**: `/^Re(im|mi|m)?burs[e]?ment:/i` (colon optional)
- **Exclusion**: DSIL Design/LLC reimbursements are company income (NO TAG)
- **Variants**: "Reimbursement:", "Remibursement:", "Rembursement:", "Reimbursment:"

**Issue #4: Florida House Date Handling**
- **Requirement**: Default to 2024-12-31 if dates missing in CSV
- **Reason**: Database constraint requires non-null transaction_date
- **Impact**: Florida House section may have empty date column

**Issue #5: Column Distinction (CRITICAL)**
- **Column 3**: Reimbursable flag (X) = tracking only, NO TAG
- **Column 4**: Business Expense flag (X) = apply Business Expense tag
- **Common Error**: Confusing Column 3 with Column 4 leads to incorrect tag counts

**Issue #6: Description Preservation**
- **Requirement**: Preserve ALL original descriptions exactly as written
- **Reason**: User preference - no rewrites unless obvious typos
- **Examples**: Keep bulk purchase descriptions, intentional formatting

### Key Validation Requirements:

**Issue #7: Tag Verification (TWO-STEP PROCESS)**
- **Step 1**: Verify tags were applied (count > 0, not 0)
- **Step 2**: Verify tags mapped to existing IDs (not duplicates)
- **Critical**: Import script may have edge cases requiring manual tag fixes

**Issue #8: Expected Tag IDs**
- Reimbursement: `205d99a2-cf0a-44e0-92f3-e2b9eae1bf72`
- Florida House: `178739fd-1712-4356-b21a-8936b6d0a461`
- Business Expense: `973433bd-bf9f-469f-9b9f-20128def8726`
- Savings/Investment: `c0928dfe-1544-4569-bbad-77fea7d7e5aa`

### Key Takeaways for December 2024:
- Pre-flight MUST flag: Negative amounts, comma-formatted amounts, duplicates, unusual transactions
- Parsing MUST handle: Negative→positive conversion, comma cleaning, Florida House date defaults, description preservation
- Import MUST verify: Tags applied correctly, tag IDs match existing records
- Validation MUST check: Tag distribution, currency split, critical transactions
- **User consultation**: For ambiguous or unusual transactions

---

## 🔧 4-Phase Import Process

### PHASE 1: Pre-Flight Analysis

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Analyze CSV and PDF to understand data structure, identify issues, and set expectations BEFORE parsing.

**Prompt**:
```
Analyze December 2024 data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page11.pdf using scripts/FINAL_PARSING_RULES.md.

**STEP 0 - CRITICAL PDF VERIFICATION (DO THIS FIRST)**:
Before starting any analysis, you MUST verify the PDF contains December 2024 data:
1. Read: csv_imports/Master Reference PDFs/Budget for Import-page11.pdf
2. Find the first transaction date in the "Expense Tracker" section
3. Verify it shows "December 2024" (e.g., "Sunday, December 1, 2024" or "Monday, December 2, 2024")
4. If PDF shows ANY other month (e.g., May 2025, February 2025), STOP IMMEDIATELY
5. Report to user: "PDF verification failed - Budget for Import-page11.pdf contains [ACTUAL MONTH] data, not December 2024"
6. Note: Expected page number is 11 (October 2025 = page1, December 2024 = 10 months back = page11)
7. Consult PDF-MONTH-MAPPING.md or ask user for correct path before continuing

Only proceed with tasks 1-10 below if Step 0 passes (PDF contains December 2024 data).

Tasks:
1. Find line numbers for all 4 sections in CSV:
   - Expense Tracker
   - Gross Income Tracker
   - Personal Savings & Investments
   - Florida House Expenses
   NOTE: December 2024 should be BEFORE January 2025 (lines 2753-3040) in the CSV.

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
   - Reimbursements: description starts with "Reimbursement:" OR typo variants OR just "Reimbursement" (learned from January/February)
   - Business Expenses: column 4 has "X" (expense with tag)
   - Reimbursables: column 3 has "X" (tracking only, NO tag)
   - Florida House: from Florida House section (expense with tag)
   - Savings/Investment: from Savings section (expense with tag)

7. Identify currency distribution:
   - USD transactions (column 7/9 has value, column 6 no THB)
   - THB transactions (column 6 has "THB XXX")
   - Mixed/other patterns

8. Verify parsing script correctness:
   - Check if scripts/parse-december-2024.js exists
   - If NOT exists: flag that script needs to be created following parse-january-2025.js pattern
   - If exists: verify it uses Column 6 for THB (NOT Column 8 conversion)
   - If exists: verify it handles negative amounts (converts to positive income)
   - If exists: verify it handles comma-formatted amounts
   - If exists: verify it has typo reimbursement regex (learned from February)
   - If exists: verify it defaults Florida House dates to 2024-12-31 (learned from February)

9. Compare to 2025 months:
   - January 2025: 195 transactions, 15 reimbursements, 103 THB (53%)
   - February 2025: 211 transactions, 19 reimbursements, 144 THB (69.2%)
   - March 2025: 253 transactions, 28 reimbursements, 109 THB
   - April 2025: 182 transactions, 22 reimbursements, 93 THB
   - May 2025: 174 transactions, 16 reimbursements, 89 THB
   - June 2025: 190 transactions, 27 reimbursements, 85 THB
   - July 2025: 177 transactions, 26 reimbursements, ~90 THB
   - August 2025: 194 transactions, 32 reimbursements, 82 THB
   - September 2025: 159 transactions, 23 reimbursements, ~70 THB
   - October 2025: 119 transactions
   - Flag significant structural differences
   - NOTE: December 2024 is earliest month chronologically - may have different patterns

10. Identify anomalies (CRITICAL - LESSONS FROM ALL PREVIOUS MONTHS):
    - **Negative amounts**: Check for $(xxx) or negative signs in expense rows (MUST convert to income)
    - **Comma-formatted amounts**: Check for amounts like "$3,490.02" (MUST handle in parser)
    - **Typo reimbursements**: Check for "Remibursement", "Rembursement", "Reimbursment" variants (learned from February)
    - **Unusual transactions**: Multiple rents, income adjustments, large one-time expenses (learned from January)
    - **Unusually large amounts**: Flag USD amounts >$1000 that seem abnormal for recurring expenses
    - **Currency errors**: Compare recurring expenses (rent, cleaning, utilities) to later months
    - **Missing dates in Florida House**: Check if Florida House section has dates (learned from February)
    - Missing amounts
    - Invalid dates (e.g., wrong year)
    - Unusual patterns
    - Data quality issues

Output Files:
- scripts/DECEMBER-2024-PREFLIGHT-REPORT.md
- scripts/DECEMBER-2024-RED-FLAGS.md (for tracking anomalies/issues for later review)

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
- **Negative amounts flagged** (with line numbers) - CRITICAL
- **Comma-formatted amounts flagged** (with line numbers) - CRITICAL
- **Typo reimbursements flagged** (with line numbers) - CRITICAL
- **Unusual transactions flagged** (with line numbers) - CRITICAL for user consultation
- **Missing dates in Florida House flagged** - CRITICAL
- **Currency anomalies flagged** (comparing to typical patterns)
- Red flags or structural differences
- Parsing strategy recommendations

Red Flag Log Must Include:
For EACH anomaly/issue discovered:
- Transaction details (date, description, amount, line number)
- Issue type (negative amount, comma-formatted, duplicate, currency error, typo reimbursement, missing date, unusual transaction, etc.)
- Severity (CRITICAL / WARNING / INFO)
- Phase detected (Pre-Flight)
- Status (OPEN / RESOLVED / ACCEPTED)
- Notes/context
- **Comparison to previous months** (if applicable)
- **User consultation needed** (YES / NO)

CRITICAL VERIFICATION:
- Verify PDF month matches December 2024 (MUST DO FIRST)
- Verify rent transaction should be THB 25,000-35,000 (or flag if different pattern)
- Verify parsing script uses Column 6 for THB amounts (or flag if needs creation)
- Verify parsing script does NOT use Column 8 (conversion column)
- **Flag ANY negative amounts for conversion to income**
- **Flag ANY comma-formatted amounts for special parsing**
- **Flag ANY typo reimbursements for regex detection**
- **Flag ANY unusual transactions for user consultation**
- **Flag ANY missing dates in Florida House section**
- **Flag ANY currency anomalies**

This is critical pre-import validation - flag any anomalies before we proceed to parsing.

IMPORTANT: Create both output files (report and red flag log) with all findings. Return a summary of the key findings including any red flags that need human review before proceeding, especially any unusual transactions that require user consultation.
```

**Output**:
- `scripts/DECEMBER-2024-PREFLIGHT-REPORT.md`
- `scripts/DECEMBER-2024-RED-FLAGS.md`

**Human Checkpoint**: ⏸️ Review pre-flight report and red flag log, address any critical issues before Phase 2. **Confirm PDF month is correct, provide guidance on unusual transactions, approve parsing strategy.**

---

### PHASE 2: Parse & Prepare

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Parse CSV data following FINAL_PARSING_RULES.md exactly, producing clean JSON for import with all lessons applied.

**Prerequisites**:
- ✅ Pre-flight report reviewed and approved
- ✅ PDF verified as December 2024
- ✅ Line ranges identified
- ✅ **User guidance provided for any unusual transactions**
- ✅ User corrections confirmed for any red flags

**Prompt**:
```
Parse December 2024 transactions following scripts/FINAL_PARSING_RULES.md exactly, incorporating all lessons learned from January, February, and March 2025.

Source: csv_imports/fullImport_20251017.csv
Line Ranges: [from pre-flight report]

**USER-CONFIRMED CORRECTIONS** (if any from Phase 1):
[List any corrections confirmed by user during pre-flight review]

**USER GUIDANCE FOR SPECIAL TRANSACTIONS** (if any from Phase 1):
[List any special handling instructions provided by user]

Critical Requirements:

1. **Currency Handling (MOST IMPORTANT):**
   - THB transactions: Use Column 6 value (e.g., "THB 25000.00")
   - USD transactions: Use Column 7 or Column 9 (subtotal) value
   - NEVER use Column 8 (conversion column)
   - Store currency as 'THB' or 'USD' in the currency field
   - Store amount as the ORIGINAL currency amount (e.g., 25000 for THB, not 735)

2. **CRITICAL: Negative Amount Handling (MARCH LESSON):**
   - ANY negative expense amount MUST be converted to positive income
   - This includes refunds, credits, partial refunds, and winnings
   - **EXCEPTION**: If user provided specific guidance for special transactions (e.g., income adjustments), follow that guidance
   - Implementation:
     ```javascript
     // Check for user-specified special transaction handling first
     if ([user-specified conditions]) {
       // Follow user guidance
     }
     else if (amount < 0) {
       transactionType = 'income';
       amount = Math.abs(amount);
       console.log(`✓ REFUND/INCOME: Converting negative expense to positive income`);
     }
     ```
   - Database constraint requires ALL amounts to be positive

3. **CRITICAL: Comma-Formatted Amount Handling (MARCH LESSON):**
   - Clean ALL currency symbols: $, commas, quotes, tabs, parentheses, spaces
   - Example: "$3,490.02" or "$ 3,490.02" or "$1,000.00" → 3490.02 or 1000.00
   - Implementation:
     ```javascript
     function parseAmount(amountStr) {
       const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
       return parseFloat(cleaned);
     }
     ```

4. **CRITICAL: Reimbursement Detection (JANUARY/FEBRUARY LESSON):**
   - Standard: description starts with "Reimbursement:" or just "Reimbursement"
   - Also detect typo variants: "Remibursement:", "Rembursement:", "Reimbursment:"
   - Implementation:
     ```javascript
     const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());
     ```

5. **CRITICAL: Florida House Date Handling (FEBRUARY LESSON):**
   - Florida House section may have missing dates in CSV
   - Default to last day of month if no date found: '2024-12-31'
   - Implementation:
     ```javascript
     // Section 4: Florida House Expenses
     console.log('\nParsing Florida House Expenses...');
     // Default to last day of month for Florida House transactions without specific dates
     currentDate = '2024-12-31';
     ```

6. Parse all 4 sections:
   - Expense Tracker (lines X-Y from pre-flight)
   - Gross Income Tracker (lines X-Y)
   - Personal Savings & Investments (lines X-Y)
   - Florida House Expenses (lines X-Y)

7. Apply tag logic:
   - "Reimbursement": description matches `/^Re(im|mi|m)?burs[e]?ment:?/i` → income type + tag
     - ❌ UNLESS merchant is "DSIL Design" or "DSIL LLC" (company income, no tag)
   - "Florida House": from Florida House section → expense type + tag
     - ❌ UNLESS description contains "CNX" or "Chiang Mai" (Thailand expense, review with user)
   - "Business Expense": column 4 has "X" → expense type + tag
   - "Savings/Investment": from Savings section → expense type + tag

8. Handle duplicates (per user decisions from pre-flight):
   - Remove duplicates between Expense Tracker and Florida House
   - Keep Expense Tracker version per FINAL_PARSING_RULES.md (unless user specifies otherwise)
   - Document which transactions were removed

9. Date conversion:
   - "Sunday, December 1, 2024" → "2024-12-01"
   - "12/1/2024" → "2024-12-01"

10. Transaction structure:
   ```json
   {
     "date": "2024-12-01",
     "description": "This Month's Rent",
     "merchant": "Landlord",
     "payment_method": "Bangkok Bank Account",
     "amount": 25000,
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
- Special transactions handled per user guidance: [list]
- Negative amounts converted: [count]
- Comma-formatted amounts handled: [count]
- Typo reimbursements detected: [count]
- Florida House dates defaulted: [count]

Output Files:
- scripts/december-2024-CORRECTED.json - Parsed transaction data
- scripts/DECEMBER-2024-PARSE-REPORT.md - Detailed parsing report
- scripts/DECEMBER-2024-RED-FLAGS.md - APPEND new issues found during parsing

Parse Report Must Include:
- Transaction counts by section
- Transaction counts by type (expense vs income)
- Tag distribution (actual counts)
- Currency distribution (USD vs THB)
- Duplicates removed (with details)
- User corrections applied (with before/after values)
- Special transactions handled (with details of user guidance followed)
- Negative amounts converted (with count and details)
- Comma-formatted amounts handled (with count and details)
- Typo reimbursements detected (with count and details)
- Florida House dates defaulted (with count and details)
- Expected totals from parsed data
- Date corrections applied (if any)
- Warnings or issues encountered
- Sample transactions (first 3 from each section)

Critical Verification:
- Rent transaction MUST be THB amount (NOT USD conversion)
- All THB transactions stored as THB with original amounts
- All USD transactions stored as USD with original amounts
- NO negative amounts in output (all converted per rules)
- All comma-formatted amounts parsed correctly
- All reimbursements detected and tagged (including typos and variations)
- All Florida House transactions have valid dates (not null)
- All user corrections from pre-flight applied
- All special transaction handling per user guidance applied

Red Flag Logging:
- APPEND any new parsing errors, currency issues, or anomalies to scripts/DECEMBER-2024-RED-FLAGS.md
- Include line numbers, transaction details, and resolution status
- Flag duplicates removed for human review (mark as INFO/RESOLVED)
- Log any transactions excluded due to missing data
- Document all negative→positive conversions as INFO/RESOLVED
- Document all comma-formatted amounts as INFO/RESOLVED
- Document all reimbursements as INFO/RESOLVED with confirmation note
- Document all Florida House date defaults as INFO/RESOLVED
- Document all user corrections as RESOLVED with confirmation note
- Document all special transaction handling as RESOLVED with user guidance noted

IMPORTANT:
1. Create parse-december-2024.js following scripts/parse-january-2025.js as template
2. Add reimbursement detection regex (with colon optional)
3. Add Florida House date default logic
4. Add special transaction handling per user guidance
5. Run the parsing script
6. Create all output files (JSON, report, and updated red flag log)
7. Return a summary showing transaction counts, rent verification, currency distribution, corrections applied, special transaction handling, negative conversions, and ready-for-import confirmation.
```

**Output**:
- `scripts/december-2024-CORRECTED.json`
- `scripts/DECEMBER-2024-PARSE-REPORT.md`
- `scripts/DECEMBER-2024-RED-FLAGS.md` (updated)

**Human Checkpoint**: ⏸️ Verify rent amount, no negative amounts, user corrections applied, special transactions handled correctly, review red flags, approve for import.

---

### PHASE 3: Database Import

**Execution**: Direct command (no agent needed)

**Prerequisites**:
- ✅ Parse report reviewed and approved
- ✅ Rent transaction verified (THB amount, not USD)
- ✅ No negative amounts in JSON
- ✅ Currency split verified
- ✅ User corrections verified as applied
- ✅ Special transactions verified as handled per user guidance
- ✅ Florida House dates verified (not null)

**Command**:
```bash
node scripts/db/import-month.js --file=scripts/december-2024-CORRECTED.json --month=2024-12
```

**What This Does**:
- Matches existing vendors (400+ in database from 10 months of 2025 imports)
- Matches existing payment methods (46+ in database)
- Matches existing tags (Reimbursement, Florida House, Savings/Investment, Business Expense)
- Creates new vendors/payment methods only when no match found
- Skips duplicate transactions (same date + description + amount + vendor)
- Inserts transactions in batches of 50
- **CRITICAL**: Tags are applied by matching description + amount
- Creates transaction_tag relationships
- Reports: new vendors, new payment methods, import counts

**Expected Output**:
```
📥 INCREMENTAL MONTH IMPORT
==================================================
Target Month: 2024-12
Data File: scripts/december-2024-CORRECTED.json
User: dennis@dsil.design

📊 Loaded XXX transactions from file

👤 User ID: [uuid]

🔍 Found 0 existing transactions in 2024-12
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
New Tags: X (may show non-zero due to cache reporting bug - verify actual mapping)
==================================================
✅ Import complete!
```

**CRITICAL: Verify Tags Were Applied (MARCH LESSON) and Mapped to Existing IDs (FEBRUARY/JANUARY LESSON)**

After import completes, immediately run tag verification:

```bash
node scripts/check-december-tags.js
```

Create this script (copy from `check-january-tags.js`):

```javascript
#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTags() {
  console.log('\n🔍 VERIFYING DECEMBER 2024 TAG APPLICATION:\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_type,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-12-01')
    .lte('transaction_date', '2024-12-31')
    .order('transaction_date', { ascending: true });

  console.log(`📊 Total December 2024 transactions: ${transactions.length}\n`);

  const tagCounts = {};
  let totalWithTags = 0;
  let totalWithoutTags = 0;

  transactions.forEach(txn => {
    if (txn.transaction_tags && txn.transaction_tags.length > 0) {
      totalWithTags++;
      txn.transaction_tags.forEach(tt => {
        const tagName = tt.tags.name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    } else {
      totalWithoutTags++;
    }
  });

  console.log('✅ TAG DISTRIBUTION:');
  console.log(JSON.stringify(tagCounts, null, 2));
  console.log(`\n📊 Transactions with tags: ${totalWithTags}`);
  console.log(`📊 Transactions without tags: ${totalWithoutTags}`);

  const expected = {
    'Reimbursement': 0, // Update from parse report
    'Business Expense': 0, // Update from parse report
    'Florida House': 0 // Update from parse report
  };

  console.log('\n📋 EXPECTED vs ACTUAL:\n');
  let allMatch = true;
  for (const [tagName, expectedCount] of Object.entries(expected)) {
    const actualCount = tagCounts[tagName] || 0;
    const match = actualCount === expectedCount ? '✅' : '❌';
    console.log(`${match} ${tagName}: Expected ${expectedCount}, Got ${actualCount}`);
    if (actualCount !== expectedCount) allMatch = false;
  }

  if (allMatch && totalWithTags > 0) {
    console.log('\n✅ SUCCESS: All tags applied correctly!');
    return true;
  } else if (totalWithTags === 0) {
    console.log('\n❌ CRITICAL FAILURE: NO TAGS APPLIED!');
    console.log('This means the import script did not create transaction_tags relationships.');
    console.log('Need to investigate and re-import.');
    return false;
  } else {
    console.log('\n⚠️  WARNING: Tag counts do not match expected values!');
    console.log('Need to investigate discrepancies.');
    return false;
  }
}

checkTags()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
```

**Then verify tags mapped to existing IDs (FEBRUARY/JANUARY LESSON)**:

```bash
node scripts/verify-december-tag-mapping.js
```

Create this script (copy from `verify-january-tag-mapping.js`):

```javascript
#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMapping() {
  console.log('\n🔍 VERIFYING DECEMBER 2024 TAG MAPPINGS:\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Expected tag IDs from previous imports (verified working in July-January)
  const expectedTags = {
    'Reimbursement': '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72',
    'Florida House': '178739fd-1712-4356-b21a-8936b6d0a461',
    'Business Expense': '973433bd-bf9f-469f-9b9f-20128def8726',
    'Savings/Investment': 'c0928dfe-1544-4569-bbad-77fea7d7e5aa'
  };

  // Get all tags in database
  const { data: allTags } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', user.id);

  console.log('📋 ALL TAGS IN DATABASE:\n');
  allTags.forEach(tag => {
    const isExpected = expectedTags[tag.name] === tag.id ? '✅' : '❌';
    console.log(`${isExpected} ${tag.name}: ${tag.id}`);
  });

  // Get December transactions with tags
  const { data: decTxns } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_tags (
        tag_id,
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-12-01')
    .lte('transaction_date', '2024-12-31');

  let correctMappings = 0;
  let incorrectMappings = 0;
  const tagMappings = {};

  decTxns.forEach(txn => {
    if (txn.transaction_tags && txn.transaction_tags.length > 0) {
      txn.transaction_tags.forEach(tt => {
        const tagName = tt.tags.name;
        const tagId = tt.tags.id;
        const expectedId = expectedTags[tagName];

        if (!tagMappings[tagName]) {
          tagMappings[tagName] = new Set();
        }
        tagMappings[tagName].add(tagId);

        if (tagId === expectedId) {
          correctMappings++;
        } else {
          incorrectMappings++;
          console.log(`\n❌ INCORRECT: "${txn.description}" ($${txn.amount})`);
          console.log(`   Tag: "${tagName}"`);
          console.log(`   Expected ID: ${expectedId}`);
          console.log(`   Actual ID: ${tagId}`);
        }
      });
    }
  });

  console.log('\n📊 TAG MAPPING SUMMARY:\n');
  for (const [tagName, ids] of Object.entries(tagMappings)) {
    const expectedId = expectedTags[tagName];
    const actualIds = Array.from(ids);
    if (actualIds.length === 1 && actualIds[0] === expectedId) {
      console.log(`✅ "${tagName}"`);
      console.log(`   All transactions mapped to correct tag ID: ${expectedId}`);
    } else {
      console.log(`❌ "${tagName}"`);
      console.log(`   Expected ID: ${expectedId}`);
      console.log(`   Actual IDs found: ${actualIds.length} unique IDs`);
      actualIds.forEach(id => console.log(`     - ${id}`));
    }
    console.log('');
  }

  console.log(`\n📈 RESULTS:`);
  console.log(`   Correct mappings: ${correctMappings}`);
  console.log(`   Incorrect mappings: ${incorrectMappings}`);

  if (incorrectMappings === 0) {
    console.log('\n✅ SUCCESS: All December transactions correctly mapped to existing tags!');
    console.log('The "New Tags" message (if shown) was a reporting bug in the import script.');
    console.log('No duplicate tags were created - all transactions use the existing tag IDs.');
    return true;
  } else {
    console.log('\n❌ FAILURE: Some transactions mapped to wrong tag IDs!');
    console.log('Duplicate tags may have been created. Need to fix and remap.');
    return false;
  }
}

verifyMapping()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
```

**If Tags NOT Applied (MARCH LESSON)**:
1. **IMMEDIATELY** create cleanup script: `scripts/cleanup-december-2024.js`
2. Run cleanup to delete December 2024 transactions
3. Verify import script fix is still in place
4. Re-run import from Phase 3
5. Re-verify tags with check script

**If Tags Mapped to Wrong IDs (FEBRUARY/JANUARY LESSON)**:
1. Create cleanup script
2. Run cleanup to delete December 2024 transactions
3. Investigate import script tag matching logic
4. Re-run import
5. Re-verify tag mapping

**If Import Fails**:
- **Error: "positive_amount" constraint violation**:
  → A negative amount got through parsing
  → Delete partial import
  → Fix parsing script to convert negatives properly
  → Re-parse and re-import

- **Error: "null value in column transaction_date"**:
  → Missing dates in Florida House or other section
  → Delete partial import
  → Fix parsing script to default dates (e.g., 2024-12-31)
  → Re-parse and re-import

- **Error: Other database constraint**:
  → Review error message for details
  → Clean up partial import
  → Fix issue in parsing script or data
  → Re-parse and re-import

**Red Flag Logging**:
- If import reveals issues, APPEND to scripts/DECEMBER-2024-RED-FLAGS.md
- Document any new vendors/payment methods created for review
- Flag any transactions that were skipped as duplicates for verification
- **Document tag verification results**
- **Document tag mapping verification results**

**Human Checkpoint**: ⏸️ Verify import summary matches parse report counts, **verify tags were applied**, **verify tags mapped to existing IDs**, review any new red flags.

---

### PHASE 4: Comprehensive Validation (100% Coverage)

**Agent**: Task tool → subagent_type=data-scientist

**Objective**: Validate imported data against PDF source of truth using comprehensive multi-level verification with 100% transaction coverage.

**Prerequisites**:
- ✅ Database import completed
- ✅ Import summary reviewed
- ✅ **Tags verified as applied**
- ✅ **Tags verified as mapped to existing IDs**

**Prompt**:
```
Validate December 2024 import against PDF source of truth using comprehensive multi-level validation with 100% coverage.

Source Documents:
- PDF: csv_imports/Master Reference PDFs/Budget for Import-page11.pdf
- Parse Report: scripts/DECEMBER-2024-PARSE-REPORT.md
- Database: Supabase (use environment variables from .env.local)
- User: dennis@dsil.design

Exchange Rate (from PDF rent transaction):
- December 2024: This Month's Rent = THB [extract from PDF] = $[extract from PDF]
- Rate: Calculate from rent transaction (use for all USD conversions in validation)

Validation Levels:

**LEVEL 1: Section Grand Totals**

1. Query Expense Tracker transactions (expenses + reimbursements, exclude Florida House, exclude Savings, exclude non-reimbursement income)
   - Convert THB to USD using calculated rate
   - Calculate grand total
   - Compare to PDF Expense Tracker GRAND TOTAL (extract from PDF)
   - Acceptance: ±2% variance OR ±$150 absolute

2. Query Florida House tagged transactions
   - Convert and total
   - Compare to PDF Florida House GRAND TOTAL (extract from PDF)
   - Account for any user-confirmed duplicate removals
   - Acceptance: Exact match or ±$5

3. Query Savings/Investment tagged transactions
   - Convert and total
   - Compare to PDF Savings GRAND TOTAL (extract from PDF)
   - Acceptance: Exact match

4. Query Gross Income (exclude reimbursements)
   - Convert and total
   - Compare to PDF Gross Income GRAND TOTAL (extract from PDF)
   - NOTE: PDF label may be incorrect (learned from February) - validate actual transaction list
   - SPECIAL: Account for any special transactions handled per user guidance (like January income adjustment)
   - Acceptance: Match transaction list, accounting for special handling

**LEVEL 2: Daily Subtotals (Expense Tracker)**

1. Query daily totals from Expense Tracker section (December 1-31, 2024)
2. Compare each day to PDF "Daily Total" rows
3. Create comparison table:
   ```
   | Date | DB Total | PDF Total | Difference | Status |
   ```
4. Track: days within $1.00, days within $5.00, days >$5.00
5. Acceptance: ≥50% of days within $1.00, no day >$100 variance

**LEVEL 3: Transaction Count Verification**

1. Count total transactions in database for December 2024
2. Compare to import summary: XXX imported
3. Break down by type: expense vs income
4. Break down by currency: USD vs THB
5. Break down by section/tag
6. Acceptance: Exact match to import summary

**LEVEL 4: Tag Distribution Verification**

1. Count each tag in database:
   - Reimbursement: expected [from parse report]
   - Florida House: expected [from parse report]
   - Business Expense: expected [from parse report]
   - Savings/Investment: expected [from parse report]
2. Compare to parse report expected counts
3. CRITICAL: If counts are 0, flag as CRITICAL ERROR
4. NOTE: Tag verification already completed - should match
5. Acceptance: Exact match

**LEVEL 5: Critical Transaction Spot Checks**

1. Verify rent transaction(s):
   - Description: "This Month's Rent" (or similar)
   - Amount: THB amount from PDF
   - Currency: THB
   - Date: 2024-12-XX (find in PDF)
   - NOTE: Check if December has special pattern (like January's apartment move)

2. Verify any special transactions per user guidance

3. Verify Florida House transactions:
   - Check if dates are valid (should NOT be defaulted unless missing in CSV)
   - Verify amounts match PDF
   - All should be tagged with "Florida House"

4. Verify any typo reimbursements detected in parsing

5. Verify any negative amounts converted to income

6. Verify any comma-formatted amounts parsed correctly

7. Verify largest THB transaction
8. Verify largest USD transaction
9. Verify first and last transaction of month

Acceptance: All match PDF

**LEVEL 6: 100% Comprehensive 1:1 PDF Verification**

CRITICAL REQUIREMENT: Verify EVERY transaction in both directions (PDF→DB and DB→PDF).

**Task 6.1: PDF → Database Verification (100% Coverage)**

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

**Task 6.2: Database → PDF Verification (100% Coverage)**

1. Query ALL December 2024 transactions from database
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

**Task 6.3: Discrepancy Analysis**

For EVERY discrepancy found:
- Document in detail
- Root cause analysis
- Classify: CRITICAL / WARNING / ACCEPTABLE

**USER-CONFIRMED CORRECTIONS TO ACCOUNT FOR:**
[List from parsing phase]

**USER GUIDANCE FOR SPECIAL TRANSACTIONS:**
[List from parsing phase]

Output Files:
- scripts/DECEMBER-2024-VALIDATION-REPORT.md - Executive summary and all validation levels
- scripts/DECEMBER-2024-COMPREHENSIVE-VALIDATION.md - Complete 1:1 verification tables
- scripts/DECEMBER-2024-RED-FLAGS.md - APPEND all discrepancies found during validation

Report Structure:
1. Executive Summary
2. Exchange Rate Calculation
3. Level 1: Section Grand Totals
4. Level 2: Daily Subtotals Analysis
5. Level 3: Transaction Count Verification
6. Level 4: Tag Distribution
7. Level 5: Critical Transactions
8. Level 6: 100% Comprehensive 1:1 Verification
9. Final Recommendation

Acceptance Criteria (Overall):
- ✅ Level 1: All sections within variance thresholds (accounting for special transactions)
- ✅ Level 2: ≥50% daily match rate within $1.00, no day >$100 variance
- ✅ Level 3: Exact transaction count match
- ✅ Level 4: Exact tag distribution match (>0 tags total, not 0!)
- ✅ Level 5: All critical transactions verified (including special transactions)
- ✅ Level 6: 100% of PDF transactions found in DB, 100% of DB transactions found in PDF

IMPORTANT: Create all 3 output files and return a comprehensive executive summary with pass/fail recommendation. Pay special attention to any special transactions handled per user guidance.
```

**Output**:
- `scripts/DECEMBER-2024-VALIDATION-REPORT.md`
- `scripts/DECEMBER-2024-COMPREHENSIVE-VALIDATION.md`
- `scripts/DECEMBER-2024-RED-FLAGS.md` (final update with all issues)

**Human Checkpoint**: ⏸️ Review validation report and complete red flag log, accept/reject import based on results.

---

## 📊 Expected Results for December 2024

### Actual Results (COMPLETED IMPORT):
- **Transactions**: 259 (HIGHEST count of any month so far)
- **Currency Split**: 144 USD (55.6%), 115 THB (44.4%)
- **Tag Breakdown**:
  - Reimbursements: 18
  - Florida House: 5
  - Business Expense: 9
  - Savings/Investment: 0

### Critical Transaction:
- **Rent**: THB 25,000 on Dec 5, 2024 ($727.50)

### Section Totals (from PDF page 11):
- Expense Tracker NET: $5,851.28
- Gross Income: $8,001.84
- Savings/Investment: $0.00
- Florida House: $251.07

### Special Considerations for December 2024:
- **Earliest month chronologically** - may have establishment-phase patterns
- **Holiday spending** - December has higher transaction count than typical months
- **Year-end** - end of year transactions included

---

## ✅ Success Criteria

### Must Pass (All Required):
- ✅ Pre-flight analysis completed with no critical blockers
- ✅ PDF verified as December 2024 (STEP 0)
- ✅ **User consultation completed for any unusual transactions**
- ✅ Parsing script created with all lessons
- ✅ Rent transaction = correct THB amount (NOT USD conversion)
- ✅ All transactions stored in original currency (THB or USD)
- ✅ **NO negative amounts in database** (all converted per rules)
- ✅ **All comma-formatted amounts parsed correctly**
- ✅ **All reimbursements detected** (including typos and variations)
- ✅ **All Florida House transactions have valid dates (not null)**
- ✅ **All special transactions handled per user guidance**
- ✅ All user corrections applied (if any)
- ✅ Import completes without errors
- ✅ **Tags verified as applied** (>0 count, not 0)
- ✅ **Tags verified as mapped to existing IDs** (not duplicates)
- ✅ Transaction count matches parse report
- ✅ Tag distribution matches parse report
- ✅ Expense Tracker grand total within 2% of PDF
- ✅ Florida House exact match or within $5
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
- ❌ Rent transaction ≠ THB amount (showing USD instead)
- ❌ Currency field shows "USD" for Thai rent
- ❌ Amount shows conversion instead of original
- ❌ THB transactions stored as USD amounts
- ❌ Conversion column (column 8) being used
- ❌ **Any negative amounts in JSON output** (CRITICAL)
- ❌ **Comma-formatted amounts not parsed** (CRITICAL)
- ❌ **Reimbursements not detected** (CRITICAL)
- ❌ **Null dates in Florida House transactions** (CRITICAL)
- ❌ **Special transactions not handled per user guidance** (CRITICAL)

### Import Issues:
- ❌ Transaction count doesn't match parse report
- ❌ Large number of duplicates skipped unexpectedly
- ❌ **Tags count = 0** (CRITICAL)
- ❌ Tags not applied correctly
- ❌ New tags created (should use existing)
- ❌ Database constraint violation (negative amounts)
- ❌ Database constraint violation (null dates)

### Validation Issues:
- ❌ Variance >5% on any section grand total
- ❌ Daily variance >$100 on any day
- ❌ Transaction count mismatch
- ❌ **Tag count = 0 or mismatch** (CRITICAL)
- ❌ **Tags mapped to wrong IDs** (CRITICAL)
- ❌ Critical transactions not found in database
- ❌ Any PDF transaction not found in database
- ❌ Any database transaction not found in PDF

---

## 🔄 Recovery Procedures

### If Tags NOT Applied:
1. **IMMEDIATELY** create cleanup script: `scripts/cleanup-december-2024.js`
2. Run cleanup to delete December 2024 transactions
3. Verify import script fix is still in place
4. Re-run import from Phase 3
5. Re-verify tags with check script

### If Tags Mapped to Wrong IDs:
1. Create cleanup script
2. Run cleanup to delete December 2024 transactions
3. Investigate import script tag matching logic
4. Re-run import
5. Re-verify tag mapping

### If Negative Amounts Cause Error:
1. Create cleanup script
2. Run cleanup to delete December 2024 transactions
3. Fix parsing script to convert ALL negative expenses properly
4. Re-run from Phase 2 (parsing)
5. Verify no negative amounts in JSON
6. Re-import to database

### If Null Dates Cause Error:
1. Create cleanup script
2. Run cleanup to delete December 2024 transactions
3. Fix parsing script to default missing dates (e.g., 2024-12-31)
4. Re-run from Phase 2 (parsing)
5. Verify all transactions have valid dates in JSON
6. Re-import to database

### Other Issues:
- **Parsing error** → fix script, re-parse, re-import
- **Import error** → delete and re-import
- **PDF vs CSV mismatch** → document and accept if minor

---

## 📝 Comprehensive Lessons Learned

### From January 2025 (Most Recent):

1. ✅ **Special transaction handling** - Consult user for unusual transactions
2. ✅ **Multiple payments** - Don't assume multiple similar payments are errors
3. ✅ **Reimbursement pattern flexibility** - Detect with and without colon
4. ✅ **Tag verification critical** - Always verify application AND ID mapping

### From February 2025:

1. ✅ **Florida House missing dates** - Parser defaults to last day of month
2. ✅ **Typo reimbursements** - Flexible regex pattern for user typos
3. ✅ **Import script "New Tags" misleading** - Always verify actual tag mapping
4. ✅ **PDF formula errors** - Database is source of truth
5. ✅ **Tag mapping verification critical** - Always check IDs after import

### From March 2025:

1. ✅ **Import script tag matching bug** - Fixed (matches by description + amount)
2. ✅ **Negative amounts cause database errors** - Parser converts to positive income
3. ✅ **Comma-formatted amounts** - Parser cleans $, commas, quotes, tabs
4. ✅ **Tag verification critical** - Always check after import
5. ✅ **Recovery procedure** - Cleanup script + re-import pattern

### Key Metrics:
- **Pre-Flight Time**: 10-15 minutes
- **Parsing Time**: 10-15 minutes (including user review)
- **Import Time**: 2-3 minutes
- **Tag Verification**: 1 minute
- **Tag Mapping Verification**: 1 minute
- **Validation Time**: 15-20 minutes
- **Total Time**: 40-70 minutes

---

## 🚀 Ready to Execute

**Current Status**: ✅ Ready to begin Phase 1 (Pre-Flight Analysis) for December 2024

**Next Action**: Launch data-engineer agent with Phase 1 prompt

**Expected Timeline**:
- Phase 1: 10-15 minutes
- Human Review: 5 minutes (+ user consultation if needed)
- Phase 2: 10-15 minutes
- Human Review: 5 minutes
- Phase 3: 2-3 minutes + Tag Verification: 2 minutes
- Human Review: 2 minutes
- Phase 4: 15-20 minutes
- Human Review: 5 minutes

**Total**: 50-80 minutes

---

## Protocol Version: 3.4

**Updates from v3.3**:
- Added January 2025 lessons (special transaction handling, user consultation)
- Enhanced reimbursement detection (colon optional)
- Added two-step tag verification (application + ID mapping)
- Updated knowledge base with January 2025 completion (195 transactions)
- Updated database state (~1,734 transactions across 9 months)
- Enhanced pre-flight to flag unusual transactions for user consultation
- Added special transaction handling framework in parsing phase

**Last Updated**: October 26, 2025 (after January 2025 completion)

**Created By**: Human + Claude Code collaboration

**Status**: APPROVED FOR PRODUCTION USE

---

## 📋 Quick Reference Card

**CSV Columns**:
- Column 3: Reimbursable flag (X) - tracking only, NO tag
- Column 4: Business expense flag (X) - add Business Expense tag
- Column 6: THB amount (e.g., "THB 25000.00") ← **USE THIS**
- Column 7: USD amount (for expenses)
- Column 8: **CONVERSION - NEVER USE**
- Column 9: USD subtotal (use if Column 7 empty)

**Tag Logic**:
- **Reimbursement**:
  - ✅ Income + matches `/^Re(im|mi|m)?burs[e]?ment:?/i` (includes typos, colon optional)
  - ❌ UNLESS merchant is DSIL Design/LLC
- **Florida House**:
  - ✅ Expense + from Florida House section
  - ❌ UNLESS contains CNX/Chiang Mai
- **Business Expense**:
  - ✅ Expense + Column 4 has "X"
- **Savings/Investment**:
  - ✅ Expense + from Savings section

**Exchange Rate Calculation**:
- Find rent in PDF: THB [amount] = $X
- Rate = X / [THB amount]
- Use this rate for ALL THB→USD conversions

**File Locations**:
- PDF: `csv_imports/Master Reference PDFs/Budget for Import-page11.pdf` (December 2024)
- CSV: `csv_imports/fullImport_20251017.csv`
- Rules: `scripts/FINAL_PARSING_RULES.md`
- Template: `scripts/parse-january-2025.js` (includes all fixes)
- PDF Mapping: `PDF-MONTH-MAPPING.md` (page number reference)

**Human Checkpoints (⏸️ = STOP)**:
- ⏸️ After Pre-Flight: Review red flags, confirm PDF month, **consult on unusual transactions**, confirm corrections
- ⏸️ After Parsing: Verify rent amount, no negatives, no nulls, **special transactions handled correctly**, corrections applied
- ⏸️ After Import: Verify counts match, **VERIFY TAGS APPLIED**, **VERIFY TAG IDS**
- ⏸️ After Validation: Review full report, accept/reject

**Critical Verifications (All Lessons)**:
- ✅ PDF month is December 2024 (STEP 0)
- ✅ **User consulted on unusual transactions**
- ✅ NO negative amounts in parsed JSON
- ✅ Comma-formatted amounts parsed correctly
- ✅ Reimbursements detected (flexible pattern, colon optional)
- ✅ Florida House dates NOT null (defaulted to 2024-12-31 if missing)
- ✅ **Special transactions handled per user guidance**
- ✅ Tags applied after import (count > 0, not 0)
- ✅ Tags mapped to existing IDs (not duplicates)
- ✅ Rent = correct THB amount (not USD conversion)

**Expected Tag IDs (verify mapping)**:
- Reimbursement: `205d99a2-cf0a-44e0-92f3-e2b9eae1bf72`
- Florida House: `178739fd-1712-4356-b21a-8936b6d0a461`
- Business Expense: `973433bd-bf9f-469f-9b9f-20128def8726`
- Savings/Investment: `c0928dfe-1544-4569-bbad-77fea7d7e5aa`

---

**Ready to begin? Copy the Phase 1 prompt above and launch the data-engineer agent to start the December 2024 import process.**
