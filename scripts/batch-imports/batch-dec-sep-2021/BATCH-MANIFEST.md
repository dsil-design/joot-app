# BATCH 7: December 2021 - September 2021 Import Manifest

**Created:** October 31, 2025
**Status:** In Progress
**Batch Size:** 4 months
**CSV Source:** `/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv`
**Total CSV Lines:** 25,926

---

## BATCH OVERVIEW

**Processing Order:** December → November → October → September 2021

**Context:**
- This batch follows Batch 6 (January-April 2022) which verified 677/677 transactions (100%)
- Cumulative verified transactions before this batch: **3,539/3,539 (100%)**
- This batch will extend the verified period back to September 2021

**Expected Patterns:**
- **Dual Residence:** Transitioning between USA and Thailand or fully in one location
- **USA Rent:** Jordan ~$850-$887/month (Conshohocken, PA) - if in USA
- **Thailand Rent:** THB 19,000-19,500/month + utilities (Chiang Mai) - if in Thailand
- **Primary Income:** E2Open paycheck ~$2,772 (twice per month starting Dec 2021)
- **User Email:** dennis@dsil.design

---

## CSV LINE RANGES

### December 2021
- **Expense Tracker Start:** Line 12467
- **Expense Tracker End:** Line 12676 (GRAND TOTAL line)
- **Income Tracker Start:** Line 12678
- **Income Tracker End:** Line 12687
- **Savings Tracker:** Lines 12689-12691 (exists)
- **Transaction Lines:** ~209 lines (expenses + income sections)
- **Estimated Transactions:** ~180-200 transactions
- **Dual Residence:** ✅ YES (THB 19,500 + $850 rent observed)

### November 2021
- **Expense Tracker Start:** Line 12709
- **Expense Tracker End:** Line 12882
- **Income Tracker Start:** Line 12883
- **Income Tracker End:** Line 12891
- **Transaction Lines:** ~182 lines
- **Estimated Transactions:** ~160-180 transactions

### October 2021
- **Expense Tracker Start:** Line 12915
- **Expense Tracker End:** Line 13113
- **Income Tracker Start:** Line 13114
- **Income Tracker End:** Line 13122
- **Transaction Lines:** ~207 lines
- **Estimated Transactions:** ~180-200 transactions

### September 2021
- **Expense Tracker Start:** Line 13147
- **Expense Tracker End:** Line 13365
- **Income Tracker Start:** Line 13366
- **Income Tracker End:** Line 13374
- **Transaction Lines:** ~227 lines
- **Estimated Transactions:** ~200-220 transactions

---

## BATCH STATISTICS (ESTIMATED)

| Month | CSV Lines | Est. Transactions | Dual Residence | Status |
|-------|-----------|-------------------|----------------|---------|
| December 2021 | ~209 | ~180-200 | ✅ YES | Pending |
| November 2021 | ~182 | ~160-180 | TBD | Pending |
| October 2021 | ~207 | ~180-200 | TBD | Pending |
| September 2021 | ~227 | ~200-220 | TBD | Pending |
| **TOTAL** | **~825** | **~720-800** | - | **0/4 Complete** |

---

## PDF PAGE MAPPING

**PDF Location:** `/Users/dennis/Code Projects/joot-app/csv_imports/Master Reference PDFs/Budget for Import-pageXX.pdf`

**Estimated Pages (working backwards from known mappings):**
- January 2022: Page 46
- December 2021: **~Page 47** (to be confirmed)
- November 2021: **~Page 48** (to be confirmed)
- October 2021: **~Page 49** (to be confirmed)
- September 2021: **~Page 50** (to be confirmed)

**Note:** Pages increase as we go back in time (older months = higher page numbers)

---

## CRITICAL VALIDATION POINTS

### Date Validation
- ⚠️ **December 2021:** 31 days (verify last transaction is Dec 31)
- ⚠️ **November 2021:** 30 days (verify last transaction is Nov 30)
- ⚠️ **October 2021:** 31 days (verify last transaction is Oct 31)
- ⚠️ **September 2021:** 30 days (verify last transaction is Sep 30)

### Dual Residence Pattern
- **December 2021 Confirmed:**
  - Thailand Rent: THB 19,500 (Jatu - Landlord)
  - Thailand Utilities: THB 1,022 (Jatu - Landlord)
  - Thailand Cleaning: THB 2,568 (Bliss)
  - USA Rent: $850 (Jordan)
- **November-September:** To be verified

### Income Sources
- **December 2021:** E2Open paycheck (~$2,772 × 2 = $5,544.56)
- **Earlier months:** Likely mix of freelance (Upwork, CreativeCircle) transitioning to E2Open

---

## KNOWN CSV PATTERNS

### Transaction Types
1. **Expenses:** Daily transactions with amounts, merchants, payment methods
2. **Income:** Paycheck, freelance, reimbursements
3. **Savings:** IRA contributions, emergency savings
4. **Reimbursements:** Negative amounts (convert to positive income)

### Payment Methods Observed
- Credit Card: Chase Sapphire Reserve
- Bangkok Bank Account
- PNC Bank Account
- Cash
- Venmo
- Grab (digital wallet)

### Common Merchants (Dec 2021)
- Jatu (Landlord) - Thailand rent
- Jordan - USA rent
- Google - Work email
- DoorDash - Food delivery
- Grab - Taxi/delivery
- 7-Eleven - Convenience
- E2Open - Primary employer

---

## NEXT MONTHS TO IMPORT (Future Batches)

**After Batch 7, remaining 2021 months:**
- August 2021 (Line 13402)
- July 2021 (Line 13643)
- June 2021 (Line 13924)
- May 2021 (Line 14151)
- April 2021 (Line 14416)
- March 2021 (Line 14640)
- February 2021 (Line 14850)
- January 2021 (Line 15102)

**All of 2020:** 12 months (Lines 15361-20xxx)

**All of 2019:** 12 months

**All of 2018:** 12 months

**Partial 2017:** June-December (earliest data: June 2017, Line ~25700+)

**Total Remaining After Batch 7:** ~54+ months (~4.5 years of data!)

---

## SUCCESS CRITERIA FOR BATCH 7

### Required for Production
- ✅ 100% CSV→DB verification (Protocol v2.0) for ALL 4 months
- ✅ Zero unmatched CSV transactions
- ✅ Zero unexplained DB transactions
- ✅ All fields verified (date, amount, currency, description, vendor, payment)
- ✅ PDF sample verification for December 2021 (minimum 15-20 transactions)

### Not Required
- ❌ PDF aggregate total reconciliation (deprecated)
- ❌ PDF GRAND TOTAL matching (unreliable)
- ❌ Daily total verification

---

## PROCESSING TIMELINE (ESTIMATED)

| Phase | Task | Est. Time |
|-------|------|-----------|
| **Phase 1** | Parse all 4 months | 1.5 hours |
| **Phase 2** | Import all 4 months | 1.0 hour |
| **Phase 3** | Validate all 4 months | 0.5 hours |
| **Phase 4** | Verify all 4 months (100%) | 1.0 hour |
| **Phase 5** | PDF sample verification (Dec 2021) | 0.5 hours |
| **Documentation** | BATCH-COMPLETE.md | 0.5 hours |
| **TOTAL** | **Complete Batch 7** | **~4-5 hours** |

---

## DELIVERABLES CHECKLIST

### Per Month
- [ ] `parse-december-2021.js` (and similar for each month)
- [ ] `december-2021-CORRECTED.json` (parsed output)
- [ ] `december-2021-METADATA.json` (parser stats)
- [ ] `verify-december-1to1.js` (verification script)
- [ ] RED-FLAGS.md (if issues found)

### Batch Level
- [x] BATCH-MANIFEST.md (this file)
- [ ] BATCH-PREFLIGHT-REPORT.md (CSV analysis)
- [ ] verify-december-pdf-sample.js (PDF verification)
- [ ] BATCH-COMPLETE.md (final summary)

---

## REFERENCE FILES

### Templates (from Batch 6)
- Parser: `batch-apr-jan-2022/january-2022/parse-january-2022.js`
- Verification: `batch-apr-jan-2022/verify-january-1to1.js`
- PDF Sample: `batch-apr-jan-2022/verify-april-pdf-sample.js`

### Protocol
- `MASTER-IMPORT-PROTOCOL.md` (v4.0)

### Previous Batch Results
- `batch-apr-jan-2022/BATCH-COMPLETE.md` (677/677 verified, 100%)

---

## NOTES

### Learnings from Previous 24 Months
1. **Always verify last day of month is included** (April 2023 issue)
2. **Use Protocol v2.0 verification** (1:1 matching mandatory)
3. **Count verification alone is insufficient** (misses parser bugs)
4. **Ignore PDF aggregate totals** (conversion formulas broken)
5. **Parser template approach is efficient** (copy + sed automation)
6. **PDF sample verification is effective** (15-20 transactions validates chain)

### Red Flags Auto-Handled
- Negative amounts → Convert to positive income ✅
- Zero-value transactions → Skip with logging ✅
- Comma-formatted amounts → Strip and parse ✅
- Typo reimbursements → Flexible regex detection ✅

---

**Status:** Ready to begin Phase 1 (Parse December 2021)
**Next Action:** Create `parse-december-2021.js` from template
