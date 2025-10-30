# BATCH 5 MANIFEST: August-July-June-May 2022

**Batch ID:** batch-aug-may-2022
**Status:** 🚧 IN PROGRESS
**Protocol:** MASTER-IMPORT-PROTOCOL v3.0 + Protocol v2.0 Verification
**Target Success Rate:** 100% (matching Batches 1-4 performance)

---

## 📊 BATCH OVERVIEW

### Batch Scope
- **Period:** May 2022 - August 2022 (4 months)
- **Expected Volume:** ~430-510 transactions (based on Batch 4 patterns)
- **CSV Source:** `/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv`
- **User Email:** dennis@dsil.design

### Processing Order
1. August 2022 (Most recent)
2. July 2022
3. June 2022
4. May 2022 (Oldest)

---

## 📁 CSV LINE RANGES

### August 2022
**Expense Tracker:** Lines 10487-10785 (~299 lines)
- Start: Line 10487 "August 2022: Expense Tracker"
- First transaction: Line 10490 (Monday, August 1, 2022)
- Last transaction: Line ~10783 (Wednesday, August 31, 2022)

**Gross Income Tracker:** Lines 10786-10795 (~10 lines)
- Start: Line 10786 "August 2022: Gross Income Tracker"
- Transactions: Lines 10788-10791 (4 income transactions)

**Personal Savings:** Lines 10797-10801 (~5 lines)
- Start: Line 10797 "August 2022: Personal Savings & Investments"
- Transactions: Lines 10799-10800 (2 savings transactions)

**Estimated Total:** ~120-130 transactions

---

### July 2022
**Expense Tracker:** Lines 10813-11006 (~194 lines)
- Start: Line 10813 "July 2022: Expense Tracker"
- First transaction: Line 10816 (Friday, July 1, 2022)
- Last transaction: Line ~11004 (Sunday, July 31, 2022)

**Gross Income Tracker:** Lines 11007-11021 (~15 lines)
- Start: Line 11007 "July 2022: Gross Income Tracker"
- Transactions: Lines 11009-11015 (7 income transactions)

**Personal Savings:** Lines 11023-11027 (~5 lines)
- Start: Line 11023 "July 2022: Personal Savings & Investments"
- Transactions: Lines 11025-11026 (2 savings transactions)

**Estimated Total:** ~120-130 transactions

---

### June 2022
**Expense Tracker:** Lines 11039-11191 (~153 lines)
- Start: Line 11039 "June 2022: Expense Tracker"
- First transaction: Line 11042 (Wednesday, June 1, 2022)
- Last transaction: Line ~11189 (Thursday, June 30, 2022)

**Gross Income Tracker:** Lines 11192-11199 (~8 lines)
- Start: Line 11192 "June 2022: Gross Income Tracker"
- Transactions: Lines 11194-11195 (2 income transactions)

**Personal Savings:** Lines 11201-11205 (~5 lines)
- Start: Line 11201 "June 2022: Personal Savings & Investments"
- Transactions: Lines 11203-11204 (2 savings transactions)

**Estimated Total:** ~110-120 transactions

---

### May 2022
**Expense Tracker:** Lines 11217-11391 (~175 lines)
- Start: Line 11217 "May 2022: Expense Tracker"
- First transaction: Line 11220 (Sunday, May 1, 2022)
- Last transaction: Line ~11389 (Tuesday, May 31, 2022)

**Gross Income Tracker:** Lines 11392-11402 (~11 lines)
- Start: Line 11392 "May 2022: Gross Income Tracker"
- Transactions: Lines 11394-11398 (5 income transactions)

**Personal Savings:** Lines 11404-11408 (~5 lines)
- Start: Line 11404 "May 2022: Personal Savings & Investments"
- Transactions: Lines 11406-11407 (2 savings transactions)

**Estimated Total:** ~110-120 transactions

---

## 🎯 BATCH TOTALS

### Estimated Transaction Counts
- **August 2022:** ~120-130 transactions
- **July 2022:** ~120-130 transactions
- **June 2022:** ~110-120 transactions
- **May 2022:** ~110-120 transactions
- **TOTAL ESTIMATE:** ~460-500 transactions

### Section Distribution
- **Expense Tracker:** ~450-480 transactions
- **Gross Income:** ~15-20 transactions
- **Personal Savings:** ~8 transactions

---

## 🌍 EXPECTED PATTERNS

### Location Indicators (Based on 2022 patterns)
- **September 2022:** 100% USD (USA only)
- **October 2022:** 100% USD (USA only)
- **November 2022:** 79% THB / 21% USD (Primarily Thailand)
- **December 2022:** 50% THB / 50% USD (Dual residence)

**Expected for May-August 2022:**
- Likely USA period (expect high USD %)
- Watch for transition to Thailand in later months
- Dual residence pattern possible

### Known Expenses (2022)
- **USA Rent:** Jordan $887/month (when in USA)
- **Thailand Rent:** Panya THB 19,000/month (when in Thailand)
- **Subscriptions:** Monthly recurring (Google, Netflix, etc.)
- **Savings:** ~$750-800/month (Coinbase + Vanguard)

---

## ✅ VERIFICATION REQUIREMENTS

### Per-Month Checklist
- [ ] All CSV transactions parsed successfully
- [ ] All transactions imported to database
- [ ] 100% CSV→DB verification (Protocol v2.0)
- [ ] 100% PDF→DB verification (Protocol v2.0)
- [ ] All red flags documented and resolved
- [ ] Metadata files generated

### Batch-Level Requirements
- [ ] All 4 months completed with 100% verification
- [ ] Zero unmatched transactions across all levels
- [ ] Complete audit trail preserved
- [ ] PDF-VERIFICATION-COMPLETE.md created
- [ ] BATCH-COMPLETE.md created

---

## 📋 DELIVERABLES CHECKLIST

### Per Month
- [ ] Parser script (parse-{month}-2022.js)
- [ ] Parsed data ({month}-2022-CORRECTED.json)
- [ ] Metadata file ({month}-2022-METADATA.json)
- [ ] CSV→DB verification script (verify-{month}-1to1.js)
- [ ] PDF→DB verification script (verify-{month}-pdf-1to1.js)
- [ ] RED-FLAGS.md (if issues found)

### Batch Level
- [x] BATCH-MANIFEST.md (this file)
- [ ] PDF-VERIFICATION-COMPLETE.md
- [ ] BATCH-COMPLETE.md

---

## 📝 NOTES

### CSV Data Quality
Based on Batch 4 learnings, watch for:
- Date typos (year, month, or day errors)
- Zero-value transactions (skip during parsing)
- Negative amounts (convert to positive income)
- Comma-formatted amounts in non-THB fields

### Verification Standards
- **Protocol v2.0:** 1:1 transaction matching required
- **CSV→DB:** 100% match rate mandatory
- **PDF→DB:** 100% match rate mandatory
- **Aggregate Totals:** Ignore (unreliable exchange rates)

---

**Created:** 2025-10-30
**Last Updated:** 2025-10-30
**Status:** Line ranges identified, ready for parsing
