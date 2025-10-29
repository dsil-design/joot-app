Monthly Transaction Import Protocol - May 2025

🎯 Mission: Import May 2025 historical transaction data using the established Month-by-Month Import Protocol, maintaining data integrity and consistency.

---

📚 Knowledge Base - Established From Previous Imports

Project Status

Completed Imports:
- ✅ September 2025: 159 transactions, variance -2.24%
- ✅ August 2025: 194 transactions, variance +2.24%
- ✅ July 2025: 177 transactions, variance 0.00% (PERFECT)
- ✅ June 2025: 190 transactions, variance 0.00% (PERFECT)

Current Database State (dennis@dsil.design):
- Total transactions: 720
- Vendors: 281
- Payment methods: 9
- Tags: Reimbursement, Florida House, Savings/Investment

Next Target: May 2025

---

🔧 Established Tools & Scripts

Verified Scripts (Use These)

scripts/FINAL_PARSING_RULES.md ✅
- Complete parsing specification (verified correct)
- Reference for all imports
- Currency handling: Column 6 (THB), Column 7 (USD), ignore columns 8-9
- ⚠️ CURRENCY ALERT: Watch for VND, MYR, CNY or other currencies as we go back in time

scripts/db/import-month.js ✅ (RECENTLY FIXED)
- Incremental import script (tested and working)
- ✅ BUG FIX: Now handles months with different day counts (28, 29, 30, 31)
- ✅ BUG FIX: Now properly tracks original_currency (USD, THB, VND, MYR, CNY)
- Matches existing vendors/payment methods
- Creates new ones only when needed
- Skips duplicates
- Usage: node scripts/db/import-month.js --file=scripts/may-2025-CORRECTED.json --month=2025-05

Pre-flight & Validation Scripts: Created by agents as needed

---

📋 Standard Import Workflow (Use This Every Month)

Phase 1: Pre-Flight Analysis

Use: Task tool → subagent_type=data-engineer

Prompt Template:
Analyze May 2025 data from csv_imports/fullImport_20251017.csv using scripts/FINAL_PARSING_RULES.md.

Tasks:
1. Find line numbers for all 4 sections (Expense Tracker, Gross Income Tracker, Personal Savings & Investments, Florida House Expenses)
2. Count transactions per section
3. Extract GRAND TOTAL from each section
4. Calculate expected total: Expense Tracker NET + Florida House + Savings
5. Detect potential duplicates between Expense Tracker and Florida House (same merchant + amount)
6. Count: Reimbursements (description starts with "Reimbursement:"), Business Expenses (column 4 has "X"), Reimbursables (column 3 - tracking only, no tag)
7. **Identify ALL currency distributions:**
   - Count USD transactions (column 7)
   - Count THB transactions (column 6)
   - **IMPORTANT: Check for VND, MYR, CNY, or other currencies in column 6**
   - Flag any new currencies found
8. Flag any structural differences from previous months
9. Check for date anomalies (wrong year, like the 2004 issue in August)

Reference Baselines:
- June 2025: 190 transactions, 25 reimbursements, 85 THB, variance 0.00%
- July 2025: 177 transactions, 13 reimbursements, 68 THB, variance 0.00%
- August 2025: 194 transactions, 32 reimbursements, 82 THB, variance 2.24%
- September 2025: 159 transactions, 23 reimbursements, 25 THB, variance -2.24%

Output: Comprehensive pre-flight report with:
- Line number ranges for each section
- Transaction counts
- Expected totals from CSV
- Duplicate detection results
- Tag distribution preview
- **Complete currency breakdown (USD, THB, VND, MYR, CNY, other)**
- Any red flags or structural differences

This is critical pre-import validation - flag any anomalies before we proceed to parsing.

Human Review: Address any red flags or clarifying questions before proceeding.

---

Phase 2: Parse & Prepare

Use: Task tool → subagent_type=data-engineer

Prompt Template:
Parse May 2025 transactions following scripts/FINAL_PARSING_RULES.md exactly.

Source: csv_imports/fullImport_20251017.csv (lines [X] to [Y] from pre-flight analysis)

Requirements:
1. Parse all 4 sections (Expense Tracker, Gross Income, Savings, Florida House)
2. Apply tag logic (Reimbursement, Florida House, Business Expense, Savings/Investment)
3. Detect and remove duplicates (keep Expense Tracker version)
4. **Handle ALL currencies properly:**
   - Column 6 = Original currency amount (THB, VND, MYR, CNY, etc.)
   - Column 7 = USD amount
   - If column 6 has value, set original_currency to the currency code (THB, VND, MYR, CNY)
   - Store original amount and currency
   - IGNORE columns 8-9 (calculated/display columns)
5. Convert date formats (handle both "Monday, Month D, YYYY" and "M/D/YYYY")
6. Apply any date corrections identified in pre-flight

Expected Output:
- Total transactions: [from pre-flight]
- Reimbursements: [from pre-flight]
- Florida House tags: [from pre-flight]
- Savings/Investment: [from pre-flight]
- **Currency split: [USD, THB, VND, MYR, CNY, other from pre-flight]**

Output Files:
1. **scripts/may-2025-CORRECTED.json** - Parsed data in format:
   ```json
   {
     "date": "2025-05-DD",
     "description": "Merchant name",
     "merchant": "Merchant name",
     "payment_method": "Payment method name",
     "amount": 123.45,
     "currency": "USD",
     "transaction_type": "expense" | "income",
     "tags": ["Reimbursement"] | ["Florida House"] | [],
     "original_amount": 4567.89,  // if non-USD
     "original_currency": "THB" | "VND" | "MYR" | "CNY"  // if non-USD
   }
   ```

2. scripts/MAY-2025-PARSE-REPORT.md with:
   - Transaction counts by section and type
   - Tag distribution
   - Complete currency breakdown
   - Duplicates removed
   - Expected totals from CSV
   - Date corrections applied (if any)
   - Any warnings or issues

This is Phase 2 of the import process - ensure data quality before database import.

**Human Review:** Verify parse report looks correct, especially new currencies.

---

Phase 3: Database Import

**Use:** Existing script (tested and working, recently fixed)

**Command:**
```bash
node scripts/db/import-month.js \
  --file=scripts/may-2025-CORRECTED.json \
  --month=2025-05
```

What This Does:
- Matches existing vendors (281 in database)
- Matches existing payment methods (9 in database)
- Matches existing tags (Reimbursement, Florida House, Savings/Investment)
- Creates new vendors/payment methods only when no match found
- Skips duplicate transactions (same date + description + amount + vendor)
- ✅ Properly handles May (31 days) - date range bug was fixed
- ✅ Properly sets original_currency field - currency tracking bug was fixed
- Inserts transactions in batches of 50
- Creates transaction_tag relationships
- Reports: new vendors, new payment methods, import counts

Expected Output:
- Transaction count imported
- New vendors created (if any)
- New payment methods created (if any)
- Tags applied

---

Phase 4: Validation

Use: Task tool → subagent_type=data-scientist

Prompt Template:
Validate May 2025 import against expected totals.

Database: Supabase (use environment variables from .env.local)
User: dennis@dsil.design
Target Month: 2025-05

Expected Data (from parse report):
- Total transactions: [from parse report]
- Transaction types: [expenses/income from parse report]
- Reimbursement tags: [from parse report]
- Florida House tags: [from parse report]
- Savings/Investment tags: [from parse report]
- Currency distribution: [USD, THB, VND, MYR, CNY from parse report]
- Expected financial totals: [from parse report]

Tasks:
1. Query all May 2025 transactions from database for user dennis@dsil.design
2. Verify transaction count matches expected
3. Verify transaction type split matches expected
4. Calculate financial totals by currency:
   - For USD transactions: sum amounts directly
   - For non-USD transactions:
     a. Get the average exchange rate for May 2025 from exchange_rates table
     b. Convert non-USD amounts to USD using appropriate rates
     c. Sum converted amounts
   - Calculate total expenses, total income, NET
5. Compare calculated totals to expected totals
   - Calculate variance in dollars and percentage
6. Verify tag distribution matches expected
7. Verify currency distribution:
   - Count transactions by original_currency
   - Compare to expected from parse report
8. Check for any data integrity issues:
   - Missing vendors, payment methods, dates, amounts
   - Invalid date ranges
   - Missing currency fields

Output: Create scripts/MAY-2025-VALIDATION-REPORT.md with:
- Transaction count verification (pass/fail)
- Transaction type split verification (pass/fail)
- Financial totals by currency (USD, THB, VND, MYR, CNY, converted)
- Total expenses, total income, NET
- Variance analysis: calculated vs expected (dollars and %)
- Variance acceptance: ✅ if ≤3%, ⚠️ if 3-5%, ❌ if >5%
- Tag distribution verification (pass/fail for each tag)
- Currency distribution verification (pass/fail)
- Data integrity check results
- Overall pass/fail status
- Any discrepancies or issues found

Important Notes:
- Variance of ±1.5-3% is acceptable due to exchange rate fluctuations
- Use the average exchange rate for May 2025 from the exchange_rates table
- The exchange_rates table stores rates as THB per 1 USD (e.g., 35.5 means 35.5 THB = 1 USD)
- To convert THB to USD: USD_amount = THB_amount / exchange_rate
- Reference previous validation reports for format consistency

This is Phase 4 of the import process - final verification before accepting the import.

Human Review: Accept variance ±1.5-3% due to exchange rates. Flag if higher.

---

Phase 5: Final Verification

Use: Direct database queries or custom scripts as needed

Quick Checks:
```bash
# Verify currency distribution
PGPASSWORD=${SUPABASE_DB_PASSWORD} psql -h aws-0-ap-southeast-1.pooler.supabase.com \
  -U postgres.uwjmgjqongcrsamprvjr -d postgres \
  -c "SELECT original_currency, COUNT(*) FROM transactions
      WHERE user_id = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
      AND transaction_date >= '2025-05-01'
      AND transaction_date < '2025-06-01'
      GROUP BY original_currency ORDER BY original_currency;"
```

Manual Spot Checks:
- Check a few specific transactions in the database
- Verify date corrections were applied
- Verify duplicates were removed
- Confirm vendor/payment method matching worked
- Verify non-USD currencies stored correctly with original_currency field

---

🔧 Critical Learnings from Previous Imports

Currency Handling ⚠️ IMPORTANT

Supported Currencies:
- USD (primary)
- THB (Thailand Baht)
- VND (Vietnamese Dong) - added support
- MYR (Malaysian Ringgit) - added support
- CNY (Chinese Yuan) - added support

✅ **FIXED in June import:** Import script now properly uses `original_currency` field

As we go back in time, watch for:
- New currency codes in column 6
- Multiple currencies in same month
- Exchange rate availability in database

Date Range Bug ✅ FIXED

- June import revealed: Script assumed all months have 31 days
- ✅ **FIXED:** Now calculates correct last day for each month (28, 29, 30, 31)
- Will work correctly for May (31 days), April (30 days), Feb (28/29 days), etc.

Tag Linking Issue ⚠️

- Known limitation: Some tags may not apply automatically during import
- Post-import verification catches untagged items
- Tag discrepancies don't affect financial accuracy
- Can be corrected manually in the application if needed

Date Anomaly Pattern 📅

- August had "2004" instead of "2025" on line 909
- Always check Gross Income section for year anomalies
- Pre-flight analysis flags anomalous dates

Duplicate Detection ✅

- Same merchant + amount between sections
- Keep Expense Tracker version, remove Florida House
- June: RING successfully removed

Exchange Rate Variance 💱

- June variance: 0.00% (perfect)
- July variance: 0.00% (perfect)
- August variance: 2.24% (acceptable)
- September variance: -2.24% (acceptable)
- Acceptable range: ±1.5% to ±3%
- Use average monthly rate from exchange_rates table

---

📊 Expected Patterns (Month-to-Month Variance)

Normal Variance Indicators

- Transaction count: ±20% is normal (Avg: 180, Range: 159-194)
- THB transactions: Varies widely (25-85 based on location/travel)
- Reimbursements: ±30% is normal (13-32 observed)
- Total spending: ±20% is expected
- Currency mix changes based on location/travel

Red Flags (Investigate if found):

- Variance > 50% in transaction count
- Variance > 3% in financial totals (after currency conversion)
- Missing sections in CSV
- Date anomalies outside expected year range
- Duplicate count > 5% of total transactions
- Unknown currency codes

---

✅ Success Criteria (Every Month)

Must Pass All:
- ✅ Transaction count matches CSV ±1-2
- ✅ Variance from expected total ≤ 3%
- ✅ Currency distribution matches expected (with original_currency set correctly)
- ✅ Duplicates removed
- ✅ No database errors
- ✅ Vendors matched where possible
- ✅ Validation report generated
- ✅ No critical data integrity issues

Acceptable to Flag:
- ⚠️ Tag discrepancies (can be corrected manually)
- ⚠️ New vendors/payment methods created (expected as we go back in time)

---

📞 When to Ask Human

- Variance > 3%
- Structural differences from previous months
- New data patterns not covered in FINAL_PARSING_RULES.md
- Duplicate detection ambiguous (> 5 duplicates found)
- Script errors or database issues
- Anomalous dates outside expected range
- Tag count discrepancies > 10%
- New/unknown currency codes found
- Missing exchange rates for detected currencies

---

🚀 Database Context

Current State:
- User: dennis@dsil.design (ID: a1c3caff-a5de-4898-be7d-ab4b76247ae6)
- Existing months: June 2025 (190), July 2025 (177), August 2025 (194), September 2025 (159)
- Total transactions: 720
- Vendors: 281 (will grow as needed)
- Payment methods: 9 (will grow as needed)
- Tags: Reimbursement, Florida House, Savings/Investment
- Supported currencies: USD, THB, VND, MYR, CNY

Other Users in Database:
- hello@dsil.design (test data - ignore)
- admin@dsil.design (test data - ignore)

ONLY import for dennis@dsil.design

---

🎬 Let's Start - May 2025

Execute Phase 1: Pre-Flight Analysis

Launch the data-engineer agent with the Phase 1 prompt template above, customized for May 2025.

After pre-flight analysis is complete and reviewed, proceed through Phases 2-5 sequentially, waiting for human approval at each critical step.

Remember:
- ✅ Accuracy over speed
- ✅ One month at a time
- ✅ Validate continuously
- ✅ Use established scripts and rules
- ✅ Flag anomalies early
- ✅ Watch for new currencies as we go back in time
- ✅ Scripts have been fixed for date ranges and currency tracking

Goal: Add May 2025 to the database with the same quality as June and July imports (0% variance target).
