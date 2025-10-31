# BATCH 7: December 2021 and Earlier - Import & Verification Prompt

**Copy and paste this entire prompt into a new Claude Code tab**

---

# BATCH 7: December 2021 and Earlier Import & Verification

## CONTEXT & STATUS

You are continuing a proven batch import process that has successfully verified **3,539 transactions across 24 months (January 2022 - August 2024)** with a **100% success rate**.

**Most Recent Completion:**
- Batch 6 (January-April 2022): ✅ 677/677 transactions verified (100%)
- Completed: October 31, 2025
- CSV→DB verification: COMPLETE
- PDF→DB verification: COMPLETE (sample-based)

**Your Mission:**
Import and verify **Batch 7: December 2021 and earlier months**, working **backwards chronologically** from December 2021.

---

## THE ONE CSV SOURCE FILE

**Location:** `/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv`

This single master CSV contains ALL transactions. You will extract specific line ranges for each month.

---

## PROTOCOL TO FOLLOW

**Primary Reference:** `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/MASTER-IMPORT-PROTOCOL.md` (v4.0)

**4-Phase Process (for EACH month):**

### Phase 1: PARSE
1. Identify CSV line ranges for the target month
2. Copy parser template from: `batch-apr-jan-2022/january-2022/parse-january-2022.js`
3. Update line ranges, dates, and month name using sed automation
4. Run parser: `node parse-[month]-2021.js`
5. Verify output: Check transaction count, dual residence rents, no errors

### Phase 2: IMPORT
1. Use the CORRECTED.json output from parsing
2. Run: `node scripts/db/import-month.js --file=[path] --month=2021-[MM]`
3. Monitor import progress (batches of 50)
4. Verify import summary (counts, vendors, payment methods)

### Phase 3: VALIDATE (Gate 3)
1. Check transaction count matches CSV
2. Verify dual residence pattern (USA + Thailand rents if applicable)
3. Verify tag structure and counts
4. Check currency distribution

### Phase 4: VERIFY (Protocol v2.0) ⭐ MANDATORY
1. Copy verification template from: `batch-apr-jan-2022/verify-january-1to1.js`
2. Update month name, dates, and JSON file path
3. Run verification script
4. **ACHIEVE 100% MATCH RATE** (non-negotiable)
5. Document any issues and resolutions

### Phase 5: PDF VERIFICATION (Recommended for first month)
1. Identify PDF page for December 2021
2. Create sample verification script (15-20 transactions)
3. Verify PDF→CSV→Database chain
4. Document PDF page mapping

---

## CRITICAL SUCCESS CRITERIA

**Required for Production:**
- ✅ 100% CSV→DB verification (Protocol v2.0) for ALL months
- ✅ Zero unmatched CSV transactions
- ✅ Zero unexplained DB transactions
- ✅ All fields verified (date, amount, currency, description, vendor, payment)
- ✅ PDF sample verification for at least one month (recommended: December 2021)

**NOT Required:**
- ❌ PDF aggregate total reconciliation (deprecated - broken conversion formulas)
- ❌ PDF GRAND TOTAL matching (unreliable)

---

## BATCH 7 SPECIFICATIONS

### Processing Order
Start with **December 2021** and work backwards as far as data exists.

**Recommended batch size:** 4 months (December, November, October, September 2021)

### CSV Line Ranges to Identify
You need to identify these by examining the CSV file:
```bash
grep -n "December 2021: Expense Tracker" csv_imports/fullImport_20251017.csv
grep -n "November 2021: Expense Tracker" csv_imports/fullImport_20251017.csv
grep -n "October 2021: Expense Tracker" csv_imports/fullImport_20251017.csv
grep -n "September 2021: Expense Tracker" csv_imports/fullImport_20251017.csv
```

Also check for:
- "Gross Income Tracker" sections
- "Personal Savings & Investments" sections

### Expected Patterns (Based on 2021-2022 Context)
- **Location:** Likely transitioning between USA and Thailand OR fully in one location
- **USA Rent:** Jordan ~$857-$887/month (Conshohocken, PA) - if in USA
- **Thailand Rent:** THB 19,000-19,500/month (Chiang Mai) - if in Thailand
- **Expected Volume:** ~400-600 transactions total (4 months)
- **User Email:** dennis@dsil.design

### Date Validation Critical Items
- ⚠️ **December 2021: 31 days**
- ⚠️ **November 2021: 30 days**
- ⚠️ **October 2021: 31 days**
- ⚠️ **September 2021: 30 days**
- Watch for date typos (wrong year, month, or day)

---

## DELIVERABLES CHECKLIST

### Create This Batch Structure
```
scripts/batch-imports/batch-dec-sep-2021/  (or appropriate name)
├── BATCH-MANIFEST.md (CSV line ranges, PDF pages, estimates)
├── BATCH-PREFLIGHT-REPORT.md (CSV analysis before import)
├── december-2021/
│   ├── parse-december-2021.js
│   ├── december-2021-CORRECTED.json
│   ├── december-2021-METADATA.json
│   └── RED-FLAGS.md (if issues found)
├── november-2021/
│   ├── parse-november-2021.js
│   ├── november-2021-CORRECTED.json
│   ├── november-2021-METADATA.json
│   └── RED-FLAGS.md (if issues found)
├── ... (additional months)
├── verify-december-1to1.js
├── verify-november-1to1.js
├── ... (verification scripts for each month)
├── verify-december-pdf-sample.js (recommended)
└── BATCH-COMPLETE.md (final summary)
```

### Final Deliverables
- ✅ All months parsed and imported
- ✅ All months verified at 100% (CSV→DB)
- ✅ PDF sample verification for at least one month
- ✅ BATCH-MANIFEST.md created
- ✅ BATCH-COMPLETE.md created
- ✅ All verification scripts preserved

---

## KEY LEARNINGS TO APPLY

### From 24 Months of Verified Imports

1. **Date Validation is Critical**
   - February has 28 days (29 in leap years)
   - April, June, September, November have 30 days
   - Verification scripts must include last day of month

2. **Protocol v2.0 Catches Everything**
   - Count verification alone misses issues
   - 1:1 matching detects parser bugs immediately
   - Field-level verification ensures accuracy

3. **Common CSV Issues (Auto-Handle These)**
   - Negative amounts → Convert to positive income
   - Zero-value transactions → Skip during parsing
   - Comma-formatted amounts → Strip commas and parse
   - Typo reimbursements → Flexible regex detection

4. **Parser Template Approach Works**
   - Copy most recent successful parser
   - Use sed for month-specific updates
   - Consistent structure = rapid processing

5. **PDF Sample Verification is Efficient**
   - 15-20 transactions validates full chain
   - No need to extract all transactions manually
   - Covers edge cases and critical transactions

6. **Red Flags Auto-Resolve**
   - Negative conversions: 100% auto-handled
   - Zero transactions: Auto-skipped with logging
   - Typo reimbursements: Auto-detected with regex
   - Manual interventions: 0 across 24 months

---

## WORKFLOW STEPS

### Step 1: Setup (5 minutes)
1. Create batch folder: `mkdir -p scripts/batch-imports/batch-dec-sep-2021`
2. Create BATCH-MANIFEST.md with initial structure
3. Identify CSV line ranges for all months in scope

### Step 2: For Each Month (30-45 minutes per month)
1. **Parse:** Create parser, run, verify output
2. **Import:** Load to database, verify summary
3. **Validate:** Check counts, dual residence, tags
4. **Verify:** 1:1 matching, achieve 100%

### Step 3: PDF Verification (15 minutes for one month)
1. Identify PDF page for December 2021
2. Create sample verification script
3. Run and verify 100% match

### Step 4: Batch Completion (15 minutes)
1. Create BATCH-COMPLETE.md with statistics
2. Document all learnings and red flags
3. Preserve all verification scripts
4. Update overall progress tracking

**Total Estimated Time:** 3-4 hours for complete 4-month batch

---

## SUCCESS LOOKS LIKE

```
DECEMBER 2021: 1:1 TRANSACTION VERIFICATION

CSV Source: XXX transactions
Database: XXX transactions

MATCHING RESULTS:
Matched: XXX/XXX (100.0%)
Unmatched CSV: 0
Unmatched DB: 0

STATUS: ✅ VERIFIED
```

**Every month must show 100.0% match rate.**

---

## IMPORTANT PROTOCOLS

### What to Do
✅ Use Protocol v2.0 verification (1:1 matching) for EVERY month
✅ Copy parser templates from Batch 6 (most recent)
✅ Document all issues found and resolutions
✅ Preserve complete audit trail
✅ Apply all learnings from previous 24 months
✅ Perform PDF sample verification for at least one month

### What NOT to Do
❌ Do NOT attempt PDF aggregate total reconciliation (deprecated)
❌ Do NOT rely on count verification alone (insufficient)
❌ Do NOT skip 1:1 matching (mandatory)
❌ Do NOT guess line ranges (verify in CSV)
❌ Do NOT import without verification scripts

---

## REFERENCE FILES

**Protocol:**
- `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/MASTER-IMPORT-PROTOCOL.md` (v4.0)

**Templates:**
- Parser: `batch-apr-jan-2022/january-2022/parse-january-2022.js`
- Verification: `batch-apr-jan-2022/verify-january-1to1.js`
- PDF Sample: `batch-apr-jan-2022/verify-april-pdf-sample.js`

**Examples:**
- Batch 6 Complete: `batch-apr-jan-2022/BATCH-COMPLETE.md`
- Batch 5 Complete: `batch-aug-may-2022/BATCH-COMPLETE.md`
- Batch 4 Complete: `batch-dec-sep-2022/BATCH-COMPLETE.md`

**CSV Source:**
- `/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv`

**PDF Source:**
- `/Users/dennis/Code Projects/joot-app/csv_imports/Master Reference PDFs/Budget for Import-pageXX.pdf`

---

## YOUR FIRST STEPS

1. **Read MASTER-IMPORT-PROTOCOL.md (v4.0)** to understand the complete process
2. **Create batch folder structure** for batch-dec-sep-2021 (or appropriate name)
3. **Identify CSV line ranges** for December 2021 and other months in scope
4. **Create BATCH-MANIFEST.md** with line ranges and estimates
5. **Start with December 2021** (most recent month in this batch)

---

## QUALITY STANDARDS

**Maintained Across 24 Months:**
- ✅ 100% verification rate (3,539/3,539 transactions)
- ✅ Zero data loss
- ✅ Zero unresolved discrepancies
- ✅ Complete audit trails
- ✅ Zero manual interventions

**Batch 7 Must Match This Standard:**
- ✅ 100% CSV→DB verification
- ✅ PDF sample verification (at least one month)
- ✅ Zero unmatched transactions
- ✅ All issues documented and resolved
- ✅ Production-ready quality

---

## QUESTIONS TO ASK IF BLOCKED

1. Is my verification showing 100% match rate?
2. Have I checked the CSV line ranges include the last day of the month?
3. Am I using Protocol v2.0 (1:1 matching) correctly?
4. Have I documented all red flags and resolutions?
5. Are my parser corrections auditable and reversible?
6. Have I performed PDF sample verification for at least one month?

---

## CUMULATIVE PROGRESS TRACKING

### Before Batch 7
- **Verified Period:** January 2022 - August 2024
- **Verified Transactions:** 3,539/3,539 (100%)
- **Verified Months:** 24

### After Batch 7 (Target)
- **Verified Period:** [Oldest month] 2021 - August 2024
- **Verified Transactions:** 3,539 + [new count] = [total] (100%)
- **Verified Months:** 24 + [new months] = [total]
- **Perfect Match Rate Maintained:** 100%

---

## BEGIN!

Start by:
1. Creating the batch folder structure
2. Reading the CSV to identify line ranges
3. Determining how many months to include in this batch
4. Creating BATCH-MANIFEST.md
5. Proceeding with December 2021 (Phase 1: Parse)

Remember: **100% verification is non-negotiable. You are maintaining a perfect 24-month track record.**

---

## SUPPORT RESOURCES

**If you need help:**
- Review `MASTER-IMPORT-PROTOCOL.md` (v4.0)
- Check previous `BATCH-COMPLETE.md` files for examples
- Examine parser templates in `batch-apr-jan-2022/`
- Review verification scripts in `batch-apr-jan-2022/`

**End of Prompt**
