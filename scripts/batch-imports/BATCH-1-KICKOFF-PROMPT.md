# Batch 1 Import Kickoff: August-July-June-May 2023

Copy and paste this entire prompt into a new Claude Code tab to begin Batch 1.

---

## TASK: Execute Batch 1 Import (Aug-Jul-Jun-May 2023)

I need you to execute a comprehensive batch transaction import for **4 months** (August, July, June, May 2023) using the proven Three-Gate Architecture. This follows the successful completion of the Nov-Oct-Sept 2023 pilot batch (367 transactions, 100% verified).

---

## CONTEXT

**What We've Done Before:**
- Successfully imported Nov-Oct-Sept 2023 (3 months, 367 transactions)
- Achieved 100% accuracy with 0 errors, 0 duplicates
- Used Three-Gate Architecture: Pre-Flight → Import → Verification
- Confirmed dual residence pattern (USA + Thailand since June 2017)

**What We're Doing Now:**
- Batch 1: August-July-June-May 2023 (4 months)
- Expected: ~1,060-1,160 transactions
- All months are Thailand-based (high THB percentage expected)
- Follow EXACT same process as Nov-Oct-Sept pilot

---

## PROTOCOLS TO FOLLOW

**Primary Protocols:**
1. **BATCH-IMPORT-PROTOCOL v1.2** (`scripts/batch-imports/BATCH-IMPORT-PROTOCOL-v1.2.md`)
2. **MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6** (`scripts/batch-imports/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`)
3. **SCALED-UP-BATCH-PLAN-JAN-AUG-2023.md** (`scripts/batch-imports/SCALED-UP-BATCH-PLAN-JAN-AUG-2023.md`)

**Reference Materials:**
- Successful pilot: `scripts/batch-imports/batch-nov-sept-2023/`
- Dual residence context: `scripts/batch-imports/batch-nov-sept-2023/DUAL-RESIDENCE-CONTEXT.md`
- Parsing templates: `parse-november-2023.js`, `parse-october-2023.js`, `parse-september-2023.js`
- Import script: `scripts/db/import-month.js`
- Verification scripts: `verify-batch-against-pdfs.js`, `gate3-complete-verification.js`

---

## THREE-GATE ARCHITECTURE

### **Gate 1: Pre-Flight Analysis** (2-3 hours)

Execute comprehensive batch analysis for all 4 months:

1. **CSV Line Range Identification**
   - Scan master CSV file for each month
   - Identify line ranges for August, July, June, May 2023
   - Expected ranges (approximate):
     - August 2023: lines ~7174-7460
     - July 2023: lines ~7461-7710
     - June 2023: lines ~7711-7980
     - May 2023: lines ~7981-8250

2. **Transaction Count Estimation**
   - Estimate transaction count per month
   - Expected totals:
     - August: ~265-295 transactions
     - July: ~235-265 transactions
     - June: ~250-280 transactions
     - May: ~255-285 transactions

3. **Red Flag Identification**
   - Negative amount reimbursements
   - Comma-formatted amounts (large expenses)
   - Typo reimbursements (Remibursement, Rembursement, etc.)
   - Dual residence rents (both USA + Thailand)
   - Large one-time expenses (>$1,000)
   - Income adjustments

4. **Currency Distribution Analysis**
   - Expect 45-55% THB (Thailand-based months)
   - Verify dual residence pattern continues

5. **Critical Transaction Spotting**
   - Both rents each month ($957-987 USD + THB 25,000)
   - Large expenses (flights, electronics)
   - Reimbursement patterns

**Deliverables:**
- `GATE-1-EXECUTIVE-SUMMARY.md`
- `BATCH-PREFLIGHT-REPORT.md`
- `BATCH-MANIFEST.md`
- Red flags document for each month

---

### **Gate 2: Per-Month Import** (4 Phases × 4 Months)

**Process in REVERSE CHRONOLOGICAL order: August → July → June → May**

For EACH month, complete all 4 phases before moving to the next month:

#### **Phase 1: Parse CSV** (10-15 min per month)

1. Create parsing script using template from `parse-november-2023.js`
2. Update line ranges for the specific month
3. Set target month (e.g., '2023-08')
4. Run parsing script
5. Output: `{month}-2023-CORRECTED.json`

**Template location:** `scripts/batch-imports/batch-nov-sept-2023/november-2023/parse-november-2023.js`

**Key parsing patterns to preserve:**
- Negative amount conversion to positive income
- Comma-formatted amount handling: `parseAmount()` function
- Typo-tolerant reimbursement regex: `/^Re(im|mi|m)?burs[e]?ment:?/i`
- Currency extraction: Column 6 (THB), Column 7/9 (USD), NEVER Column 8
- Deduplication key: date + description + amount + currency + merchant

#### **Phase 2: Import to Database** (5-10 min per month)

1. Run import script:
   ```bash
   node scripts/db/import-month.js \
     --file=scripts/batch-imports/batch-aug-may-2023/{month}-2023/{month}-2023-CORRECTED.json \
     --month=2023-{MM}
   ```

2. Save log to `/tmp/{month}-2023-import.log`

3. Review import summary for:
   - Total transactions imported vs expected
   - New vendors created
   - New payment methods created
   - New tags created
   - Skipped duplicates (should be 0 for clean months)

#### **Phase 3: Validation Queries** (10-15 min per month)

Run comprehensive validation:

1. **Transaction Count Check**
   ```sql
   SELECT COUNT(*) FROM transactions
   WHERE user_id = 'USER_ID'
   AND transaction_date >= '2023-08-01'
   AND transaction_date <= '2023-08-31';
   ```

2. **Dual Rent Verification**
   - USA Rent: ~$957-987 (USD)
   - Thailand Rent: THB 25,000 (THB)

3. **Tag Verification**
   - Count Reimbursement tags
   - Count Savings/Investment tags
   - Verify tag UUIDs match database

4. **Currency Distribution**
   - Calculate THB percentage
   - Expected: 45-55% for Thailand months

5. **No Negative Amounts**
   ```sql
   SELECT COUNT(*) FROM transactions
   WHERE amount < 0 AND transaction_date BETWEEN '2023-08-01' AND '2023-08-31';
   -- Should return 0
   ```

#### **Phase 4: Per-Month PDF Verification** (20-30 min per month)

Compare against PDF bank statement:

1. Verify both rents present
2. Check large expenses (>$1,000)
3. Validate reimbursement transactions
4. Spot-check 5-10 random transactions
5. Confirm currency distribution matches

**✅ MUST PASS Phase 4 before proceeding to next month**

---

### **Gate 3: 100% Batch Verification** (2-3 hours)

After all 4 months imported, execute comprehensive verification:

1. **Run Comprehensive Verification Script**
   ```bash
   node scripts/batch-imports/batch-aug-may-2023/gate3-complete-verification.js
   ```

2. **1:1 Transaction Matching**
   - Compare all JSON transactions vs database
   - Verify no missing transactions
   - Verify no extra transactions
   - Check for duplicates

3. **Field-Level Verification**
   - Transaction type (expense vs income)
   - Vendor associations
   - Payment method associations
   - Tag associations
   - Amount accuracy
   - Currency correctness

4. **Cross-Month Analysis**
   - Verify 8 total rents (2 per month × 4 months)
   - Check subscription continuity
   - Validate tag patterns
   - Confirm currency distributions

5. **PDF Page-by-Page Verification**
   - August: PDF page [TBD]
   - July: PDF page [TBD]
   - June: PDF page [TBD]
   - May: PDF page [TBD]

**Deliverables:**
- `GATE3-VERIFICATION-REPORT.json`
- `GATE3-FINAL-REPORT.md`
- `BATCH-IMPORT-COMPLETE.md`

---

## CRITICAL REQUIREMENTS

### ✅ Must Follow

1. **Reverse Chronological Order:** August → July → June → May
2. **Independent Month Validation:** Complete all 4 phases per month before next
3. **100% Verification:** Gate 3 is mandatory, not optional
4. **Dual Residence Pattern:** Both USA + Thailand rents MUST appear each month
5. **No Negative Amounts in Database:** Convert negative income to positive during parsing
6. **Currency Integrity:** THB from Column 6, USD from Column 7/9, NEVER Column 8
7. **Tag Verification:** Two-step process (count + UUID validation)
8. **Deduplication:** Include merchant in key to avoid false duplicates

### ❌ Must Avoid

1. **Do NOT skip any phases** - all 4 phases required per month
2. **Do NOT proceed to next month** if current month fails validation
3. **Do NOT use Column 8** for currency values (conversion column)
4. **Do NOT create new payment method schema** - use existing
5. **Do NOT skip Gate 3** - 100% verification is mandatory
6. **Do NOT batch process** - each month independently validated

---

## EXPECTED PATTERNS (From Pilot)

**Dual Residence Rents:**
- USA: $957-987/month + utilities (Conshohocken, PA)
- Thailand: THB 25,000/month (Bangkok)
- Both are valid expenses (user confirmed since June 2017)

**Currency Distribution:**
- Thailand months: 45-55% THB
- USA months: 2-4% THB
- Transition months: 40-45% THB

**Common Red Flags (Auto-Handled):**
- Negative reimbursements → Convert to positive income
- Comma-formatted amounts ($1,242.05) → parseAmount() handles
- Typo reimbursements (Remibursement) → Flexible regex catches
- Apostrophe variations (Month's vs Month's) → Unicode 8217 handling

**Tags to Watch:**
- Reimbursement: Income from friends/roommates
- Savings/Investment: Transfers to savings accounts
- Florida House: Property-related expenses
- Business Expense: Work-related costs

---

## DIRECTORY STRUCTURE

Create this structure for Batch 1:

```
scripts/batch-imports/batch-aug-may-2023/
├── GATE-1-EXECUTIVE-SUMMARY.md
├── BATCH-PREFLIGHT-REPORT.md
├── BATCH-MANIFEST.md
├── august-2023/
│   ├── parse-august-2023.js
│   ├── august-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── july-2023/
│   ├── parse-july-2023.js
│   ├── july-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── june-2023/
│   ├── parse-june-2023.js
│   ├── june-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── may-2023/
│   ├── parse-may-2023.js
│   ├── may-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── verify-batch-against-pdfs.js
├── gate3-complete-verification.js
├── GATE3-VERIFICATION-REPORT.json
├── GATE3-FINAL-REPORT.md
└── BATCH-IMPORT-COMPLETE.md
```

---

## SUCCESS CRITERIA

### Per-Month (Gate 2 Phase 4):
- ✅ Transaction count within ±5% of expected
- ✅ Both rents verified (USA + Thailand)
- ✅ All tags verified (count and UUID mapping)
- ✅ No negative amounts in database
- ✅ Currency distribution matches expected (45-55% THB)
- ✅ All critical transactions found

### Batch-Wide (Gate 3):
- ✅ All 4 months individually validated
- ✅ 100% PDF verification (~1,060-1,160 transactions)
- ✅ 8 total rents confirmed (2 per month)
- ✅ Subscription continuity verified
- ✅ Tag distributions within expected ranges
- ✅ Currency patterns match Thailand location
- ✅ No systematic errors detected
- ✅ 0 missing transactions
- ✅ 0 extra transactions
- ✅ 0 duplicates

---

## ESTIMATED TIME

Based on successful Nov-Oct-Sept pilot:

| Phase | Time per Month | Total (4 months) |
|-------|----------------|------------------|
| **Gate 1: Pre-Flight** | - | 2-3 hours |
| **Gate 2 Phase 1: Parse** | 10-15 min | 40-60 min |
| **Gate 2 Phase 2: Import** | 5-10 min | 20-40 min |
| **Gate 2 Phase 3: Validate** | 10-15 min | 40-60 min |
| **Gate 2 Phase 4: PDF Verify** | 20-30 min | 80-120 min |
| **Gate 3: Comprehensive** | - | 2-3 hours |
| **TOTAL** | **45-70 min/month** | **10-14 hours** |

---

## FINAL CHECKLIST

Before starting:
- [ ] Read BATCH-IMPORT-PROTOCOL v1.2
- [ ] Read MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6
- [ ] Review SCALED-UP-BATCH-PLAN-JAN-AUG-2023.md
- [ ] Review successful pilot: batch-nov-sept-2023/
- [ ] Understand dual residence context
- [ ] Confirm database connection working
- [ ] Confirm CSV file accessible
- [ ] Confirm PDF files accessible

During execution:
- [ ] Complete Gate 1 for all 4 months
- [ ] Process each month in reverse chronological order
- [ ] Complete all 4 phases per month before next
- [ ] Save all logs to /tmp/
- [ ] Generate all required deliverables
- [ ] Pass Gate 3 with 100% verification

After completion:
- [ ] All 4 months imported successfully
- [ ] All validation passed
- [ ] All documentation generated
- [ ] Ready to proceed to Batch 2 (Apr-Mar-Feb-Jan 2023)

---

## QUESTIONS OR ISSUES

If you encounter:
- **Unexpected transaction counts:** Flag in Gate 1, investigate before proceeding
- **Missing dual rents:** STOP - investigate CSV parsing logic
- **High duplicate count:** Check deduplication key includes merchant
- **Negative amounts in DB:** STOP - parsing script failed to convert
- **Tag application failures:** Use two-step verification, check UUIDs
- **Gate 3 verification failures:** Investigate discrepancies before proceeding

User is available for consultation on:
- Red flag interpretation
- Large expense confirmation
- Unusual patterns requiring context
- Decision points not covered by protocols

---

## BEGIN EXECUTION

Start with Gate 1: Pre-Flight Analysis for all 4 months (August, July, June, May 2023).

Use the TodoWrite tool to track progress through all gates and phases.

Execute with the same rigor and attention to detail that achieved 100% accuracy in the Nov-Oct-Sept 2023 pilot.

**Expected outcome:** ~1,060-1,160 transactions imported with 100% accuracy, 0 errors, 0 duplicates, verified 1:1 against CSV and PDF sources.

---

**Ready to begin? Start with Gate 1 Pre-Flight Analysis.**
