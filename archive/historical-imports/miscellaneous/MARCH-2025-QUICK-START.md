# March 2025 Import - Quick Start Guide

**Copy and paste this into a new chat to begin:**

---

Monthly Transaction Import Protocol - March 2025

🎯 **Mission**: Import March 2025 historical transaction data using the established 4-Phase Import Protocol v3.1 with 100% comprehensive validation and red flag logging.

## 📚 Context

**Completed Imports**:
- ✅ September 2025: 159 transactions
- ✅ August 2025: 194 transactions
- ✅ July 2025: 176 transactions
- ✅ June 2025: 190 transactions
- ✅ May 2025: 174 transactions
- ✅ April 2025: 182 transactions (3 user corrections, 8 tag fixes)

**Current Database**: ~1,075 transactions for dennis@dsil.design

**Next Target**: March 2025

## 📁 Source Files

- **PDF**: `csv_imports/Master Reference PDFs/Budget for Import-page6.pdf` (March 2025)
- **CSV**: `csv_imports/fullImport_20251017.csv` (lines BEFORE April's 1802-2098)
- **Protocol**: `MAY-2025-IMPORT-PROTOCOL.md`
- **Parsing Rules**: `scripts/FINAL_PARSING_RULES.md`
- **Detailed Prompt**: `MARCH-2025-IMPORT-PROMPT.md`

## 🚨 Critical Lessons from April 2025

### Issues to Watch For:

1. **Negative Amounts** (April had 2):
   - Check for `$(xxx)` or negative signs in expense rows
   - Refunds should be positive income, not negative expenses
   - Example: Madame Koh was -THB 1,030 → corrected to +THB 1,030

2. **Currency Errors** (April had 1):
   - Monthly Cleaning was $2,782 USD → corrected to THB 2,782
   - Verify unusually large USD amounts against previous months

3. **Tag Issues** (April had 8 fixes):
   - ❌ DSIL income incorrectly tagged as Reimbursement
   - ❌ Chiang Mai utilities incorrectly tagged as Florida House
   - ✅ Missing Reimbursement tags on groceries/lunches
   - ✅ Missing Florida House tags on utilities

4. **Duplicates** (April had 1):
   - Xfinity Internet appeared in both sections
   - Kept Expense Tracker version, but later added Florida House tag

## 🔧 4-Phase Process

### Phase 1: Pre-Flight Analysis (10-15 min)
**Agent**: data-engineer

**What it does**:
- Finds March data in CSV (BEFORE line 1802)
- Extracts PDF totals from page 6
- Detects duplicates
- **Flags negative amounts and currency errors**
- Verifies/creates parsing script

**Deliverables**:
- `MARCH-2025-PREFLIGHT-REPORT.md`
- `MARCH-2025-RED-FLAGS.md`

**⏸️ STOP**: Review report, confirm corrections for any red flags

---

### Phase 2: Parse & Prepare (10-15 min)
**Agent**: data-engineer

**What it does**:
- Parses CSV following `FINAL_PARSING_RULES.md`
- Applies user corrections from Phase 1
- Handles duplicates
- Stores original currency values (THB from Column 6, USD from Column 7/9)

**Deliverables**:
- `march-2025-CORRECTED.json`
- `MARCH-2025-PARSE-REPORT.md`

**⏸️ STOP**: Verify rent = 35,000 THB, review corrections

---

### Phase 3: Database Import (2-3 min)
**Command**:
```bash
node scripts/db/import-month.js --file=scripts/march-2025-CORRECTED.json --month=2025-03
```

**Expected**: ~170-190 transactions imported

**⏸️ STOP**: Verify import summary matches parse report

---

### Phase 4: Comprehensive Validation (15-20 min)
**Agent**: data-scientist

**What it validates**:
1. Section grand totals (Expense Tracker, Florida House, Gross Income, Savings)
2. Daily subtotals (≥50% within $1.00)
3. Transaction counts (exact match)
4. Tag distribution (exact match)
5. Critical transactions (rent, largest, first/last)
6. 100% PDF coverage (bidirectional verification)

**Deliverables**:
- `MARCH-2025-VALIDATION-REPORT.md`
- `MARCH-2025-COMPREHENSIVE-VALIDATION.md`

**⏸️ STOP**: Review validation report

---

### Post-Validation: Tag Fixes (if needed, 10-15 min)

If validation finds missing tags:
1. Create diagnostic script from April template
2. Review missing tags
3. **VERIFY tag logic** (watch for DSIL income, CNX utilities)
4. Apply fixes
5. Re-validate

---

## ✅ Success Criteria

**Must Pass**:
- Rent = 35,000 THB
- All currencies stored as original values
- Transaction count matches parse report
- Tag distribution correct
- Expense Tracker ≤2% variance
- Florida House exact match or ≤$5
- 100% PDF coverage

**Acceptable**:
- Daily match rate ≥50%
- Gross Income ±$50 (rounding)

---

## 🎯 Expected Results

Based on April 2025:
- **Transactions**: ~170-190 (April had 182)
- **Currency Split**: ~90 USD, ~90 THB
- **Tags**: ~20-25 Reimbursements, ~5-7 Florida House, ~0-1 Savings
- **User Corrections**: 0-3 (April had 3)
- **Tag Fixes**: 0-10 (April had 8)
- **Time**: 45-60 minutes total

---

## 📋 Tag Logic Reference

```
Reimbursement:
  ✅ Income + description starts with "Reimbursement:"
  ❌ UNLESS from DSIL Design or DSIL LLC

Florida House:
  ✅ Expense + from Florida House section
  ❌ NOT CNX or Chiang Mai bills

Business Expense:
  ✅ Expense + Column 4 has "X"

Savings/Investment:
  ✅ Expense + from Savings section
```

---

## 🚀 Ready to Start?

**Copy the full prompt from**: `MARCH-2025-IMPORT-PROMPT.md`

Or use this short version:

> Execute the 4-Phase Import Protocol v3.1 for March 2025 using `MAY-2025-IMPORT-PROTOCOL.md` as template. Source files: PDF page 6, CSV before line 1802. Expected: ~180 transactions. Critical: watch for negative amounts, currency errors, and tag issues learned from April 2025. Begin Phase 1 with data-engineer agent.

---

**Last Updated**: October 24, 2025 (after April 2025 completion)
