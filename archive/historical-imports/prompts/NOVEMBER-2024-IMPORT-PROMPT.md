# Monthly Transaction Import Protocol - November 2024

🎯 **Mission**: Import November 2024 historical transaction data using the established 4-Phase Import Protocol v3.5 with 100% comprehensive validation and red flag logging.

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
8. ✅ **February 2025**: 211 transactions, 99.55% accuracy, 3 typo reimbursements, Florida House date fix
9. ✅ **January 2025**: 195 transactions, 100% validation pass, apartment move (2 rents), income adjustment handling
10. ✅ **December 2024**: 259 transactions, 1.88% variance, HIGHEST count, 1 missing tag fixed manually

### Current Database State (dennis@dsil.design):
- **Total transactions**: ~1,993 (Sept + Aug + July + June + May + April + March + Feb + Jan + Dec)
- **Vendors**: 588+ (existing from 10 months)
- **Payment methods**: 46+ (existing from 10 months)
- **Tags**: Reimbursement, Florida House, Savings/Investment, Business Expense

### Next Target: **November 2024**

### Critical Context:
- **December 2024 Lessons Learned** (NEW):
  - Import script has edge case where one tag may not apply automatically
  - Solution: Manual tag fix via direct database insert
  - Column 3 vs Column 4 distinction critical (Reimbursable vs Business Expense)
  - User preference: preserve ALL original descriptions exactly
  - DSIL Design reimbursements should NOT have Reimbursement tag (company income)
  - Validation may show acceptable daily variances due to PDF calculation errors
- **January 2025 Lessons Learned**:
  - Special transaction handling (apartment move with 2 rent payments)
  - Income adjustments may need to be converted to expenses per user preference
  - Ask user about unusual transactions rather than making assumptions
  - Reimbursement detection works without colon (e.g., "Reimbursement" alone)
  - Tag verification and mapping is CRITICAL - always verify both after import
- **February 2025 Lessons Learned**:
  - Florida House section may have missing dates → default to last day of month
  - Typo reimbursements require flexible regex: `/^Re(im|mi|m)?burs[e]?ment:/i`
  - Import script "New Tags" message is misleading (checks cache, not database)
  - Always verify tag mapping to existing IDs after import
  - PDF Gross Income label may be incorrect due to formula errors
- **March 2025 Lessons Learned**:
  - Import script tag matching bug fixed (now matches by description + amount)
  - Refunds must be converted to positive income (database constraint)
  - Comma-formatted amounts need special parsing
  - Duplicate handling requires user decisions
- **Protocol Version**: 3.5 (All previous lessons + December 2024 Manual Tag Fix + DSIL Income Rules)
- **November 2024 is SECOND EARLIEST month** - may have different spending patterns, establishment phase

---

## 📁 Reference Files for November 2024

### Primary Sources
- **PDF**: `/csv_imports/Master Reference PDFs/Budget for Import-page12.pdf` (November 2024)
  - **Page Number Calculation**: October 2025 = page1, November 2024 = page12 (11 months back)
  - **Reference**: See `PDF-MONTH-MAPPING.md` for complete page number pattern
  - Source of truth for validation
  - Contains 4 sections with grand totals
  - Use for 1:1 transaction verification
  - **⚠️ CRITICAL PDF VERIFICATION STEP**:
    - **ALWAYS verify the PDF contains the correct month BEFORE starting analysis**
    - Check first transaction date in PDF (e.g., "Friday, November 1, 2024" or "Saturday, November 2, 2024")
    - If PDF shows ANY other month, STOP immediately
    - Report: "PDF verification failed - file contains [MONTH] data, not November 2024"
    - Expected PDF based on pattern: page12 (11 months back from October 2025)
    - If verification fails, consult `PDF-MONTH-MAPPING.md` or ask user for correct path

- **CSV**: `/csv_imports/fullImport_20251017.csv`
  - Lines: TBD (to be identified in pre-flight)
  - Expected: BEFORE December 2024's lines (3042-3401)
  - Pattern suggests: ~2700-2900 range (estimate)

- **Parsing Script**: `/scripts/parse-november-2024.js`
  - **STATUS**: Does NOT exist - will need to be created
  - **MUST** use Column 6 for THB amounts (NOT conversion column)
  - **MUST** use Column 7/9 for USD amounts (NOT conversion column)
  - **MUST** handle comma-formatted amounts (learned from March)
  - **MUST** convert negative expenses to positive income (learned from March)
  - **MUST** use flexible regex for typo reimbursements: `/^Re(im|mi|m)?burs[e]?ment:/i` (learned from February)
  - **MUST** default Florida House dates to 2024-11-30 if missing (learned from February)
  - **MUST** handle special transactions with user consultation (learned from January)
  - **MUST** preserve all original descriptions exactly (learned from December)
  - **MUST** exclude DSIL Design/LLC from Reimbursement tag (company income - learned from December)
  - Use `parse-december-2024.js` or `parse-january-2025.js` as template

- **Import Script**: `/scripts/db/import-month.js`
  - ✅ Verified working from all previous imports
  - ✅ Tag matching bug fixed in March (matches by description + amount)
  - ⚠️ "New Tags" reporting is misleading - verify actual tag mapping after import
  - ⚠️ **Edge case**: One tag may not apply automatically - prepare to manually fix if needed (learned from December)

### Supporting Documents
- `scripts/FINAL_PARSING_RULES.md` - Complete parsing specification
- `PDF-MONTH-MAPPING.md` - PDF page number reference
- `DECEMBER-2024-IMPORT-PROMPT.md` - Most recent import with all lessons
- `JANUARY-2025-IMPORT-PROMPT.md` - User consultation examples
- `FEBRUARY-2025-IMPORT-PROTOCOL.md` - Typo reimbursements and Florida House fixes
- `MARCH-2025-IMPORT-PROTOCOL.md` - Tag fix lessons and negative amount handling
- `scripts/DECEMBER-2024-RED-FLAGS.md` - Recent red flag examples

---

## 🚨 CRITICAL LESSONS FROM PREVIOUS IMPORTS

### From December 2024 (Most Recent):

**Issue #1: Import Script Tag Edge Case**
- **Problem**: One reimbursement tag (Dec 16 Meal Plan) was not applied automatically by import script
- **Root Cause**: Edge case in tag matching logic (description + amount)
- **Solution**: Manually added tag via direct database insert to transaction_tags table
- **Lesson**: After tag verification, if one tag is missing, can manually fix instead of re-importing
- **Status**: ✅ Fixed with SQL insert
- **Impact**: Tag verification caught the issue immediately
- **Recovery**: Create manual tag insert script if needed

**Issue #2: Column 3 vs Column 4 Distinction**
- **Problem**: Pest Treatment had "X" in column 3 (Reimbursable), not column 4 (Business Expense)
- **Clarification**: Column 3 = tracking only, NO TAG. Column 4 = Business Expense tag
- **Lesson**: Must distinguish between these columns - not all "X" marks mean tags
- **Status**: ✅ Correctly handled in December
- **Impact**: None - correctly excluded from Business Expense tags

**Issue #3: Preserve Original Descriptions**
- **Problem**: User preference to keep ALL descriptions exactly as-is
- **Clarification**: No rewrites or modifications unless obvious typos
- **Lesson**: Respect user's original data entry choices
- **Status**: ✅ All descriptions preserved in December
- **Impact**: User satisfaction - data remains authentic

**Issue #4: DSIL Design Income Should NOT Have Reimbursement Tag**
- **Problem**: Some gross income from DSIL Design labeled as "Reimbursement:" but should NOT have tag
- **Rule**: DSIL Design and DSIL LLC transactions = company income, NOT personal reimbursements
- **Lesson**: Merchant check overrides description pattern for reimbursement detection
- **Status**: ✅ Rule documented and applied
- **Impact**: Correct categorization of company vs personal income

**Issue #5: Daily Variance Acceptable When PDF Has Errors**
- **Problem**: Two days (Dec 7 & 10) showed variance but database was correct
- **Root Cause**: PDF daily total formulas had calculation errors
- **Lesson**: Database line items are source of truth, not PDF daily totals
- **Status**: Acceptable variance if line items match
- **Impact**: Validation should flag but accept when root cause is identified

### From January 2025:

**Issue #1: Special Transaction Handling**
- **Problem**: Income adjustment (-$602) needed user consultation for proper classification
- **Solution**: Asked user whether to treat as negative income or positive expense
- **Lesson**: When encountering unusual transactions, ASK the user rather than making assumptions
- **Status**: User preferred converting to expense with clear description
- **Impact**: Proper classification improves financial reporting accuracy

**Issue #2: Multiple Rent Payments (Apartment Move)**
- **Problem**: Two different rent payments in same month (THB 25,000 and THB 35,000)
- **Solution**: Flagged in pre-flight, confirmed with user (apartment move)
- **Lesson**: Flag unusual patterns but don't assume they're errors - user may have valid reasons
- **Status**: Both payments were valid and imported successfully
- **Impact**: None - validation passed 100%

**Issue #3: Reimbursement Pattern Without Colon**
- **Problem**: Some reimbursements lack the trailing colon (e.g., "Reimbursement" not "Reimbursement:")
- **Solution**: Updated regex to handle both patterns
- **Lesson**: Reimbursement detection should be flexible to description variations
- **Status**: ✅ Fixed in parse-january-2025.js
- **Impact**: All reimbursements detected correctly

**Issue #4: Tag Verification is CRITICAL**
- **Problem**: Other import months had tags not applied (discovered during January import)
- **Solution**: Implemented two-step verification (application + ID mapping)
- **Lesson**: ALWAYS verify tags were applied AND mapped to existing IDs after import
- **Status**: ✅ Verification scripts created and working
- **Impact**: Confirmed tags working correctly, catches issues immediately

### From February 2025:

**Issue #1: Florida House Missing Dates**
- **Problem**: Florida House section in CSV has no dates (empty date column)
- **Fix**: Parser defaults to last day of month (2024-11-30 for November)
- **Lesson**: Always check Florida House section for missing dates
- **Status**: ✅ Fixed in `parse-february-2025.js` line 319-320
- **Impact**: Initial import failed with "null value in column transaction_date" error
- **Recovery**: Created cleanup script, fixed parser, re-imported successfully

**Issue #2: Typo Reimbursements**
- **Problem**: Found 3 typo variants: "Remibursement", "Rembursement", "Reimbursment"
- **Fix**: Enhanced regex to `/^Re(im|mi|m)?burs[e]?ment:/i`
- **Lesson**: Flexible pattern matching needed for user typos
- **Status**: ✅ Template available in `parse-february-2025.js`
- **Impact**: Correctly detected all reimbursement variants

**Issue #3: Import Script "New Tags" Misleading Report**
- **Problem**: Import reported "New Tags: 3" but no duplicates were created
- **Root Cause**: Script tracks "new" based on cache, not database existence
- **Lesson**: Always verify tag mapping to existing IDs after import
- **Status**: Expected behavior - verify with tag verification scripts
- **Verification**: Created verification scripts to confirm correct IDs

**Issue #4: PDF Gross Income Formula Error**
- **Problem**: PDF label incorrect but transaction list is correct
- **Root Cause**: PDF spreadsheet formula references wrong cells
- **Lesson**: Database is source of truth, not PDF labels
- **Status**: Database correct, PDF label incorrect
- **Impact**: None - validation confirms database accuracy

### From March 2025:

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
- **Status**: ✅ Template available in all recent parsing scripts

**Issue #3: Comma-Formatted Amounts**
- **Problem**: Tax payment showed as "$3,490.02" with comma
- **Fix**: Enhanced parser to handle commas in amounts
- **Lesson**: Always clean: $, commas, quotes, tabs, parentheses
- **Status**: ✅ Template available in all recent parsing scripts

**Issue #4: Duplicate Handling**
- **Problem**: Same transaction in both Expense Tracker and Florida House
- **Resolution**: User decides which to keep (usually Expense Tracker)
- **Lesson**: Calculate totals before removing duplicates
- **Status**: Requires user decision during pre-flight

### Key Takeaways for November 2024:
- Pre-flight MUST flag: Negative amounts, comma-formatted amounts, duplicates, typo reimbursements, unusual transactions, DSIL Design reimbursements
- Parsing MUST handle: Negative→positive conversion, comma cleaning, typo reimbursements, Florida House date defaults, special transactions per user guidance, DSIL Design exclusion, preserve descriptions
- Import MUST verify: Tags applied correctly, tag IDs match existing records, prepare for manual tag fix if one is missing
- Validation MUST check: Tag distribution, currency split, critical transactions, PDF formula errors, accept daily variances if line items match
- **NEW**: DSIL Design/LLC = company income, exclude from Reimbursement tag
- **NEW**: Manual tag fix acceptable for edge cases (1 missing tag)
- **NEW**: Preserve all original descriptions exactly

---

## 🔧 4-Phase Import Process

[The rest of the protocol follows the same structure as December, but updated for November 2024]

### PHASE 1: Pre-Flight Analysis

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Analyze CSV and PDF to understand data structure, identify issues, and set expectations BEFORE parsing.

**Prompt**:
```
Analyze November 2024 data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page12.pdf using scripts/FINAL_PARSING_RULES.md.

**STEP 0 - CRITICAL PDF VERIFICATION (DO THIS FIRST)**:
Before starting any analysis, you MUST verify the PDF contains November 2024 data:
1. Read: csv_imports/Master Reference PDFs/Budget for Import-page12.pdf
2. Find the first transaction date in the "Expense Tracker" section
3. Verify it shows "November 2024" (e.g., "Friday, November 1, 2024" or "Saturday, November 2, 2024")
4. If PDF shows ANY other month (e.g., December 2024, May 2025), STOP IMMEDIATELY
5. Report to user: "PDF verification failed - Budget for Import-page12.pdf contains [ACTUAL MONTH] data, not November 2024"
6. Note: Expected page number is 12 (October 2025 = page1, November 2024 = 11 months back = page12)
7. Consult PDF-MONTH-MAPPING.md or ask user for correct path before continuing

Only proceed with tasks 1-10 below if Step 0 passes (PDF contains November 2024 data).

Tasks:
1. Find line numbers for all 4 sections in CSV:
   - Expense Tracker
   - Gross Income Tracker
   - Personal Savings & Investments
   - Florida House Expenses
   NOTE: November 2024 should be BEFORE December 2024 (lines 3042-3401) in the CSV.

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
   - Check if scripts/parse-november-2024.js exists
   - If NOT exists: flag that script needs to be created following parse-december-2024.js pattern
   - If exists: verify it uses Column 6 for THB (NOT Column 8 conversion)
   - If exists: verify it handles negative amounts (converts to positive income)
   - If exists: verify it handles comma-formatted amounts
   - If exists: verify it has typo reimbursement regex (learned from February)
   - If exists: verify it defaults Florida House dates to 2024-11-30 (learned from February)
   - If exists: verify it excludes DSIL Design/LLC from Reimbursement tag (learned from December)

9. Compare to previous months:
   - December 2024: 259 transactions, 18 reimbursements, 115 THB (44.4%), HIGHEST count
   - January 2025: 195 transactions, 15 reimbursements, 103 THB (53%)
   - February 2025: 211 transactions, 19 reimbursements, 144 THB (69.2%)
   - March 2025: 253 transactions, 28 reimbursements, 109 THB
   - April 2025: 182 transactions, 22 reimbursements, 93 THB
   - May 2025: 174 transactions, 16 reimbursements, 89 THB
   - June 2025: 190 transactions, 27 reimbursements, 85 THB
   - July 2025: 176 transactions, 26 reimbursements, ~90 THB
   - August 2025: 194 transactions, 32 reimbursements, 82 THB
   - September 2025: 159 transactions, 23 reimbursements, ~70 THB
   - Flag significant structural differences
   - NOTE: November 2024 is second earliest month - may have different patterns

10. Identify anomalies (CRITICAL - LESSONS FROM ALL PREVIOUS MONTHS):
    - **Negative amounts**: Check for $(xxx) or negative signs in expense rows (MUST convert to income)
    - **Comma-formatted amounts**: Check for amounts like "$3,490.02" (MUST handle in parser)
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
- scripts/NOVEMBER-2024-PREFLIGHT-REPORT.md
- scripts/NOVEMBER-2024-RED-FLAGS.md (for tracking anomalies/issues for later review)

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
- Comparison to previous months (including December 2024)
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
- Verify PDF month matches November 2024 (MUST DO FIRST)
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
- `scripts/NOVEMBER-2024-PREFLIGHT-REPORT.md`
- `scripts/NOVEMBER-2024-RED-FLAGS.md`

**Human Checkpoint**: ⏸️ Review pre-flight report and red flag log, address any critical issues before Phase 2. **Confirm PDF month is correct, provide guidance on unusual transactions, confirm DSIL Design exclusions, approve parsing strategy.**

---

## Expected Tag IDs (verify mapping after import):
- Reimbursement: `205d99a2-cf0a-44e0-92f3-e2b9eae1bf72`
- Florida House: `178739fd-1712-4356-b21a-8936b6d0a461`
- Business Expense: `973433bd-bf9f-469f-9b9f-20128def8726`
- Savings/Investment: `c0928dfe-1544-4569-bbad-77fea7d7e5aa`

---

## Protocol Version: 3.5

**Updates from v3.4**:
- Added December 2024 lessons (manual tag fix, DSIL Design rules, preserve descriptions)
- Enhanced DSIL Design/LLC exclusion from Reimbursement tag (company income)
- Added manual tag fix procedure for import script edge cases
- Updated knowledge base with December 2024 completion (259 transactions)
- Updated database state (~1,993 transactions across 10 months)
- Enhanced pre-flight to flag DSIL Design reimbursements for exclusion
- Added daily variance acceptance criteria (PDF calculation errors)

**Last Updated**: January 26, 2025 (after December 2024 completion)

**Created By**: Human + Claude Code collaboration

**Status**: APPROVED FOR PRODUCTION USE

---

**Ready to begin? Launch the data-engineer agent with the Phase 1 prompt above to start the November 2024 import process.**
