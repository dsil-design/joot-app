# BATCH 9 MANIFEST: April 2021 - January 2021

**Protocol:** MASTER-IMPORT-PROTOCOL v4.0 + Protocol v2.0 + PDF Verification
**Batch:** 9
**Date Range:** January 2021 - April 2021 (4 months)
**Status:** 📋 PLANNED

---

## Objective

Import and verify 4 months of transactions (April, March, February, January 2021) to extend verified history from **January 2021 to August 2024**.

**Current State:**
- ✅ **Verified:** May 2021 - August 2024 (40 months, ~4,700 transactions, 100%)
- 🎯 **Target:** Add ~600-700 transactions from Apr-Jan 2021
- 🎯 **Goal:** Extend verified history to January 2021 (44 months total)

---

## CSV Line Ranges (Identified)

### April 2021
- **Expense Tracker:** 14416-14606 (~190 lines)
- **Gross Income:** 14607-14617 (~10 lines)
- **Savings:** 14618-14623 (~5 lines)
- **Estimated Range:** Lines 14416-14639

### March 2021
- **Expense Tracker:** 14640-14810 (~170 lines)
- **Gross Income:** 14811-14827 (~16 lines)
- **Savings:** 14828-14833 (~5 lines)
- **Estimated Range:** Lines 14640-14849

### February 2021 ⚠️ (28 days - 2021 NOT leap year)
- **Expense Tracker:** 14850-15064 (~214 lines)
- **Gross Income:** 15065-15079 (~14 lines)
- **Savings:** 15080-15085 (~5 lines)
- **Estimated Range:** Lines 14850-15101

### January 2021
- **Expense Tracker:** 15102-15323 (~221 lines)
- **Gross Income:** 15324-15338 (~14 lines)
- **Savings:** 15339-15344 (~5 lines)
- **Estimated Range:** Lines 15102-~15350

---

## PDF Pages (Estimated)

Based on pattern from Batch 8:
- **August 2021:** Page 51
- **May 2021:** Page 54

Estimated pages for Batch 9:
- **April 2021:** Page 55
- **March 2021:** Page 56
- **February 2021:** Page 57 ⚠️ (28 days verification required)
- **January 2021:** Page 58

---

## Expected Transaction Counts

Based on line ranges and historical patterns:

| Month | Estimated Transactions |
|-------|----------------------|
| April 2021 | ~160-180 |
| March 2021 | ~150-170 |
| February 2021 | ~180-200 (⚠️ 28 days) |
| January 2021 | ~190-210 |
| **TOTAL** | **~680-760** |

---

## Critical Requirements

### 1. Date Validation ⚠️
- **February 2021:** 28 days only (2021 is NOT a leap year)
  - Must verify February ends on Feb 28
  - NO February 29 should exist
- **January 2021:** 31 days
- **March 2021:** 31 days
- **April 2021:** 30 days

### 2. Verification Layers (All Required)
1. ✅ CSV→JSON parsing
2. ✅ JSON→Database import
3. ✅ CSV→DB 1:1 verification (Protocol v2.0)
4. ✅ PDF→DB verification (all 4 months)
5. ✅ Duplicate detection (vendor-inclusive)

### 3. Red Flags to Process
- Negative amounts → Positive income conversions
- Comma-formatted amounts
- Typo reimbursements
- Date typos/corrections
- Dual residence rent verification

---

## Execution Sequence

### Phase 1: April 2021 (Start Here)
1. Identify CSV line ranges
2. Create parser from May 2021 template
3. Parse transactions → `april-2021-CORRECTED.json`
4. Import to database
5. Verify 1:1 CSV→DB (100%)
6. Verify against PDF page 55
7. Document results

### Phase 2: March 2021
Repeat 4-phase process with March-specific ranges.

### Phase 3: February 2021 ⚠️ (28 Days!)
1. **CRITICAL:** Verify February has exactly 28 days (NOT 29)
2. Parse with February-specific date validation
3. Complete standard 4-phase import
4. Verify PDF page 57

### Phase 4: January 2021 (Final Month)
Complete 4-phase process to reach beginning of 2021.

### Phase 5: Batch Completion
1. Run duplicate detection for all 4 months
2. Verify PDF→DB for all 4 months (100%)
3. Create `BATCH-9-COMPLETE.md`
4. Update cumulative statistics

---

## Success Criteria

- ✅ 100% CSV→DB verification (all 4 months)
- ✅ 100% PDF→DB verification (all 4 months)
- ✅ Zero duplicates
- ✅ Zero unmatched transactions
- ✅ February 28-day validation passed
- ✅ Production-ready data

---

## Historical Context

### Timeline After Batch 9
```
January 2021 → August 2024 (44 months, 100% verified)
├─ Batch 9:  Jan-Apr 2021    (4 months, ~700 txns) ← NEW
├─ Batch 8:  May-Aug 2021    (4 months, 636 txns) ✅
├─ Batch 7:  Sep-Dec 2021    (4 months, 732 txns) ✅
└─ [Earlier batches...]      (32 months, ~3,300 txns) ✅

TOTAL: ~5,400+ transactions verified
```

### Coverage Goal
- **Start Date:** January 1, 2021
- **End Date:** August 31, 2024
- **Duration:** 44 months (3 years, 8 months)
- **Verification Status:** 100% complete (all layers)

---

## Files Structure

```
batch-apr-jan-2021/
├── BATCH-MANIFEST.md (This file)
├── BATCH-9-PROMPT.md (Execution prompt)
├── april-2021/
│   ├── parse-april-2021.js
│   ├── import-april-2021.js
│   ├── verify-april-1to1.js
│   ├── april-2021-CORRECTED.json
│   └── april-2021-METADATA.json
├── march-2021/
│   ├── parse-march-2021.js
│   ├── import-march-2021.js
│   ├── verify-march-1to1.js
│   ├── march-2021-CORRECTED.json
│   └── march-2021-METADATA.json
├── february-2021/ ⚠️ (28 days)
│   ├── parse-february-2021.js
│   ├── import-february-2021.js
│   ├── verify-february-1to1.js
│   ├── february-2021-CORRECTED.json
│   └── february-2021-METADATA.json
├── january-2021/
│   ├── parse-january-2021.js
│   ├── import-january-2021.js
│   ├── verify-january-1to1.js
│   ├── january-2021-CORRECTED.json
│   └── january-2021-METADATA.json
├── check-batch-9-duplicates.js
├── verify-batch-9-pdf.js
├── PDF-VERIFICATION-COMPLETE.md
└── BATCH-9-COMPLETE.md
```

---

## Lessons from Batch 8

### What Worked Well
1. ✅ Streamlined sed replacements for month transitions
2. ✅ Enhanced duplicate detection (vendor-inclusive)
3. ✅ Comprehensive PDF verification (100% coverage)
4. ✅ 30-day month validation (June)
5. ✅ Parallel execution of all 4 months

### Apply to Batch 9
1. Use same parser template approach (copy from May 2021)
2. Apply vendor-inclusive duplicate detection
3. Complete PDF verification for all 4 months
4. **NEW:** Validate February 28 days (non-leap year)
5. Maintain 5-layer verification standard

---

## Special Considerations for February 2021

### Leap Year Check
- **2021 is NOT a leap year**
- February has **28 days** (NOT 29)
- Must verify: NO transactions on Feb 29, 2021

### Validation Steps
1. Check CSV for any "February 29, 2021" entries
2. Verify last transaction date is Feb 28, 2021
3. Confirm transaction count aligns with 28-day month
4. Add special validation in parser:
```javascript
if (monthName === 'February' && day === '29' && year === '2021') {
  console.log(`⚠️  ERROR: February 29, 2021 detected - 2021 is NOT a leap year!`);
  // Flag for manual review
}
```

---

## Ready to Execute

**Status:** 📋 Planning complete
**Next Action:** Run Batch 9 execution prompt
**Estimated Time:** 2-3 hours (full import + verification)
**Dependencies:** None (Batch 8 complete)

---

**Created:** October 31, 2025
**Protocol:** MASTER-IMPORT-PROTOCOL v4.0
**Batch:** 9 (Apr-Jan 2021)
