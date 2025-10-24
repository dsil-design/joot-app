# Import March 2025 Transaction Data

Execute the 4-Phase Import Protocol v3.1 with comprehensive red flag logging for March 2025.

## Context

- **Protocol Version**: 3.1 (with Red Flag Logging)
- **Previous Imports**: Sept, Aug, July, June, May, April 2025 (all validated ✅)
- **Current Database**: ~1,075 transactions for dennis@dsil.design
- **Target Month**: March 2025

## Source Files

- **PDF**: `csv_imports/Master Reference PDFs/Budget for Import-page6.pdf` (March 2025)
- **CSV**: `csv_imports/fullImport_20251017.csv`
- **Protocol**: `MAY-2025-IMPORT-PROTOCOL.md` (use as template)
- **Parsing Rules**: `scripts/FINAL_PARSING_RULES.md`

## Critical Requirements

1. **Currency Handling**: Store original currency values (THB from Column 6, USD from Column 7/9, NEVER use Column 8)
2. **Rent Verification**: Verify rent = THB 35,000.00 (NOT ~$1074)
3. **Red Flag Logging**: Track ALL anomalies across all 4 phases in consolidated log
4. **100% Validation**: Verify every transaction bidirectionally (PDF→DB and DB→PDF)

## Expected Patterns (Based on Previous Months)

- **Transaction Count**: ~170-190 (estimate based on April: 182)
- **Currency Split**: ~45-50% USD, ~50-55% THB
- **Reimbursements**: ~15-30
- **Tags**: Reimbursement, Florida House, Business Expense, Savings/Investment
- **Variance Threshold**: ±2% on Expense Tracker, exact match on other sections

## Lessons Learned from April 2025

### Critical Issues to Watch For:

1. **Negative Amounts**: April had 2 negative amounts that needed correction
   - Check for any amount with `$(xxx)` or negative sign in expense rows
   - Legitimate refunds should be income transactions with positive amounts
   - Data entry errors should be corrected to positive amounts

2. **Currency Errors**: April had Monthly Cleaning incorrectly entered as USD instead of THB
   - Verify unusually large USD amounts against similar transactions
   - Cross-reference with previous months (e.g., monthly cleaning is typically ~THB 2,700-3,200)

3. **Tag Issues**: April required 8 tag fixes post-import
   - **Reimbursement tags**: Ensure ALL income transactions starting with "Reimbursement:" get tagged
   - **Exception**: Income from DSIL Design or DSIL LLC should NOT be tagged as Reimbursement even if description contains "Reimbursement"
   - **Florida House tags**: Verify all Florida House section transactions get tagged
   - **Watch for**: CNX/Chiang Mai bills mistakenly tagged as Florida House

4. **Duplicate Handling**: April had Xfinity Internet in both sections
   - Keep Expense Tracker version, remove Florida House version per FINAL_PARSING_RULES.md
   - BUT: If PDF Florida House total doesn't match, check if duplicate should actually be in Florida House

5. **Missing Transactions**: April had missing FPL electricity bill
   - When validation fails, search for variations of expected transaction names
   - Example: "FPL" might be "Electricity Bill", "Xfinity" might be "FL House Internet"

## Execution

Follow the 4-Phase Import Protocol exactly as documented in `MAY-2025-IMPORT-PROTOCOL.md`:

### Phase 1: Pre-Flight Analysis
**Agent**: data-engineer

**Tasks**:
- Identify line ranges for all 4 sections in CSV (March will be BEFORE April's lines 1802-2098)
- Extract grand totals from PDF (page 6)
- Detect duplicates between sections
- Count tag conditions (Reimbursements, Business Expenses, Florida House, Savings)
- Identify currency distribution
- Verify parsing script (check if `scripts/parse-march-2025.js` exists, create if missing)
- **NEW**: Flag negative amounts for user review
- **NEW**: Flag unusually large amounts for verification
- **NEW**: Compare monthly recurring charges (rent, cleaning, utilities) to previous months

**Deliverables**:
- `scripts/MARCH-2025-PREFLIGHT-REPORT.md`
- `scripts/MARCH-2025-RED-FLAGS.md` (initial log)

**Human Checkpoint**: Review pre-flight report, confirm corrections for any red flags before parsing.

---

### Phase 2: Parse & Prepare
**Agent**: data-engineer

**Prerequisites**:
- ✅ Pre-flight report reviewed and approved
- ✅ All user corrections confirmed
- ✅ Parsing script verified/created

**Tasks**:
- Parse all 4 sections following FINAL_PARSING_RULES.md
- Apply user-confirmed corrections from Phase 1
- Apply tag logic correctly:
  - "Reimbursement": description starts with "Reimbursement:" AND not from DSIL Design/LLC → income + tag
  - "Florida House": from Florida House section → expense + tag
  - "Business Expense": column 4 has "X" → expense + tag
  - "Savings/Investment": from Savings section → expense + tag
- Handle duplicates (keep Expense Tracker version unless PDF validation suggests otherwise)
- Store original currency values (THB from Column 6, USD from Column 7/9)

**Deliverables**:
- `scripts/march-2025-CORRECTED.json`
- `scripts/MARCH-2025-PARSE-REPORT.md`
- `scripts/MARCH-2025-RED-FLAGS.md` (updated)

**Critical Verifications**:
- ✅ Rent = 35,000 THB
- ✅ All user corrections applied
- ✅ No negative amounts (unless confirmed refunds as income)
- ✅ All amounts in original currency

**Human Checkpoint**: Verify rent = 35,000 THB, review corrections applied, approve for import.

---

### Phase 3: Database Import
**Execution**: Direct command (no agent)

**Prerequisites**:
- ✅ Parse report reviewed and approved
- ✅ Rent verified as 35,000 THB
- ✅ Currency split verified

**Command**:
```bash
node scripts/db/import-month.js --file=scripts/march-2025-CORRECTED.json --month=2025-03
```

**Expected Output**:
- Total transactions imported (should match parse report)
- Transaction types (expenses vs income)
- New vendors created
- New payment methods created
- Tags applied (should be 0 new tags - all exist from previous imports)
- Duplicates skipped (should be 0 for clean import)

**If Import Fails**:
- Check for negative amounts violating database constraint
- Delete partial import: `node scripts/cleanup-march-2025.js` (create if needed)
- Fix issue in parsing script
- Re-parse and re-import

**Human Checkpoint**: Verify import summary matches parse report counts.

---

### Phase 4: Comprehensive Validation
**Agent**: data-scientist

**Prerequisites**:
- ✅ Database import completed
- ✅ Import summary reviewed

**Tasks**:

**LEVEL 1: Section Grand Totals**
- Query Expense Tracker transactions (expenses + reimbursements, exclude Florida House, exclude Savings, exclude non-reimbursement income)
- Query Florida House tagged transactions
- Query Savings/Investment tagged transactions
- Query Gross Income (exclude reimbursements)
- Compare each to PDF grand totals
- Calculate exchange rate from rent transaction (THB 35,000 = $X)

**Acceptance Criteria**:
- Expense Tracker: ±2% OR ±$150
- Florida House: Exact or ±$5
- Gross Income: Exact match
- Savings: Exact match

**LEVEL 2: Daily Subtotals (Expense Tracker)**
- Compare daily totals to PDF
- Track match rate (days within $1, within $5, >$5)

**Acceptance Criteria**:
- ≥50% of days within $1.00 (lowered from 80% based on May/April learnings)
- No day >$100 variance

**LEVEL 3: Transaction Count Verification**
- Verify total count matches import summary
- Break down by type, currency, section

**Acceptance Criteria**:
- Exact match to import summary

**LEVEL 4: Tag Distribution Verification**
- Count each tag type in database
- Compare to parse report

**Acceptance Criteria**:
- Exact match to parse report

**LEVEL 5: Critical Transaction Spot Checks**
- Verify rent (35,000 THB)
- Verify largest THB transaction
- Verify largest USD transaction
- Verify any user-corrected transactions
- Verify first and last transaction

**LEVEL 6: 100% Comprehensive 1:1 PDF Verification**
- PDF → Database: Every PDF transaction found in DB
- Database → PDF: Every DB transaction found in PDF
- Document ALL discrepancies with root cause

**Deliverables**:
- `scripts/MARCH-2025-VALIDATION-REPORT.md`
- `scripts/MARCH-2025-COMPREHENSIVE-VALIDATION.md`
- `scripts/MARCH-2025-RED-FLAGS.md` (final, with all validation issues)

**Human Checkpoint**: Review validation report, accept/reject import based on results.

---

## Post-Validation: Tag Fixes (If Needed)

**Based on April's Experience**:

If validation fails due to missing tags, use Option B (automated fix):

1. Run diagnostic: `node scripts/find-missing-tags-march.js` (create from April template)
2. Review missing tags identified
3. Apply fixes: `node scripts/fix-march-tags.js`
4. **CRITICAL**: Verify tag logic before applying:
   - Is this truly a Reimbursement? (Check if it's from DSIL Design/LLC - if so, DO NOT tag)
   - Is this truly Florida House? (Check if it's CNX/Chiang Mai - if so, DO NOT tag)
5. Re-run validation to verify fixes

**Common Tag Errors from April**:
- ❌ DSIL income incorrectly tagged as Reimbursement
- ❌ Chiang Mai utilities incorrectly tagged as Florida House
- ✅ Missing tags on legitimate reimbursements (groceries, lunches)
- ✅ Missing tags on Florida House utilities (electricity, internet)

---

## Success Criteria

### Must Pass:
- ✅ Rent = 35,000 THB (not converted)
- ✅ All currencies stored as original values
- ✅ Transaction count matches parse report
- ✅ Tag distribution matches parse report
- ✅ Expense Tracker variance ≤2%
- ✅ Florida House exact match or ≤$5
- ✅ All section totals within thresholds
- ✅ 100% PDF transactions found in DB
- ✅ 100% DB transactions found in PDF

### Acceptable:
- ⚠️ Daily match rate ≥50% (ideal: ≥80%)
- ⚠️ Daily variance <$100 (all days)
- ⚠️ Minor THB→USD rounding differences
- ⚠️ Gross Income ±$50 (from rounding)

---

## Red Flag Log Requirements

For EACH anomaly discovered in ANY phase, log:

```
### 🚨 RED FLAG #X: [Issue Name]

**Transaction**: [description]
**Date**: [date]
**Amount**: [amount] [currency]
**Line Number**: [CSV line] (if applicable)
**Issue**: [what's wrong]
**Severity**: CRITICAL / WARNING / INFO
**Phase**: Pre-Flight / Parsing / Import / Validation
**Status**: OPEN / RESOLVED / ACCEPTABLE
**Root Cause**: [why it happened]
**Action Taken**: [what was done]
**User Confirmed**: YES / NO
```

---

## Deliverables

After all 4 phases:

1. `scripts/MARCH-2025-PREFLIGHT-REPORT.md` - Pre-flight analysis
2. `scripts/march-2025-CORRECTED.json` - Parsed transaction data
3. `scripts/MARCH-2025-PARSE-REPORT.md` - Parsing results
4. `scripts/MARCH-2025-VALIDATION-REPORT.md` - Executive validation summary
5. `scripts/MARCH-2025-COMPREHENSIVE-VALIDATION.md` - Detailed 1:1 verification
6. `scripts/MARCH-2025-RED-FLAGS.md` - Consolidated issue log from all phases

**Optional** (if tag fixes needed):
7. `scripts/find-missing-tags-march.js` - Tag diagnostic script
8. `scripts/fix-march-tags.js` - Tag fix script

---

## Notes from April 2025 Import

**What Worked Well**:
- ✅ Pre-flight analysis caught currency error and negative amounts
- ✅ User corrections applied cleanly during parsing
- ✅ Import script handled 182 transactions without issues
- ✅ Validation caught all missing tags

**What Needed Fixing**:
- ❌ 3 user corrections needed (negative amounts, currency error)
- ❌ 8 tag fixes needed post-import
- ❌ Parsing script needed to be created (didn't exist)

**Key Learnings**:
1. Pre-flight analysis is critical - don't skip it
2. User review prevents bad data from entering database
3. Tag logic needs careful review - watch for DSIL income and CNX utilities
4. Validation will catch tag issues - have fix scripts ready
5. Florida House section often needs the most tag attention
6. Duplicate handling: sometimes the "duplicate" is actually needed in Florida House

**Expected Time**:
- Phase 1 (Pre-Flight): 10-15 minutes
- Phase 2 (Parsing): 10-15 minutes (including user review)
- Phase 3 (Import): 2-3 minutes
- Phase 4 (Validation): 15-20 minutes
- Tag Fixes (if needed): 10-15 minutes
- **Total**: 45-60 minutes (with tag fixes), 30-40 minutes (clean import)

---

## Quick Reference: CSV Structure

**Sections in CSV** (March will be BEFORE April's 1802-2098):
- Expense Tracker: Largest section, ~150-170 transactions
- Gross Income Tracker: ~3-5 transactions
- Personal Savings & Investments: ~1-2 transactions
- Florida House Expenses: ~5-7 transactions

**Column Mapping**:
- Column 6: THB amounts (e.g., "THB 35000.00") ← **USE THIS**
- Column 7: USD amounts for expenses
- Column 8: **CONVERSION COLUMN - NEVER USE**
- Column 9: USD subtotal (use if Column 7 empty)

**Tag Rules**:
- Reimbursement: Income + description starts with "Reimbursement:" + NOT from DSIL
- Florida House: Expense + from Florida House section
- Business Expense: Expense + Column 4 has "X"
- Savings/Investment: Expense + from Savings section

---

**Status**: Ready to execute
**Next Action**: Begin Phase 1 with data-engineer agent

---

**Template Usage**: Copy this entire file and paste as a new chat prompt to begin March 2025 import.
