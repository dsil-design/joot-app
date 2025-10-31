# BATCH 8: August 2021 - May 2021
## Import Planning & Line Ranges

**Created:** October 31, 2025
**Status:** 📋 PLANNED
**Protocol:** MASTER-IMPORT-PROTOCOL v4.0
**Batch Size:** 4 months

---

## BATCH OVERVIEW

### Target Months
1. **August 2021** (Month 1)
2. **July 2021** (Month 2)
3. **June 2021** (Month 3)
4. **May 2021** (Month 4)

### Expected Totals
- **Estimated Transactions:** ~600-700 (based on historical averages)
- **Expected Time:** 4-5 hours (complete batch)
- **Per Month:** ~60-75 minutes (parse, import, validate, verify)

---

## CSV LINE RANGES

### Source File
`csv_imports/Master Reference PDFs/Budget as of August 2024 - 2017 to 2024 - Sheet1.csv`

### Identified Line Ranges

#### August 2021
- **CSV Lines:** TBD (needs identification)
- **Last Verified Line from Sep 2021:** 13146 (start of September expenses)
- **Estimated Count:** ~160-180 transactions
- **PDF Page:** TBD (estimated ~page 51)

#### July 2021
- **CSV Lines:** TBD (needs identification)
- **Estimated Count:** ~180-200 transactions
- **PDF Page:** TBD (estimated ~page 52-53)

#### June 2021
- **CSV Lines:** TBD (needs identification)
- **Estimated Count:** ~150-170 transactions
- **PDF Page:** TBD (estimated ~page 54)

#### May 2021
- **CSV Lines:** TBD (needs identification)
- **Estimated Count:** ~180-200 transactions
- **PDF Page:** TBD (estimated ~page 55-56)

---

## DATE VALIDATION NOTES

### Days Per Month
- **August 2021:** 31 days (1st - 31st) ✅
- **July 2021:** 31 days (1st - 31st) ✅
- **June 2021:** 30 days (1st - 30th) ⚠️ (NOT 31!)
- **May 2021:** 31 days (1st - 31st) ✅

### Critical Date Checks
- ✅ August: Last transaction should be 2021-08-31
- ✅ July: Last transaction should be 2021-07-31
- ⚠️ June: Last transaction should be 2021-06-30 (NOT 2021-06-31!)
- ✅ May: Last transaction should be 2021-05-31

---

## EXPECTED PATTERNS

### Dual Residence
Based on Batch 7 patterns (Sep-Dec 2021):
- **Thailand Rent:** THB 19,500 (Jatu - Landlord) - Expected in some months
- **USA Rent:** $850-$1,500 (Jordan) - Expected in some months
- **Pattern:** Dual residence likely throughout 2021

### Currency Mix
- Expected: THB and USD transactions
- Ratio varies by location (US vs Thailand)

### Transaction Types
- **Expenses:** Majority of transactions
- **Income:** E2Open paychecks (bi-weekly ~$1,900-$2,000 each)
- **Savings:** Vanguard deposits (~$1,000-$2,000)
- **Reimbursements:** Some negative amounts to convert

---

## RED FLAGS TO WATCH

### Known Issues from Previous Batches
1. ⚠️ **Date Typos** - Auto-correction logic in place
2. ⚠️ **Negative Amounts** - Auto-conversion to income/reimbursements
3. ⚠️ **Comma-Formatted Amounts** - Parser handles automatically
4. ⚠️ **June has 30 days** - NOT 31! (common error)
5. ⚠️ **Last day of month** - Always verify last day is included in line range

### Parser-Specific
- Copy from December 2021 template (proven successful)
- Use targeted sed replacements (avoid broad string replacements)
- Verify fallback dates match month-specific day counts

---

## FOLDER STRUCTURE

```
batch-aug-may-2021/
├── BATCH-MANIFEST.md (this file)
├── august-2021/
│   ├── parse-august-2021.js
│   ├── august-2021-CORRECTED.json
│   └── verify-august-1to1.js
├── july-2021/
│   ├── parse-july-2021.js
│   ├── july-2021-CORRECTED.json
│   └── verify-july-1to1.js
├── june-2021/
│   ├── parse-june-2021.js
│   ├── june-2021-CORRECTED.json
│   └── verify-june-1to1.js
├── may-2021/
│   ├── parse-may-2021.js
│   ├── may-2021-CORRECTED.json
│   └── verify-may-1to1.js
└── BATCH-COMPLETE.md (created after verification)
```

---

## VERIFICATION CHECKLIST

### Per Month
- [ ] Parse transactions (Phase 1)
- [ ] Import to database (Phase 2)
- [ ] Validate patterns (Phase 3)
- [ ] Verify 1:1 CSV→DB (Phase 4)
- [ ] Document results

### Batch Completion
- [ ] All 4 months at 100% verification
- [ ] PDF sample verification (minimum 1 month)
- [ ] Duplicate check (learned from Batch 7)
- [ ] Update cumulative statistics
- [ ] Create BATCH-COMPLETE.md

---

## SUCCESS CRITERIA

### Mandatory
- ✅ 100% CSV→DB verification for all 4 months (Protocol v2.0)
- ✅ Zero unmatched CSV transactions
- ✅ Zero unexplained database transactions
- ✅ All red flags auto-handled or documented

### Recommended
- ✅ PDF sample verification (minimum 1 month)
- ✅ Duplicate detection run after import
- ✅ Dual residence pattern confirmed (if applicable)

---

## NEXT STEPS

1. **Identify CSV Line Ranges** - Search CSV for month headers
2. **Create August 2021 Parser** - Copy from December 2021 template
3. **Parse August 2021** - Extract transactions to JSON
4. **Import August 2021** - Load to database
5. **Verify August 2021** - 1:1 CSV→DB matching
6. **Repeat for July, June, May** - Same 4-phase process
7. **Complete Batch** - Document results and update statistics

---

**Manifest Status:** 📋 **PLANNED**
**Ready to Start:** Pending CSV line range identification
**Estimated Completion:** 4-5 hours
