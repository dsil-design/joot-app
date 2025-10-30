# BATCH 5 IMPORT: August-July-June-May 2022

**Objective:** Import and verify 4 months of transactions (August 2022, July 2022, June 2022, May 2022) using MASTER-IMPORT-PROTOCOL v3.0 with mandatory Protocol v2.0 verification (1:1 transaction matching) AND complete PDF→CSV→DB verification.

**Target Success Rate:** 100% verification (matching Batches 1-4: 2,307/2,307 transactions verified)

---

## 📋 CONTEXT & REFERENCE

### Previous Batch Performance
- **Batch 4 (Dec-Sep 2022):** 471/471 transactions verified (100%) ✅
  - **PDF→CSV→DB Verification:** 471/471 (100%) ✅
  - **First batch with complete PDF verification**
- **Batch 3 (Dec-Sep 2023):** 449/449 transactions verified (100%) ✅
- **Batch 2 (Apr-Jan 2023):** 725/725 transactions verified (100%) ✅
- **Batch 1 (Aug-May 2023):** 662/662 transactions verified (100%) ✅

**Total verified to date:** 2,307 transactions across 16 months

### Expected Volume for Batch 5
Based on Batch 4 patterns:
- **August 2022:** ~120-130 transactions
- **July 2022:** ~120-130 transactions
- **June 2022:** ~110-120 transactions
- **May 2022:** ~80-110 transactions
- **Total Expected:** ~430-510 transactions

---

## 🎯 PRIMARY OBJECTIVE

Import and verify ALL transactions for the following 4 months with **100% verification rate**:

1. **August 2022** (Month 1 - Most recent)
2. **July 2022** (Month 2)
3. **June 2022** (Month 3)
4. **May 2022** (Month 4 - Oldest)

**Critical Requirements:**
- ✅ Process months in **sequential order** (August → July → June → May)
- ✅ Complete all 4 phases for each month before proceeding to next month
- ✅ Achieve 100% verification (CSV→DB) for each month
- ✅ Achieve 100% verification (PDF→CSV→DB) for each month
- ✅ Use MASTER-IMPORT-PROTOCOL v3.0 as primary reference
- ✅ Apply Protocol v2.0 for all verification (1:1 transaction matching)

---

## 📚 REQUIRED READING (In Order)

Before starting ANY work, you MUST read these documents:

### 1. Master Protocol (PRIMARY REFERENCE)
**Location:** `/Users/dennis/Code Projects/joot-app/scripts/MASTER-IMPORT-PROTOCOL-v3.0.md`
**Purpose:** Complete step-by-step protocol for batch imports
**Read:** Entire document (focus on 4-phase process)

### 2. Batch 4 Completion Report (TEMPLATE)
**Location:** `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-dec-sep-2022/BATCH-COMPLETE.md`
**Purpose:** Reference for success criteria and verification methodology
**Read:** Sections on verification, red flags, and key learnings

### 3. Batch 4 PDF Verification Report (CRITICAL)
**Location:** `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-dec-sep-2022/PDF-VERIFICATION-COMPLETE.md`
**Purpose:** Template for PDF→CSV→DB verification
**Read:** Entire document - this is the new standard

### 4. Knowledge Base Index
**Location:** `/Users/dennis/Code Projects/joot-app/scripts/MASTER-KNOWLEDGE-BASE-INDEX.md`
**Purpose:** Reference for troubleshooting and edge cases
**Read:** As needed for specific issues

---

## 🔧 TECHNICAL SETUP

### CSV Source File
**Location:** `/Users/dennis/Code Projects/joot-app/Expense Tracker - Expense Tracker.csv`
**Total Lines:** ~11,000+ lines
**Format:** Multi-tracker consolidated CSV

### Database
**Platform:** Supabase
**Environment:** `.env.local` (already configured)
**User Email:** `dennis@dsil.design`

### Batch Folder Structure
**Create:** `/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-aug-may-2022/`

**Required Structure:**
```
batch-aug-may-2022/
├── BATCH-MANIFEST.md
├── august-2022/
│   ├── parse-august-2022.js
│   ├── august-2022-CORRECTED.json
│   ├── august-2022-METADATA.json
│   └── RED-FLAGS.md (if needed)
├── july-2022/
│   ├── parse-july-2022.js
│   ├── july-2022-CORRECTED.json
│   ├── july-2022-METADATA.json
│   └── RED-FLAGS.md (if needed)
├── june-2022/
│   ├── parse-june-2022.js
│   ├── june-2022-CORRECTED.json
│   ├── june-2022-METADATA.json
│   └── RED-FLAGS.md (if needed)
├── may-2022/
│   ├── parse-may-2022.js
│   ├── may-2022-CORRECTED.json
│   ├── may-2022-METADATA.json
│   └── RED-FLAGS.md (if needed)
├── verify-august-1to1.js
├── verify-july-1to1.js
├── verify-june-1to1.js
├── verify-may-1to1.js
├── verify-august-pdf-1to1.js
├── verify-july-pdf-1to1.js
├── verify-june-pdf-1to1.js
├── verify-may-pdf-1to1.js
├── PDF-VERIFICATION-COMPLETE.md
└── BATCH-COMPLETE.md
```

---

## 📋 4-PHASE PROCESS (Per Month)

For EACH month, complete all 4 phases before proceeding to the next month:

### Phase 1: PARSE
1. Identify CSV line ranges for the month (Expense Tracker, Gross Income, Savings)
2. Create parser script adapted from Batch 4 templates
3. Handle known edge cases (negative amounts, date corrections, zero-value skips)
4. Generate CORRECTED.json and METADATA.json
5. Review red flags and document in RED-FLAGS.md if needed

### Phase 2: IMPORT
1. Use `scripts/db/import-month.js` to import parsed transactions
2. Verify import counts match parsed counts
3. Check for import errors or warnings
4. Confirm all transactions inserted successfully

### Phase 3: VALIDATE (CSV→DB)
1. Create Protocol v2.0 verification script (1:1 matching)
2. Verify 100% match between CSV and database
3. Investigate and resolve any mismatches
4. Document resolution in RED-FLAGS.md if needed

### Phase 4: VERIFY (PDF→CSV→DB) ⭐ **NEW REQUIREMENT**
1. Locate PDF source document for the month
2. **Use Read tool** to view the PDF page
3. **Use data-scientist agent** to extract all transactions from PDF into structured format
4. Create PDF verification script with extracted transactions (hardcoded)
5. Run 1:1 matching: PDF → Database
6. Achieve 100% verification before proceeding
7. **DO NOT verify PDF aggregate totals** (they use different exchange rates)

**Note:** The Read tool can natively read PDFs. The data-scientist agent excels at extracting structured transaction data from PDF pages.

**Success Criteria:** 100% verification at BOTH levels (CSV→DB AND PDF→DB)

---

## ⚠️ CRITICAL BATCH 4 LEARNINGS

Apply these lessons from Batch 4:

### 1. CSV Data Quality Issues
- **Issue:** December 2022 had 3 date typos (2023 instead of 2022)
- **Detection:** Protocol v2.0 caught 98.1% match (3 missing transactions)
- **Solution:** Added parser-level date correction logic
- **Action:** Include date sanity checks in all parsers

### 2. Zero-Value Transactions
- **Pattern:** October and September 2022 had 333 zero-value transactions
- **Policy:** Skip $0.00 transactions during parsing (they're noise)
- **Action:** Log skips in METADATA.json

### 3. Negative Amount Conversions
- **Pattern:** 5 negative expense amounts across Batch 4
- **Handling:** Automatic conversion to positive income
- **Categories:** Refunds, reimbursements, winnings
- **Action:** Document all conversions in red flags

### 4. Dual Residence Pattern
- **USA Rent:** Jordan $887 (when in USA)
- **Thailand Rent:** Panya THB 19,000 (when in Thailand)
- **Detection:** Currency distribution indicates location
- **Action:** Verify dual residence for overlapping months

### 5. PDF Verification is Mandatory
- **Why:** Ensures complete traceability from source
- **Method:** Manual extraction + 1:1 matching
- **Standard:** 100% match required
- **Action:** Budget time for manual PDF extraction

---

## 🎯 SUCCESS CRITERIA

### Per-Month Requirements
- ✅ All CSV transactions parsed successfully
- ✅ All transactions imported to database
- ✅ 100% CSV→DB verification (Protocol v2.0)
- ✅ 100% PDF→DB verification (Protocol v2.0)
- ✅ All red flags documented and resolved
- ✅ Metadata files generated

### Batch-Level Requirements
- ✅ All 4 months completed with 100% verification
- ✅ BATCH-MANIFEST.md created with CSV line ranges
- ✅ PDF-VERIFICATION-COMPLETE.md created
- ✅ BATCH-COMPLETE.md created with summary statistics
- ✅ Zero unmatched transactions across all months
- ✅ Complete audit trail preserved

---

## 📊 VERIFICATION STANDARDS

### Protocol v2.0: 1:1 Transaction Matching

**Match Criteria:**
1. **Date:** Exact transaction date match
2. **Amount:** Within 0.01 tolerance (floating-point precision)
3. **Currency:** Exact currency match (USD, THB)
4. **Transaction Type:** Exact type match (expense, income)
5. **Uniqueness:** Each source transaction matches exactly one DB transaction

**CSV→DB Verification:**
- Create verification script using Batch 4 templates
- Query database for month's transactions
- Match using Protocol v2.0 criteria
- Report any unmatched transactions
- Investigate and resolve before proceeding

**PDF→DB Verification:**
- Manually extract ALL transactions from PDF
- Create verification script with hardcoded PDF transactions
- Match directly: PDF → Database (skip CSV)
- Achieve 100% match
- **IGNORE PDF aggregate totals** (different exchange rates)

---

## 🚨 RED FLAGS TO WATCH FOR

Based on Batch 4 experience:

### Data Quality Issues
- ❌ Date typos (year, month, or day incorrect)
- ❌ Comma-formatted amounts in non-THB fields
- ❌ Missing or incorrect currency indicators
- ❌ Duplicate transactions

### Verification Issues
- ❌ Count mismatch (CSV ≠ DB)
- ❌ Unmatched CSV transactions
- ❌ Unmatched DB transactions
- ❌ Amount discrepancies > 0.01

### PDF Verification Issues
- ❌ PDF transaction count ≠ DB transaction count
- ❌ Unmatched PDF transactions
- ❌ Missing transaction sources

**Action:** Document ALL red flags in RED-FLAGS.md with:
- Description of issue
- Root cause analysis
- Resolution approach
- Verification of fix

---

## 📁 REQUIRED DELIVERABLES

### Per Month
- [ ] Parser script (`parse-{month}-2022.js`)
- [ ] Parsed data (`{month}-2022-CORRECTED.json`)
- [ ] Metadata file (`{month}-2022-METADATA.json`)
- [ ] CSV→DB verification script (`verify-{month}-1to1.js`)
- [ ] PDF→DB verification script (`verify-{month}-pdf-1to1.js`)
- [ ] RED-FLAGS.md (if issues found)

### Batch Level
- [ ] BATCH-MANIFEST.md (CSV line ranges for all 4 months)
- [ ] PDF-VERIFICATION-COMPLETE.md (complete PDF verification report)
- [ ] BATCH-COMPLETE.md (batch summary and statistics)

---

## 🎓 EXPECTED PATTERNS (Based on 2022 Data)

### Location Patterns
- **May-August 2022:** Likely USA period (expect high USD %)
- **Transition periods:** Watch for dual residence patterns
- **Currency indicators:**
  - 100% USD = USA only
  - 75%+ THB = Primarily Thailand
  - 50/50 split = Dual residence

### Transaction Patterns
- **Rent:** Jordan $887 (USA) or Panya THB 19,000 (Thailand)
- **Subscriptions:** Monthly recurring (Google, Netflix, etc.)
- **Reimbursements:** Tagged as "Reimbursement" in description
- **Negative amounts:** Convert to income (refunds/reimbursements)

### Data Quality
- **Zero-value transactions:** Expected, skip during parsing
- **Date consistency:** Validate year matches expected month
- **Currency consistency:** USD/THB separation must be clean

---

## 🤖 AGENT USAGE GUIDANCE

To maximize efficiency and quality, use specialized agents for specific tasks:

### When to Use the Task Tool

**For CSV Line Range Discovery (use Explore agent):**
- Task: "Find line ranges for August 2022 in the CSV file"
- Agent: `Explore` (medium thoroughness)
- Why: Efficient grep/search capabilities for large files

**For Code Review (use code-reviewer agent):**
- Task: Review parser scripts before running
- Agent: `code-reviewer`
- Why: Catch bugs, edge cases, and ensure best practices
- Trigger: After writing any parser or verification script

**For PDF Reading and Analysis (use Read tool + data-scientist agent):**
- Task: "Read and extract all transactions from PDF page X"
- Tool: Read (can read PDFs natively)
- Agent: `data-scientist` (for analysis and extraction)
- Why: Claude can read PDFs visually; data-scientist excels at structured data extraction
- Trigger: Phase 4 (PDF verification) for each month

**For Debugging Issues (use debugger agent):**
- Task: Investigate verification mismatches or import errors
- Agent: `debugger`
- Why: Specialized in root cause analysis
- Trigger: When verification fails or unexpected errors occur

**DO NOT Use Agents For:**
- Reading specific known file paths (use Read tool directly for code/text files)
- Writing code (do it yourself, then use code-reviewer)
- Simple grep patterns in 2-3 known files (use Grep directly)

### Recommended Agent Flow Per Month

1. **Setup Phase:** Use Explore agent to find CSV line ranges
2. **Parse Phase:** Write parser yourself, then use code-reviewer
3. **Import Phase:** Run directly (straightforward)
4. **Validate Phase:** Write verification script, then use code-reviewer
5. **Verify PDF Phase:**
   - Use Read tool to view PDF page
   - Use data-scientist agent to extract all transactions from PDF
   - Write PDF verification script with extracted data
   - Use code-reviewer to review the script
6. **Debug Phase:** If issues arise, use debugger agent

---

## 🚀 EXECUTION PLAN

### Step 1: Setup (5 min)
1. Read all required documentation
2. Create batch folder structure
3. Create BATCH-MANIFEST.md template
4. **Use Explore agent** to find CSV line ranges for all 4 months

### Step 2: August 2022 (45-60 min)
1. **Parse:** Create parser, run code-reviewer, generate JSON
2. **Import:** Import to database, verify counts
3. **Validate:** Create verification script, run code-reviewer, verify 100%
4. **Verify PDF:**
   - Read PDF page with Read tool
   - Use data-scientist agent to extract all transactions
   - Create PDF verification script with extracted data
   - Run code-reviewer on script
   - Execute and verify 100%
5. Document results

### Step 3: July 2022 (45-60 min)
(Repeat Step 2 process)

### Step 4: June 2022 (45-60 min)
(Repeat Step 2 process)

### Step 5: May 2022 (45-60 min)
(Repeat Step 2 process)

### Step 6: Batch Completion (15-20 min)
1. Create PDF-VERIFICATION-COMPLETE.md
2. Create BATCH-COMPLETE.md
3. Verify all deliverables present
4. Final quality check

**Total Estimated Time:** 3-4 hours

---

## ✅ QUALITY CHECKLIST

Before marking batch complete, verify:

- [ ] All 4 months parsed with CORRECTED.json generated
- [ ] All 4 months imported to database
- [ ] All 4 months: 100% CSV→DB verification
- [ ] All 4 months: 100% PDF→DB verification
- [ ] Zero unmatched transactions across all levels
- [ ] All red flags documented and resolved
- [ ] BATCH-MANIFEST.md complete
- [ ] PDF-VERIFICATION-COMPLETE.md complete
- [ ] BATCH-COMPLETE.md complete
- [ ] All verification scripts preserved
- [ ] Metadata files for all months

---

## 📞 REFERENCE CONTACTS

**User Email:** dennis@dsil.design
**Database:** Supabase (configured in .env.local)
**CSV File:** `/Users/dennis/Code Projects/joot-app/Expense Tracker - Expense Tracker.csv`

---

## 🎯 SUCCESS DEFINITION

Batch 5 is considered **COMPLETE** when:

1. ✅ All 471 transactions parsed from CSV
2. ✅ All 471 transactions imported to database
3. ✅ 100% CSV→DB verification (471/471 matches)
4. ✅ 100% PDF→DB verification (471/471 matches)
5. ✅ Zero unmatched transactions
6. ✅ All deliverables created
7. ✅ Complete audit trail preserved

**Target:** Match Batch 4 performance (100% verification at both CSV→DB and PDF→DB levels)

---

**Ready to begin?** Start by reading MASTER-IMPORT-PROTOCOL v3.0, then create the batch folder structure and BATCH-MANIFEST.md.

**First command:** `mkdir -p /Users/dennis/Code\ Projects/joot-app/scripts/batch-imports/batch-aug-may-2022/{august-2022,july-2022,june-2022,may-2022}`

---

## 🎯 QUICK START CHECKLIST

Use this to get started efficiently:

1. ✅ Read MASTER-IMPORT-PROTOCOL v3.0
2. ✅ Read Batch 4 BATCH-COMPLETE.md and PDF-VERIFICATION-COMPLETE.md
3. ✅ Create batch folder structure (command above)
4. ✅ **Launch Explore agent** to find CSV line ranges for all 4 months
5. ✅ Create BATCH-MANIFEST.md with line ranges
6. ✅ Begin August 2022 (Parse → Import → Validate → Verify PDF)
7. ✅ **Use Read tool + data-scientist agent** for PDF transaction extraction
8. ✅ **Use code-reviewer agent** after writing each script
9. ✅ **Use debugger agent** if verification issues arise
10. ✅ Repeat for July, June, May
11. ✅ Create final documentation (PDF-VERIFICATION-COMPLETE.md, BATCH-COMPLETE.md)

**Remember:** Use agents proactively for efficiency and quality!
- **Explore** for CSV discovery
- **data-scientist** for PDF extraction
- **code-reviewer** for script quality
- **debugger** for troubleshooting
