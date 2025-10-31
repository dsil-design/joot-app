# BATCH 9: April 2021 - January 2021 - Import & Verification Prompt

**Protocol:** MASTER-IMPORT-PROTOCOL v4.0 + Protocol v2.0 + PDF Verification
**Date:** Ready to Execute
**Batch:** 9 (4 months)

---

## 🎯 Objective

Import and verify **4 months** of transactions (April, March, February, January 2021) to extend verified history from **January 2021 to August 2024**.

**Current State:**
- ✅ **Verified:** May 2021 - August 2024 (40 months, 4,700 transactions, 100%)
- 🎯 **Target:** Add ~700 transactions from Apr-Jan 2021
- 🎯 **Goal:** 100% verification across all 5 layers + PDF validation

---

## 📋 Critical Requirements

### 1. 5-Layer Verification (Mandatory for ALL Months)
1. ✅ CSV→JSON parsing (100% accurate)
2. ✅ JSON→Database import (100% success)
3. ✅ CSV→DB 1:1 verification (Protocol v2.0 - 100% match)
4. ✅ PDF→DB verification (all 4 months - 100% match)
5. ✅ Duplicate detection (vendor-inclusive - 0 duplicates)

### 2. Date Validation ⚠️ CRITICAL
- **April 2021:** 30 days (NOT 31!)
- **March 2021:** 31 days
- **February 2021:** **28 days** ⚠️ (2021 is NOT a leap year - NO Feb 29!)
- **January 2021:** 31 days

### 3. Red Flags Processing
- ✅ Negative amounts → Positive income conversions
- ✅ Comma-formatted amounts (parse correctly)
- ✅ Typo reimbursements (flexible regex)
- ✅ Date typos/corrections
- ✅ Dual residence rent verification (Thailand + USA)

---

## 🚀 Execution Sequence

### **Phase 1: April 2021** (Start Here)

**CSV Line Ranges:**
- Expense Tracker: 14416-14606
- Gross Income: 14607-14617
- Savings: 14618-14623
- **Total Range:** 14416-14639

**Steps:**
1. Create `/batch-apr-jan-2021/april-2021/` directory
2. Copy parser from `/batch-aug-may-2021/may-2021/parse-may-2021.js`
3. Customize for April 2021:
   - Update month name, line ranges
   - Default date: `2021-04-30` (30 days!)
   - Date validation: April has 30 days
4. Run parser → `april-2021-CORRECTED.json`
5. Create import script → import to database
6. Create verification script → verify 100% CSV→DB
7. Verify against PDF page 55
8. Document results

**Expected Output:** ~160-180 transactions

---

### **Phase 2: March 2021**

**CSV Line Ranges:**
- Expense Tracker: 14640-14810
- Gross Income: 14811-14827
- Savings: 14828-14833
- **Total Range:** 14640-14849

**Steps:**
1. Create `/batch-apr-jan-2021/march-2021/` directory
2. Copy parser from April 2021
3. Customize for March 2021:
   - Update month name, line ranges
   - Default date: `2021-03-31` (31 days)
4. Run parser → `march-2021-CORRECTED.json`
5. Import to database
6. Verify 100% CSV→DB
7. Verify against PDF page 56
8. Document results

**Expected Output:** ~150-170 transactions

---

### **Phase 3: February 2021** ⚠️ **CRITICAL - 28 DAYS!**

**CSV Line Ranges:**
- Expense Tracker: 14850-15064
- Gross Income: 15065-15079
- Savings: 15080-15085
- **Total Range:** 14850-15101

**Steps:**
1. Create `/batch-apr-jan-2021/february-2021/` directory
2. Copy parser from March 2021
3. **CRITICAL:** Customize for February 2021:
   - Update month name, line ranges
   - Default date: `2021-02-28` ⚠️ **NOT Feb 29!**
   - **Add leap year validation:**
   ```javascript
   // Date sanity check: Ensure February 2021 has 28 days (NOT leap year)
   if (monthName === 'February' && year === '2021') {
     if (parseInt(day) > 28) {
       console.log(`⚠️  DATE ERROR: February ${day}, 2021 - 2021 is NOT a leap year (28 days max)!`);
       parsedYear = '2021';
       day = '28'; // Correct to Feb 28
       console.log(`✓ DATE CORRECTED: February ${day}, 2021`);
     }
   }
   ```
4. Run parser → `february-2021-CORRECTED.json`
5. **Verify NO Feb 29 transactions exist**
6. Import to database
7. Verify 100% CSV→DB
8. Verify against PDF page 57
9. Document 28-day validation

**Expected Output:** ~180-200 transactions
**Critical Validation:** Last transaction date ≤ 2021-02-28

---

### **Phase 4: January 2021** (Final Month)

**CSV Line Ranges:**
- Expense Tracker: 15102-15323
- Gross Income: 15324-15338
- Savings: 15339-15344
- **Total Range:** 15102-~15350

**Steps:**
1. Create `/batch-apr-jan-2021/january-2021/` directory
2. Copy parser from February 2021
3. Customize for January 2021:
   - Update month name, line ranges
   - Default date: `2021-01-31` (31 days)
4. Run parser → `january-2021-CORRECTED.json`
5. Import to database
6. Verify 100% CSV→DB
7. Verify against PDF page 58
8. Document results

**Expected Output:** ~190-210 transactions

---

## 🔍 Phase 5: Batch Completion & Verification

### 1. Duplicate Detection
```bash
# Create and run duplicate checker
/batch-apr-jan-2021/check-batch-9-duplicates.js
```

**Requirements:**
- Date range: 2021-01-01 to 2021-04-30
- Vendor-inclusive detection (date|desc|amount|currency|vendor)
- Expected result: 0 duplicates

### 2. PDF Verification (All 4 Months)
```bash
# Verify against PDF source pages 55-58
/batch-apr-jan-2021/verify-batch-9-pdf.js
```

**PDF Pages:**
- April 2021: Page 55
- March 2021: Page 56
- February 2021: Page 57
- January 2021: Page 58

**Verification:**
- Transaction count match (PDF vs DB)
- Grand total verification
- Sample transaction spot-checks (5-10 per month)
- Gross income verification
- Savings verification ($800/month expected)

### 3. Documentation
Create comprehensive reports:
- `PDF-VERIFICATION-COMPLETE.md` - Full PDF verification results
- `BATCH-9-COMPLETE.md` - Executive summary

---

## ✅ Success Criteria

### Transaction Verification
- ✅ 100% CSV→DB match (all 4 months)
- ✅ 100% PDF→DB match (all 4 months)
- ✅ Zero duplicates found
- ✅ Zero discrepancies
- ✅ All negative refunds correctly processed

### Date Validation
- ✅ April: 30 days verified (no April 31)
- ✅ March: 31 days verified
- ✅ **February: 28 days verified (NO Feb 29!)** ⚠️
- ✅ January: 31 days verified

### PDF Verification
- ✅ All 4 months verified against source PDFs
- ✅ Grand totals match
- ✅ Sample transactions verified
- ✅ Gross income verified
- ✅ Savings verified

### Production Readiness
- ✅ All 5 verification layers passed
- ✅ Zero-tolerance standard maintained
- ✅ Production-ready data quality

---

## 📊 Expected Results

### Cumulative Statistics (After Batch 9)

```
Timeline: January 2021 → August 2024 (44 months, 100% verified)

├─ Batch 9:  Jan-Apr 2021     (4 months, ~700 txns) ← NEW
├─ Batch 8:  May-Aug 2021     (4 months, 636 txns) ✅
├─ Batch 7:  Sep-Dec 2021     (4 months, 732 txns) ✅
└─ [Earlier batches...]       (32 months, ~3,300 txns) ✅

TOTAL: ~5,400+ transactions verified
Coverage: 44 months (3 years, 8 months)
Verification: 100% (5 layers + PDF)
```

### By Month (Estimated)
| Month | Transactions | Verification | PDF Page |
|-------|-------------|--------------|----------|
| April 2021 | ~170 | 100% ✅ | Page 55 |
| March 2021 | ~160 | 100% ✅ | Page 56 |
| February 2021 | ~190 | 100% ✅ | Page 57 |
| January 2021 | ~200 | 100% ✅ | Page 58 |
| **TOTAL** | **~720** | **100%** | **All verified** |

---

## 🔧 Quick Reference Commands

### Parser Templates
```bash
# Copy from May 2021 (proven template)
cp batch-aug-may-2021/may-2021/parse-may-2021.js batch-apr-jan-2021/april-2021/parse-april-2021.js

# Customize with sed
sed -i '' 's/MAY 2021/APRIL 2021/g; s/May 2021/April 2021/g; ...' parse-april-2021.js
```

### Run Parser
```bash
node batch-apr-jan-2021/april-2021/parse-april-2021.js
```

### Import to Database
```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx batch-apr-jan-2021/april-2021/import-april-2021.js
```

### Verify 1:1
```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx batch-apr-jan-2021/april-2021/verify-april-1to1.js
```

---

## ⚠️ Critical Reminders

### February 2021 Validation ⚠️
1. **2021 is NOT a leap year**
2. February has **28 days** (not 29)
3. Add validation in parser to catch Feb 29 entries
4. Verify last transaction date ≤ 2021-02-28
5. Check CSV for any "February 29, 2021" strings

### April 2021 Validation ⚠️
1. April has **30 days** (not 31)
2. Verify last transaction date ≤ 2021-04-30
3. Default date should be 2021-04-30

### General Best Practices
1. Copy parser from May 2021 (proven template)
2. Use targeted sed replacements (avoid broad string changes)
3. Always verify last day of month included
4. Check for duplicates after each import
5. Complete PDF verification for all months
6. Maintain vendor-inclusive duplicate detection

---

## 📁 Files Created (Expected)

### Parser Scripts (4)
- `april-2021/parse-april-2021.js`
- `march-2021/parse-march-2021.js`
- `february-2021/parse-february-2021.js` ⚠️ (28-day validation)
- `january-2021/parse-january-2021.js`

### JSON Output (8)
- `april-2021-CORRECTED.json` + `april-2021-METADATA.json`
- `march-2021-CORRECTED.json` + `march-2021-METADATA.json`
- `february-2021-CORRECTED.json` + `february-2021-METADATA.json`
- `january-2021-CORRECTED.json` + `january-2021-METADATA.json`

### Import Scripts (4)
- `april-2021/import-april-2021.js`
- `march-2021/import-march-2021.js`
- `february-2021/import-february-2021.js`
- `january-2021/import-january-2021.js`

### Verification Scripts (6)
- `april-2021/verify-april-1to1.js`
- `march-2021/verify-march-1to1.js`
- `february-2021/verify-february-1to1.js`
- `january-2021/verify-january-1to1.js`
- `check-batch-9-duplicates.js`
- `verify-batch-9-pdf.js`

### Documentation (3)
- `BATCH-MANIFEST.md` ✅ (Created)
- `PDF-VERIFICATION-COMPLETE.md` (To create)
- `BATCH-9-COMPLETE.md` (To create)

---

## 🎯 Ready to Execute

**Status:** 📋 **READY - All planning complete**

**Next Action:** Begin Phase 1 (April 2021)

**Estimated Timeline:**
- Phase 1 (April): ~30 min
- Phase 2 (March): ~25 min
- Phase 3 (February): ~30 min ⚠️ (extra validation)
- Phase 4 (January): ~25 min
- Phase 5 (Completion): ~30 min
- **Total:** ~2.5 hours

**Dependencies:** None (Batch 8 complete ✅)

---

## 🚀 Execute Batch 9

Please proceed with Batch 9: April 2021 - January 2021 import following MASTER-IMPORT-PROTOCOL v4.0.

Start with **April 2021** and complete all 4 months with full 5-layer verification including PDF validation.

**Critical Focus:** February 2021 28-day validation (NOT a leap year!)

---

**Created:** October 31, 2025
**Protocol:** MASTER-IMPORT-PROTOCOL v4.0 + Protocol v2.0 + PDF Verification
**Batch:** 9 (Apr-Jan 2021)
**Goal:** Extend verified history to January 2021 (44 months total)
