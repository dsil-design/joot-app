Monthly Transaction Import Protocol - July 2025

🎯 Mission

Import July 2025 historical transaction data using the established Month-by-Month Import Protocol, maintaining data integrity and consistency.

---

📚 Knowledge Base - Established From Previous Imports

Project Status

**Completed Imports:**
- ✅ September 2025: 159 transactions, variance -2.24%
- ✅ August 2025: 194 transactions, variance +2.24%

**Current Database State (dennis@dsil.design):**
- Total transactions: 353
- Vendors: 115+ (matched where possible)
- Payment methods: 25+
- Tags: Reimbursement, Florida House, Savings/Investment

**Next Target:** July 2025

---

🔧 Established Tools & Scripts

Verified Scripts (Use These)

1. **`scripts/FINAL_PARSING_RULES.md`** ✅
   - Complete parsing specification (verified correct)
   - Reference for all imports
   - Currency handling: Column 6 (THB), Column 7 (USD), ignore columns 8-9

2. **`scripts/db/import-month.js`** ✅
   - Incremental import script (tested and working)
   - Matches existing vendors/payment methods
   - Creates new ones only when needed
   - Skips duplicates
   - Usage: `node scripts/db/import-month.js --file=scripts/july-2025-CORRECTED.json --month=2025-07`

3. **Pre-flight & Validation Scripts** (Created by agents as needed)
   - data-engineer creates analysis scripts
   - data-scientist creates validation scripts

---

📋 Standard Import Workflow (Use This Every Month)

Phase 1: Pre-Flight Analysis

**Use:** Task tool → subagent_type=data-engineer

**Prompt Template:**
```
Analyze July 2025 data from csv_imports/fullImport_20251017.csv using scripts/FINAL_PARSING_RULES.md.

Tasks:
1. Find line numbers for all 4 sections (Expense Tracker, Gross Income Tracker, Personal Savings & Investments, Florida House Expenses)
2. Count transactions per section
3. Extract GRAND TOTAL from each section
4. Calculate expected total: Expense Tracker NET + Florida House + Savings
5. Detect potential duplicates between Expense Tracker and Florida House (same merchant + amount)
6. Count: Reimbursements (description starts with "Reimbursement:"), Business Expenses (column 4 has "X"), Reimbursables (column 3 - tracking only, no tag)
7. Identify currency distribution (USD vs THB vs other)
8. Flag any structural differences from September/August 2025

Reference Baselines:
- September 2025: 159 transactions, 23 reimbursements, 25 THB, variance -2.24%
- August 2025: 194 transactions, 32 reimbursements, 82 THB, variance +2.24%

Output: Comprehensive pre-flight report with:
- Line number ranges for each section
- Transaction counts
- Expected totals from CSV
- Duplicate detection results
- Tag distribution preview
- Currency breakdown
- Any red flags or structural differences

This is critical pre-import validation - flag any anomalies before we proceed to parsing.
```

**Human Review:** Address any red flags or clarifying questions before proceeding.

---

Phase 2: Parse & Prepare

**Use:** Task tool → subagent_type=data-engineer

**Prompt Template:**
```
Parse July 2025 transactions following scripts/FINAL_PARSING_RULES.md exactly.

Source: csv_imports/fullImport_20251017.csv (lines [X] to [Y] from pre-flight analysis)

Requirements:
1. Parse all 4 sections (Expense Tracker, Gross Income, Savings, Florida House)
2. Apply tag logic (Reimbursement, Florida House, Business Expense, Savings/Investment)
3. Detect and remove duplicates (keep Expense Tracker version)
4. Handle currency properly (store original USD/THB)
5. Convert date formats (handle both "Monday, Month D, YYYY" and "M/D/YYYY")
6. **Apply any date corrections identified in pre-flight**

Expected Output:
- Total transactions: [from pre-flight]
- Reimbursements: [from pre-flight]
- Florida House tags: [from pre-flight]
- Savings/Investment: [from pre-flight]
- Currency split: [from pre-flight]

Output Files:
- Save to scripts/july-2025-CORRECTED.json
- Generate scripts/JULY-2025-PARSE-REPORT.md with:
  * Transaction counts by section and type
  * Tag distribution
  * Duplicates removed
  * Expected totals from CSV
  * Date corrections applied (if any)
  * Any warnings or issues

This is Phase 2 of the import process - ensure data quality before database import.
```

**Human Review:** Verify parse report looks correct before database import.

---

Phase 3: Database Import

**Use:** Existing script (tested and working)

**Command:**
```bash
node scripts/db/import-month.js \
  --file=scripts/july-2025-CORRECTED.json \
  --month=2025-07
```

**What This Does:**
- Matches existing vendors (115+ in database)
- Matches existing payment methods (25+ in database)
- Matches existing tags (Reimbursement, Florida House, Savings/Investment)
- Creates new vendors/payment methods only when no match found
- Skips duplicate transactions (same date + description + amount + vendor)
- Inserts transactions in batches of 50
- Creates transaction_tag relationships
- Reports: new vendors, new payment methods, import counts

**Expected Output:**
- Transaction count imported
- New vendors created (if any)
- New payment methods created (if any)
- Tags applied

---

Phase 4: Validation

**Use:** Task tool → subagent_type=data-scientist

**Prompt Template:**
```
Validate July 2025 import against expected totals.

Database: Supabase (use environment variables)
User: dennis@dsil.design

Tasks:
1. Query all July 2025 transactions from database
2. Calculate totals:
   - Separate USD and THB amounts
   - Get average THB→USD rate for July 2025 from exchange_rates table
   - Convert THB amounts to USD using the rate
   - Calculate: Total Expenses, Total Income, NET
3. Compare to expected:
   - Expense Tracker NET: $[from parse report]
   - Florida House (after duplicates): $[from parse report]
   - Savings/Investment: $[from parse report]
   - Expected Total: $[from parse report]
4. Calculate variance and variance %
5. Verify tag distribution matches parse report:
   - Reimbursement: [expected count]
   - Florida House: [expected count]
   - Savings/Investment: [expected count]
6. Check transaction count matches parse report
7. Verify currency distribution matches parse report
8. Check transaction type split matches parse report

Output: scripts/JULY-2025-VALIDATION-REPORT.md with:
- Transaction count verification
- Financial totals (USD, THB, converted)
- Variance analysis (acceptable: ±1.5-3% due to exchange rates)
- Tag distribution verification
- Pass/fail status
- Any discrepancies found

Acceptance Criteria:
- Variance ≤ 3% from expected total
- All transactions imported
- Tag counts match expectations
- No data integrity issues
```

**Human Review:** Accept variance ±1.5-3% due to exchange rates. Flag if higher.

---

Phase 5: Final Verification

**Use:** Direct database queries or custom scripts as needed

**Quick Checks:**
```bash
# Verify tags applied correctly (if script exists)
node scripts/verify-tags.js --month=2025-07

# Quick sanity check (if script exists)
node scripts/db/quick-stats.js --month=2025-07
```

**Manual Spot Checks:**
- Check a few specific transactions in the database
- Verify date corrections were applied
- Verify duplicates were removed
- Confirm vendor/payment method matching worked

---

🔧 Critical Learnings from August 2025 Import

Issues Found & Fixed

1. **Tag Linking Issue** ⚠️
   - **Problem:** 6 reimbursements were untagged after import
   - **Cause:** Batch processing edge case in import script
   - **Solution:** Post-import verification caught and fixed automatically
   - **Action:** Phase 5 now includes tag verification step

2. **Date Anomaly Pattern** 📅
   - **Found in August:** Line 909 had "2004" instead of "2025"
   - **Lesson:** Always check for year anomalies in Gross Income section
   - **Action:** Pre-flight analysis now specifically flags anomalous dates

3. **Duplicate Detection Working** ✅
   - August: Xfinity $73.00 correctly identified and removed
   - Pattern: Same merchant + amount between Expense Tracker and Florida House
   - Action: Continue using established logic

4. **Exchange Rate Variance** 💱
   - August variance: 2.24% (within tolerance)
   - Cause: Exchange rate precision differences
   - Acceptable range: ±1.5% to ±3%
   - Action: Use average monthly rate from exchange_rates table

---

📊 Expected Patterns (Month-to-Month Variance)

Normal Variance Indicators

- Transaction count: ±20% is normal (September: 159, August: 194)
- THB transactions: Varies based on Thailand activity (September: 25, August: 82)
- Reimbursements: ±30% is normal (September: 23, August: 32)
- Total spending: ±20% is expected month-to-month

**Red Flags (Investigate if found):**
- Variance > 50% in transaction count
- Variance > 3% in financial totals (after currency conversion)
- Missing sections in CSV
- Date anomalies outside expected year range
- Duplicate count > 5% of total transactions

---

✅ Success Criteria (Every Month)

Must Pass All:
1. ✅ Transaction count matches CSV ±1-2
2. ✅ Variance from expected total ≤ 3%
3. ✅ All tags applied correctly
4. ✅ Duplicates removed
5. ✅ No database errors
6. ✅ Vendors matched where possible
7. ✅ Validation report generated
8. ✅ Tag verification passes

---

📞 When to Ask Human

- Variance > 3%
- Structural differences from previous months
- New data patterns not covered in FINAL_PARSING_RULES.md
- Duplicate detection ambiguous (> 5 duplicates found)
- Script errors or database issues
- Anomalous dates outside expected range
- Tag count discrepancies > 10%

---

🚀 Database Context

**Current State:**
- User: dennis@dsil.design (ID: a1c3caff-a5de-4898-be7d-ab4b76247ae6)
- Existing months: September 2025 (159 txns), August 2025 (194 txns)
- Total transactions: 353
- Vendors: 115+ (will grow as needed)
- Payment methods: 25+ (will grow as needed)
- Tags: Reimbursement, Florida House, Savings/Investment

**Other Users in Database:**
- hello@dsil.design (test data - ignore)
- admin@dsil.design (test data - ignore)
- **ONLY import for dennis@dsil.design**

---

🎬 Let's Start - July 2025

Execute Phase 1: Pre-Flight Analysis

Launch the data-engineer agent with the Phase 1 prompt template above, customized for July 2025.

After pre-flight analysis is complete and reviewed, proceed through Phases 2-5 sequentially, waiting for human approval at each critical step.

**Remember:**
- Accuracy over speed
- One month at a time
- Validate continuously
- Use established scripts and rules
- Flag anomalies early

**Goal:** Add July 2025 to the database with the same quality as September and August imports.
