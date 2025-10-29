# Batch Import Protocol v1.0
**Created:** October 27, 2025
**Status:** ACTIVE - LEARNING MODE
**Base Protocol:** Monthly Transaction Import Protocol v3.6
**Purpose:** Scale monthly imports from 1 month to 3+ months while maintaining quality

---

## 🎯 Mission Statement

Execute multiple sequential monthly imports with the same rigor as single-month imports, using intelligent automation to reduce manual intervention while maintaining 100% data accuracy. The system learns from each month to improve automation and reduce human checkpoints over time.

---

## 📚 Core Principles

1. **Quality Over Speed**: Never sacrifice accuracy for automation
2. **Smart Pausing**: Stop for unusual patterns, proceed for standard operations
3. **Continuous Learning**: Each month makes the system smarter
4. **Transparent Logging**: Every decision, conversion, and anomaly documented
5. **Human-in-the-Loop**: Critical decisions always reviewed by user
6. **Evolutionary Protocol**: Improve rules based on learnings from each batch

---

## 🔧 Three-Gate Architecture

### Gate 1: Batch Pre-Flight Analysis (5 minutes)
**Purpose:** Analyze all months together, identify issues upfront, get approval once

**Activities:**
- Verify PDF files for all months exist and match
- Calculate line ranges for each month in CSV
- Extract expected totals from all PDFs
- Cross-month pattern analysis (recurring expenses, THB%, trends)
- Flag ALL potential anomalies across all months
- Generate batch manifest with strategy

**Outputs:**
- `BATCH-MANIFEST.md` - Complete batch plan
- `BATCH-PREFLIGHT-REPORT.md` - Consolidated findings
- Per-month red flag files initialized

**Human Checkpoint:**
- Review batch strategy
- Address any BLOCKING issues
- Approve to proceed or adjust plan

---

### Gate 2: Sequential Month Processing (Auto + Smart Pauses)
**Purpose:** Execute 4-phase protocol for each month with minimal intervention

**For Each Month:**

#### Phase 1: Pre-Flight Analysis
- Run standard pre-flight per Monthly Protocol v3.6
- Compare to batch pre-flight findings
- Flag deviations from batch expectations

**Auto-Proceed If:**
- Findings match batch pre-flight
- Only standard red flags (negative amounts, commas, typo reimbursements)
- Transaction count within ±5% of batch estimate
- No new unusual patterns

**Pause If:**
- New CRITICAL red flags appear
- Transaction count variance >5%
- Unusual transactions detected (context-based, not amount-based)
- Currency patterns deviate significantly from trend
- Missing expected recurring expenses

#### Phase 2: Parse & Prepare
- Create parsing script from latest template
- Apply ALL lessons learned from protocol
- Execute parser
- Validate output

**Auto-Proceed If:**
- Parser runs without errors
- Transaction count matches pre-flight
- All standard conversions applied successfully
- No new anomalies discovered

**Pause If:**
- Parser errors
- Transaction count mismatch
- New unusual transaction patterns
- Unclear how to handle specific transactions

#### Phase 3: Database Import
- Import JSON to database
- Verify tag application
- Verify tag IDs

**Auto-Proceed If:**
- Import succeeds
- Tag counts match expectations
- Tag IDs correct
- Zero errors

**Pause If:**
- Import errors
- Tag count mismatch >1
- Tag ID mismatch
- Database constraint violations

#### Phase 4: Comprehensive Validation
- Run 6-level validation
- Focus on Level 6 (100% 1:1 verification)

**Auto-Proceed If:**
- All validation levels pass
- 100% match rate achieved
- Only INFO-level flags

**Pause If:**
- Validation failures
- Match rate <99%
- CRITICAL or WARNING flags
- Unexplained variances

**Outputs Per Month:**
- `{month}-{year}-PREFLIGHT-REPORT.md`
- `{month}-{year}-RED-FLAGS.md`
- `{month}-{year}-VALIDATION-REPORT.md`
- `{month}-{year}-COMPREHENSIVE-VALIDATION.md`
- `{month}-{year}-CORRECTED.json`
- `parse-{month}-{year}.js`

---

### Gate 3: Batch Validation & Cross-Month Analysis (5 minutes)
**Purpose:** Validate all months together, identify cross-month patterns, get final approval

**Activities:**
- Aggregate validation across all months
- Cross-month consistency checks:
  - Recurring expenses present in all months?
  - THB/USD ratios consistent?
  - Reimbursement patterns normal?
  - Vendor/merchant patterns make sense?
- Generate batch summary report
- Identify any remaining discrepancies

**Outputs:**
- `BATCH-VALIDATION-REPORT.md` - Consolidated validation
- `BATCH-SUMMARY.md` - Executive summary

**Human Checkpoint:**
- Review batch validation
- Approve for production or flag corrections
- Update protocol with learnings

---

## 🚨 Red Flag System

### Severity Levels

**🔴 BLOCKING (Stop Immediately)**
- First occurrence of unusual transaction pattern
- Validation failures (match rate <99%)
- Database errors
- Missing expected critical transactions (rent, recurring bills)
- DSIL Design reimbursements
- Significant currency anomalies (THB% deviation >20% from trend)
- Cannot determine how to handle transaction

**Examples:**
- "Political Donation $5,000" - first time seeing this
- "Refund: Lawsuit Settlement" - unusual income type
- "Transfer to Offshore Account" - flag for verification
- Month shows 0% THB when trend is 45% THB

**🟡 WARNING (Log & Continue, Review at Gate 3)**
- Second occurrence of previously-seen unusual pattern
- Minor validation variances (within thresholds)
- Expected transaction missing but pattern unclear
- New vendor surge (>15 new vendors in one month)
- Moderate amount transactions in unusual categories

**Examples:**
- Second "Golf Winnings" (first was confirmed OK)
- Rent is THB 30,000 instead of usual THB 25,000
- 20 new vendors in one month (might be travel)

**🟢 INFO (Log Only, No Action)**
- Third+ occurrence of established pattern
- Standard conversions (negatives, commas, typos)
- Expected variations (travel months, holidays)
- All validations pass

**Examples:**
- Standard reimbursement conversion
- Comma-formatted paycheck
- Typo "Rembursement" detected

### Smart Escalation Rules

```
1st occurrence → 🔴 BLOCKING (get user guidance)
2nd occurrence → 🟡 WARNING (user previously confirmed pattern)
3rd+ occurrence → 🟢 INFO (established pattern, auto-handle)
```

**Pattern Memory:** Track across ALL imports, not just current batch
- Stored in protocol learnings
- Updated after each batch
- Referenced in future batches

---

## 📊 Cross-Month Pattern Analysis

### Recurring Expense Validation

**Expected Monthly:**
- Rent (THB 25,000-35,000 range)
- Phone bills (US + Thai)
- Subscriptions (Netflix, YouTube, etc.)
- Utilities (if in Thailand)
- Florida House expenses (electricity, gas)

**Validation Rules:**
- Flag if expected recurring expense missing
- Flag if amount varies >50% from established range
- Auto-accept seasonal variations (utility bills)

### Currency Ratio Trends

**Historical Pattern:**
- Thailand months: 40-60% THB
- USA travel months: 5-15% THB
- Transition months: 20-40% THB

**Validation:**
- Calculate 3-month THB% trend
- Flag if any month deviates >20% from trend without explanation
- Auto-accept if travel pattern detected

### Reimbursement Patterns

**Typical:**
- 0-7 reimbursements per month
- Average ~2-3 per month
- Usually meals, small purchases

**Flag If:**
- >10 reimbursements in one month
- Reimbursement >$500
- DSIL Design/LLC reimbursements (should be excluded)

---

## 🧠 Learning & Evolution

### Pattern Database

After each batch, update knowledge base:

**Established Patterns** (auto-handle):
- Standard negative conversions
- Known refund types
- Recurring vendor amounts
- Typical reimbursement categories
- Common typos in descriptions

**Known Anomalies** (auto-flag):
- DSIL Design reimbursements
- Large one-time expenses
- Currency exchanges
- Multiple rents (apartment moves)

**Vendor Confidence Scores:**
- High confidence: Seen 10+ times, consistent patterns
- Medium confidence: Seen 3-9 times, mostly consistent
- Low confidence: Seen 1-2 times, flag for review
- New: Never seen, always flag first time

### Protocol Improvements

**After Each Batch:**
1. Review all BLOCKING pauses - were they necessary?
2. Identify false positives - adjust thresholds
3. Document new patterns - add to auto-handle list
4. Update parsing rules if needed
5. Refine validation thresholds

**Version Updates:**
- Minor (v1.1): Threshold adjustments, new patterns added
- Major (v2.0): Significant architecture changes

---

## 📁 File Structure

```
scripts/
├── BATCH-IMPORT-PROTOCOL-v1.0.md (this file)
├── batch-imports/
│   ├── batch-{start-month}-{end-month}-{year}/
│   │   ├── BATCH-MANIFEST.md
│   │   ├── BATCH-PREFLIGHT-REPORT.md
│   │   ├── BATCH-VALIDATION-REPORT.md
│   │   ├── BATCH-SUMMARY.md
│   │   ├── {month-1}-{year}/
│   │   │   ├── PREFLIGHT-REPORT.md
│   │   │   ├── RED-FLAGS.md
│   │   │   ├── VALIDATION-REPORT.md
│   │   │   ├── COMPREHENSIVE-VALIDATION.md
│   │   │   ├── {month}-{year}-CORRECTED.json
│   │   │   └── parse-{month}-{year}.js
│   │   ├── {month-2}-{year}/
│   │   │   └── [same structure]
│   │   └── {month-3}-{year}/
│   │       └── [same structure]
```

---

## ✅ Success Criteria

### Per Month:
- All 4 phases complete
- 6-level validation passes
- 100% match rate (Level 6)
- All red flags logged
- Zero unexplained discrepancies

### Per Batch:
- All months imported successfully
- Cross-month validation passes
- Recurring expenses verified
- Pattern consistency confirmed
- Total time <30 minutes user interaction

### Long-term Goals:
- Reduce human checkpoints by 50% every 3 batches
- Achieve 95%+ auto-proceed rate
- Scale to 6-month batches within 6 months
- Scale to 12-month batches within 12 months

---

## 🔄 Batch Execution Flow

```
User Input: "Import August 2024 through June 2024"
    ↓
GATE 1: Batch Pre-Flight (Agent: data-engineer)
    ↓
User Review & Approval
    ↓
GATE 2: Sequential Processing
    ↓
Month 1: August 2024
    Phase 1: Pre-Flight → Auto-proceed or Pause
    Phase 2: Parse → Auto-proceed or Pause
    Phase 3: Import → Auto-proceed or Pause
    Phase 4: Validate → Auto-proceed or Pause
    ↓
Month 2: July 2024
    [Same 4 phases]
    ↓
Month 3: June 2024
    [Same 4 phases]
    ↓
GATE 3: Batch Validation (Agent: data-scientist)
    ↓
User Final Approval
    ↓
PRODUCTION READY ✅
```

---

## 📋 Agent Assignments

**Gate 1 - Batch Pre-Flight:**
- Agent: `data-engineer`
- Tools: Read, Grep, Glob, analysis

**Gate 2 - Month Processing:**
- Phase 1 Pre-Flight: `data-engineer`
- Phase 2 Parse: `data-engineer`
- Phase 3 Import: Direct bash (no agent)
- Phase 4 Validate: `data-scientist`

**Gate 3 - Batch Validation:**
- Agent: `data-scientist`
- Tools: Supabase queries, cross-month analysis

---

## 🎓 Lessons from Monthly Protocol v3.6

**ALL lessons from 14 previous monthly imports apply:**
- Currency handling (THB Column 6, never Column 8)
- Negative amount conversion to positive income
- Comma-formatted amount parsing
- Typo reimbursement detection (with/without colon)
- DSIL Design/LLC exclusion from Reimbursement tag
- Florida House date defaulting
- Column 3 vs Column 4 distinction
- Preserve original descriptions
- Manual tag fix acceptable (1 tag edge case)
- Special transaction user consultation
- Tag verification critical
- Import script "New Tags" message misleading
- PDF formula errors acceptable
- Duplicate handling user decision
- Apartment move special case (multiple rents)
- Missing merchants/payment methods → "Unknown"
- Zero-dollar transactions → skip
- High negative amount counts → normal variation
- THB percentage as location indicator

**Reference:** See Monthly Transaction Import Protocol v3.6 for complete lesson details

---

## 🚀 Scaling Roadmap

**Phase 1: Learning (Batches 1-3)**
- 3 months per batch
- Frequent human checkpoints
- Document all new patterns
- Refine thresholds

**Phase 2: Confidence (Batches 4-6)**
- 3-6 months per batch
- Reduced human checkpoints
- Most patterns auto-handled
- Focus on anomalies only

**Phase 3: Scale (Batches 7+)**
- 6-12 months per batch
- Minimal human intervention
- 95%+ automation
- Strategic spot-checks

---

## 📝 Version History

**v1.0 (October 27, 2025)**
- Initial batch protocol
- Three-gate architecture
- Smart pause criteria
- Cross-month validation
- Learning system foundation
- Built from 14 months of single-import learnings

---

**Next Version:** v1.1 (After batch-aug-jun-2024 completion)
- Incorporate learnings from first batch
- Refine thresholds based on real data
- Add newly discovered patterns
- Optimize pause criteria

---

**Status:** READY FOR FIRST BATCH
**Test Batch:** August 2024 → June 2024
**Expected Completion:** ~20 minutes total user time
