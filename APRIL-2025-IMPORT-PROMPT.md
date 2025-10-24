# Import April 2025 Transaction Data

Execute the 4-Phase Import Protocol v3.1 with comprehensive red flag logging for April 2025.

## Context

- **Protocol Version**: 3.1 (with Red Flag Logging)
- **Previous Imports**: Sept, Aug, July, June, May 2025 (all validated ✅)
- **Current Database**: ~893 transactions for dennis@dsil.design
- **Target Month**: April 2025

## Source Files

- **PDF**: `csv_imports/Master Reference PDFs/Budget for Import-page5.pdf` (April 2025)
- **CSV**: `csv_imports/fullImport_20251017.csv`
- **Protocol**: `MAY-2025-IMPORT-PROTOCOL.md` (use as template)
- **Parsing Rules**: `scripts/FINAL_PARSING_RULES.md`

## Critical Requirements

1. **Currency Handling**: Store original currency values (THB from Column 6, USD from Column 7/9, NEVER use Column 8)
2. **Rent Verification**: Verify rent = THB 35,000.00 (NOT ~$1074)
3. **Red Flag Logging**: Track ALL anomalies across all 4 phases in consolidated log
4. **100% Validation**: Verify every transaction bidirectionally (PDF→DB and DB→PDF)

## Expected Patterns (Based on Previous Months)

- **Transaction Count**: ~170-190 (estimate)
- **Currency Split**: ~45-50% USD, ~50-55% THB
- **Reimbursements**: ~15-30
- **Tags**: Reimbursement, Florida House, Business Expense, Savings/Investment
- **Variance Threshold**: ±2% on Expense Tracker, exact match on other sections

## Execution

Follow the 4-Phase Import Protocol exactly as documented in `MAY-2025-IMPORT-PROTOCOL.md`:

### Phase 1: Pre-Flight Analysis
- Identify line ranges for all 4 sections in CSV
- Extract grand totals from PDF
- Detect duplicates
- Verify parsing script
- Create `APRIL-2025-PREFLIGHT-REPORT.md`
- Create `APRIL-2025-RED-FLAGS.md` (initial log)

### Phase 2: Parse & Prepare
- Parse all 4 sections following FINAL_PARSING_RULES.md
- Apply tag logic correctly
- Handle duplicates (keep Expense Tracker version)
- Create `april-2025-CORRECTED.json`
- Create `APRIL-2025-PARSE-REPORT.md`
- Append to `APRIL-2025-RED-FLAGS.md`

### Phase 3: Database Import
- Run: `node scripts/db/import-month.js --file=scripts/april-2025-CORRECTED.json --month=2025-04`
- Verify import summary matches parse report
- Append to `APRIL-2025-RED-FLAGS.md` if issues found

### Phase 4: Comprehensive Validation
- Validate all 6 levels (section totals, daily subtotals, counts, tags, critical transactions, 100% coverage)
- Create `APRIL-2025-VALIDATION-REPORT.md`
- Create `APRIL-2025-COMPREHENSIVE-VALIDATION.md`
- Append all discrepancies to `APRIL-2025-RED-FLAGS.md`

## Success Criteria

### Must Pass:
- ✅ Rent = 35,000 THB (not converted)
- ✅ All currencies stored as original values
- ✅ Transaction count matches parse report
- ✅ Tag distribution matches parse report
- ✅ Expense Tracker variance ≤2%
- ✅ All section totals within thresholds
- ✅ 100% PDF transactions found in DB
- ✅ 100% DB transactions found in PDF

### Acceptable:
- ⚠️ Daily match rate ≥50% (ideal: ≥80%)
- ⚠️ Daily variance <$100 (all days)
- ⚠️ Minor THB→USD rounding differences

## Red Flag Log Requirements

For EACH anomaly discovered in ANY phase, log:
- Transaction details (date, description, amount, line number)
- Issue type (missing amount, duplicate, variance, etc.)
- Severity: CRITICAL / WARNING / INFO
- Phase: Pre-Flight / Parsing / Import / Validation
- Status: OPEN / RESOLVED / ACCEPTABLE
- Root cause and notes

## Deliverables

After all 4 phases:
1. `scripts/APRIL-2025-PREFLIGHT-REPORT.md`
2. `scripts/april-2025-CORRECTED.json`
3. `scripts/APRIL-2025-PARSE-REPORT.md`
4. `scripts/APRIL-2025-VALIDATION-REPORT.md`
5. `scripts/APRIL-2025-COMPREHENSIVE-VALIDATION.md`
6. `scripts/APRIL-2025-RED-FLAGS.md` (consolidated log from all phases)

## Notes

- Use May 2025 import as reference (same protocol, same structure)
- Exchange rate may vary - derive from rent transaction in April PDF
- Pre-flight analysis may be conservative - actual import may capture more data
- THB→USD rounding differences are expected and acceptable
- Daily variance <80% match rate is acceptable if all <$100

---

**Status**: Ready to execute
**Next Action**: Begin Phase 1 with data-engineer agent
