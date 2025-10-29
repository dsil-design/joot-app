# Master Knowledge Base Index
**Created:** October 27, 2025
**Status:** AUTHORITATIVE SOURCE OF TRUTH
**Purpose:** Central index for all transaction import knowledge

---

## 📚 Knowledge Base Architecture

This document indexes ALL knowledge accumulated from 15 months of transaction imports (September 2024 - October 2025). Use this as your starting point for ANY import-related work.

---

## 🎯 Primary Knowledge Sources (Read in This Order)

### 1. **KNOWLEDGE-EXTRACTION-COMPLETE-ANALYSIS.md** ⭐ **START HERE**
**Location:** `/Users/dennis/Code Projects/joot-app/KNOWLEDGE-EXTRACTION-COMPLETE-ANALYSIS.md`
**Size:** 59KB, 1,725 lines
**Purpose:** Comprehensive extraction of ALL unique knowledge from 15 months
**Contains:**
- Month-by-month detailed analysis (Sept 2024 - Sept 2025)
- 20+ consolidated lessons with code examples
- 27+ edge cases with resolutions
- Recurring pattern matrix
- Protocol evolution timeline (v1.0 → v3.6+)
- Validation methodology best practices
- Complete checklists

**Use When:**
- Starting ANY new import
- Troubleshooting issues
- Understanding why specific rules exist
- Learning the complete history

---

### 2. **MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md** ⭐ **PROCEDURAL GUIDE**
**Location:** `/Users/dennis/Code Projects/joot-app/scripts/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`
**Size:** 59KB
**Purpose:** Step-by-step protocol for single-month imports
**Contains:**
- Complete knowledge base table (14 months)
- All lessons learned in protocol format
- 4-phase import process (detailed)
- Success criteria and thresholds
- Red flag categories
- Recovery procedures
- Quick reference card

**Use When:**
- Executing a single month import
- Need detailed step-by-step instructions
- Reference during import execution

---

### 3. **BATCH-IMPORT-PROTOCOL-v1.0.md** ⭐ **BATCH AUTOMATION**
**Location:** `/Users/dennis/Code Projects/joot-app/scripts/BATCH-IMPORT-PROTOCOL-v1.0.md`
**Purpose:** Protocol for multi-month batch imports (3+ months at once)
**Contains:**
- Three-gate architecture (Pre-Flight, Processing, Validation)
- Smart pause criteria
- Cross-month validation logic
- Learning system
- Scaling roadmap

**Use When:**
- Importing 3+ months at once
- Need automated workflow with smart checkpoints
- Scaling beyond single-month imports

---

### 4. **FINAL_PARSING_RULES.md** (⚠️ Needs Update to v2.0)
**Location:** `/Users/dennis/Code Projects/joot-app/scripts/FINAL_PARSING_RULES.md`
**Status:** Outdated (last updated October 23, 2025 - before recent lessons)
**Purpose:** CSV parsing rules and column mappings
**Contains:**
- CSV structure overview
- Column mappings for all 4 sections
- Basic tag logic
- Duplicate detection rules

**Note:** This should be updated or deprecated in favor of knowledge extraction document

---

### 5. **PDF-MONTH-MAPPING.md**
**Location:** `/Users/dennis/Code Projects/joot-app/PDF-MONTH-MAPPING.md`
**Purpose:** PDF page number calculation formula
**Contains:**
- Page number formula: `page = 1 + months_back_from_October_2025`
- Quick reference table
- Verification logic

**Use When:** Determining which PDF page corresponds to which month

---

## 📁 Supporting Documents by Category

### Import Prompts (Historical)
**Location:** Root directory and `/scripts/`
**Pattern:** `{MONTH}-{YEAR}-IMPORT-PROMPT.md`
**Purpose:** Original prompts used to execute each month's import
**Note:** Knowledge already extracted into KNOWLEDGE-EXTRACTION document

### Pre-Flight Reports
**Location:** `/scripts/{MONTH}-{YEAR}-PREFLIGHT-REPORT.md`
**Purpose:** Initial analysis before parsing
**Contains:** Transaction counts, expected totals, anomaly detection

### Red Flag Logs
**Location:** `/scripts/{MONTH}-{YEAR}-RED-FLAGS.md`
**Purpose:** Comprehensive issue tracking for each month
**Contains:** All anomalies, conversions, decisions, resolutions
**Use:** Review when debugging similar issues

### Validation Reports
**Location:** `/scripts/{MONTH}-{YEAR}-VALIDATION-REPORT.md`
**Purpose:** 6-level validation results
**Contains:** Match rates, variances, pass/fail status

### Comprehensive Validation
**Location:** `/scripts/{MONTH}-{YEAR}-COMPREHENSIVE-VALIDATION.md`
**Purpose:** 100% transaction-by-transaction verification
**Contains:** PDF ↔ Database line-item matching

---

## 🧠 Knowledge Organization by Topic

### Currency Handling
**Primary Source:** KNOWLEDGE-EXTRACTION, Section "Consolidated Lessons #1"
**Critical Lesson:** Always use Column 6 for THB, NEVER Column 8
**Impact:** Using wrong column invalidated 3 entire months (May/June/July 2025)
**Code Example:** See extraction document lines 245-265

### Negative Amount Handling
**Primary Source:** KNOWLEDGE-EXTRACTION, Section "Consolidated Lessons #2"
**Rule:** Convert all negatives to positive income
**Database Constraint:** CHECK (amount > 0)
**Code Example:** See extraction document lines 267-297

### Tag Application
**Primary Source:** KNOWLEDGE-EXTRACTION, Sections #4, #6, #7, #11
**Critical Distinctions:**
- Column 3 = Reimbursable (NO TAG)
- Column 4 = Business Expense (TAG)
- DSIL Design reimbursements = EXCLUDE from tag
**Verification:** Tag IDs must match expected UUIDs

### Validation Methodology
**Primary Source:** KNOWLEDGE-EXTRACTION, Section "Validation Methodology"
**6-Level Approach:**
1. Section grand totals
2. Daily subtotals
3. Transaction counts
4. Tag distribution
5. Critical transaction spot checks
6. 100% comprehensive 1:1 verification

**Benchmark:** September 2024 achieved 100% perfect match

### Edge Cases
**Primary Source:** KNOWLEDGE-EXTRACTION, "Edge Case Catalog"
**Count:** 27+ documented edge cases with resolutions
**Examples:**
- Zero-dollar transactions → Skip
- Missing merchants → Default to "Unknown"
- Multiple rents → User consultation (may be apartment move)
- DSIL Design reimbursements → Exclude from tag

### Protocol Evolution
**Primary Source:** KNOWLEDGE-EXTRACTION, "Protocol Evolution Timeline"
**Versions:** v1.0 (Oct 2024) → v3.6+ (current)
**Major Changes:**
- v2.0: Added negative amount conversion
- v3.0: Enhanced tag verification
- v3.6: Separated validation from transformation

---

## ✅ Pre-Import Checklist (Use Every Time)

Before starting ANY import:

### 1. Knowledge Review
- [ ] Read relevant sections of KNOWLEDGE-EXTRACTION document
- [ ] Review lessons from similar months (same location/season)
- [ ] Check for known patterns in target month

### 2. Protocol Selection
- [ ] Single month? Use MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6
- [ ] 3+ months? Use BATCH-IMPORT-PROTOCOL-v1.0

### 3. Reference Verification
- [ ] Verify PDF page number using PDF-MONTH-MAPPING
- [ ] Locate CSV line ranges
- [ ] Check for existing red flag logs from nearby months

### 4. Lessons Application
- [ ] Ensure parser uses Column 6 for THB (not Column 8)
- [ ] Verify negative amount conversion logic present
- [ ] Confirm comma-formatted amount handling
- [ ] Check typo reimbursement regex
- [ ] Verify DSIL Design exclusion logic
- [ ] Confirm tag verification queries ready

### 5. Expected Patterns
- [ ] Review historical THB% for similar months
- [ ] Check typical transaction counts
- [ ] Identify expected recurring expenses
- [ ] Note any known seasonal patterns

---

## 🔄 Post-Import Knowledge Updates

After completing ANY import:

### 1. Document New Learnings
- [ ] Update KNOWLEDGE-EXTRACTION if new lessons discovered
- [ ] Add month to completion table
- [ ] Document any new edge cases

### 2. Update Protocols
- [ ] Increment protocol version if major changes
- [ ] Update thresholds if patterns changed
- [ ] Add new automation rules if patterns established

### 3. Preserve Red Flags
- [ ] Ensure red flag log saved for month
- [ ] Cross-reference with similar issues in other months
- [ ] Update pattern catalog if recurring issue

### 4. Validate Knowledge Completeness
- [ ] Confirm all unique learnings captured
- [ ] Verify nothing lost from import process
- [ ] Update this index if new documents created

---

## 📊 Knowledge Statistics

**As of October 27, 2025:**

### Coverage
- **Months Documented:** 15 (Sept 2024 - Oct 2025, excluding current Oct 2025)
- **Completed Imports:** 14
- **Total Transactions:** ~2,688
- **Total Files:** 60+ source documents
- **Knowledge Extraction:** 1,725 lines, 59KB

### Lessons Learned
- **Major Lessons:** 20+ consolidated
- **Edge Cases:** 27+ documented
- **Protocol Versions:** 6 (v1.0 → v3.6+)
- **Critical Patterns:** 15+ identified

### Quality Metrics
- **Validation Success Rate:** 100% (all imports passed)
- **Perfect Match Rate:** 1 month (Sept 2024 benchmark)
- **Re-import Required:** 3 months (May/June/July 2025 - currency issue)
- **Zero-Tag Disaster:** 1 month (March 2025 - fixed)

---

## 🎯 Quick Reference: Top 5 Critical Lessons

**These cannot be forgotten - they invalidate entire imports:**

### 1. Currency Column (MOST CRITICAL)
❌ **NEVER** use Column 8 (conversion)
✅ **ALWAYS** use Column 6 (THB original) or Column 7/9 (USD original)
**Impact:** Wrong = entire month invalidated

### 2. Tag Verification Mandatory
❌ **NEVER** assume tags applied correctly
✅ **ALWAYS** verify tag counts and IDs post-import
**Impact:** March 2025 imported 253 transactions with ZERO tags

### 3. Negative Amount Conversion
❌ **NEVER** leave negative amounts in output
✅ **ALWAYS** convert to positive income
**Impact:** Database constraint violation = import fails

### 4. Validation Only Verifies
❌ **NEVER** apply transformations during validation
✅ **ALWAYS** separate parsing (transform) from validation (verify)
**Impact:** November 2024 lesson - validation corrupts data if it transforms

### 5. DSIL Design Exclusion
❌ **NEVER** tag DSIL Design/LLC transactions as "Reimbursement"
✅ **ALWAYS** check merchant before applying Reimbursement tag
**Impact:** Miscategorizes company income as personal reimbursement

---

## 🚀 Next Steps for Batch Import

**You're ready to start the 3-month batch import (Aug-Jun 2024):**

### Before Starting
1. ✅ Knowledge extraction complete
2. ✅ Batch protocol created
3. ✅ Master index created (this file)
4. ✅ All 15 months of learnings captured

### Execution
Use this kickoff prompt:

```
Execute batch import for August 2024 through June 2024 using BATCH-IMPORT-PROTOCOL-v1.0.

Target months: August 2024, July 2024, June 2024

Reference knowledge base: KNOWLEDGE-EXTRACTION-COMPLETE-ANALYSIS.md
Reference protocols: MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md

Follow the three-gate process:
- Gate 1: Batch Pre-Flight Analysis (pause for my review)
- Gate 2: Sequential month processing (auto-proceed unless unusual patterns detected)
- Gate 3: Batch validation and cross-month analysis (pause for my final approval)

Pause criteria: Flag ANY transaction that seems unusual or out of place based on the 15 months of import history documented in KNOWLEDGE-EXTRACTION-COMPLETE-ANALYSIS.md.

Red flag logging: Create separate red flag files for each month documenting all anomalies, conversions, and decisions for later review.

Begin with Gate 1.
```

---

## 📝 Maintenance Notes

**This index should be updated:**
- After each batch import
- When new lessons are discovered
- When protocols are revised
- When file locations change

**Version History:**
- v1.0 (October 27, 2025): Initial index creation after 15-month knowledge extraction

---

**Status:** ✅ COMPLETE & CURRENT
**All knowledge from 15 months preserved and indexed**
**Ready for batch import execution**
