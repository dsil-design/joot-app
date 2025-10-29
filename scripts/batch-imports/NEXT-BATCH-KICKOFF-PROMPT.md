# BATCH IMPORT KICKOFF PROMPT

**Use this prompt to start the next batch of transaction imports.**

---

## THE PROMPT

```
Continue importing historical transactions using the MASTER-IMPORT-PROTOCOL.md (v3.0).

Target the next unverified batch of months. Follow the 4-phase process:
1. Parse (extract from CSV)
2. Import (load to database)
3. Validate (Gate 3 verification)
4. Verify (Protocol v2.0 - 1:1 transaction matching)

Start by checking which months still need verification:
- Run: node scripts/batch-imports/check-imported-months.js
- Identify the next batch (September-December 2023 or earlier months)
- Create batch folder structure
- Process each month sequentially

Key Requirements:
- Use Protocol v2.0 verification (1:1 transaction matching) for EVERY month
- Ignore aggregate totals (PDF GRAND TOTAL is unreliable)
- Achieve 100% match rate for each month
- Document any issues found and resolved

Reference files:
- MASTER-IMPORT-PROTOCOL.md (central documentation)
- batch-apr-jan-2023/verify-january-1to1.js (verification template)
- batch-apr-jan-2023/april-2023/parse-april-2023.js (parser template)
```

---

## WHAT YOU'LL GET

The assistant will:

1. ✅ **Check current status**
   - Run the month check script
   - Identify which months need importing/verification
   - Propose the next logical batch

2. ✅ **Create batch structure**
   - Create batch folder
   - Set up month subfolders
   - Copy templates

3. ✅ **Process each month (4 phases)**
   - Parse CSV to JSON
   - Import JSON to database
   - Validate with Gate 3 checks
   - Verify with Protocol v2.0 (1:1 matching)

4. ✅ **Report results**
   - Transaction counts
   - Match rates (should be 100%)
   - Any issues found/fixed
   - Summary document

---

## EXPECTED OUTCOMES

### Per Month
- ✅ PARSED.json created
- ✅ Transactions imported to database
- ✅ Gate 3 validation passed
- ✅ Protocol v2.0: 100% match rate
- ✅ verify-[month]-1to1.js created

### Per Batch
- ✅ All months verified
- ✅ BATCH-COMPLETE.md document
- ✅ Success metrics documented
- ✅ Ready for production

---

## BATCH CANDIDATES

Based on current status (as of Oct 29, 2025):

### ✅ COMPLETE (100% Verified with Protocol v2.0)
- January 2023 (155 transactions)
- February 2023 (180 transactions)
- March 2023 (179 transactions)
- April 2023 (211 transactions)
- May 2023 (90 transactions)
- June 2023 (192 transactions)
- July 2023 (192 transactions)
- August 2023 (188 transactions)

**Total Verified:** 1,387/1,387 transactions

### ⏳ NEXT BATCH OPTIONS

**Option 1: Complete 2023 (Recommended)**
- September 2023 (178 transactions)
- October 2023 (114 transactions)
- November 2023 (75 transactions)
- December 2023 (82 transactions)

**Expected Time:** 2-3 hours
**Impact:** Full 2023 verification complete

**Option 2: Start 2024**
- January 2024 (170 transactions)
- February 2024 (225 transactions)
- March 2024 (172 transactions)
- April 2024 (190 transactions)

**Expected Time:** 2-3 hours
**Impact:** Begin 2024 verification

**Option 3: Earlier 2023 or 2022**
- Check what data exists before Jan 2023
- Import and verify if data available

---

## SUCCESS CRITERIA

After running the kickoff prompt, you should have:

1. ✅ **New batch folder created**
   - Example: `batch-dec-sept-2023/`

2. ✅ **All months in batch verified**
   - Each month: 100% match rate
   - verify-[month]-1to1.js for each

3. ✅ **BATCH-COMPLETE.md document**
   - Summary of all months
   - Transaction counts
   - Success metrics

4. ✅ **Zero discrepancies**
   - No missing transactions
   - No field accuracy issues
   - No unexplained variances

---

## TIME ESTIMATES

Based on Batch 1 & 2 experience:

| Phase | Time per Month | Notes |
|-------|---------------|-------|
| Parse | 5-10 minutes | Template approach is fast |
| Import | 2-5 minutes | Automated, just monitor |
| Validate (Gate 3) | 5 minutes | Quick checks |
| Verify (v2.0) | 10-15 minutes | Create script, run, review |
| **Total** | **25-35 minutes** | Per month average |

**4-month batch:** ~2 hours
**8-month batch:** ~4 hours

---

## TIPS FOR SUCCESS

1. **Start with the recommended batch** (Sept-Dec 2023 to complete 2023)

2. **Let the assistant follow the protocol** - it knows the 4-phase process

3. **Expect 100% match rates** - if you see <100%, there's an issue to investigate

4. **Trust Protocol v2.0** - it caught the April parser bug, it's reliable

5. **Don't worry about aggregate totals** - they're broken, ignore them

6. **Review the BATCH-COMPLETE.md** - this is your verification record

---

## IF ISSUES OCCUR

### Parser Issues
- Check line ranges (especially last day of month)
- February: 28/29 days, not 30!
- Re-parse if needed

### Import Issues
- Check for date validation errors
- Verify month-specific day counts
- Delete partial imports, re-import clean

### Verification <100%
- Missing transactions: check parser line ranges
- Extra DB transactions: check for duplicates
- Field mismatches: review CSV vs DB data

**Solution:** Assistant will troubleshoot and fix

---

## READY TO START?

Copy the prompt at the top of this file and paste it into a new Claude Code session. The assistant will take it from there.

**Expected First Response:**
```
I'll start the next batch import. Let me first check which months
need verification...

[Runs check-imported-months.js]
[Proposes next batch]
[Creates folder structure]
[Starts Phase 1: Parse for first month]
```

---

**Last Updated:** October 29, 2025
**Protocol Version:** v3.0
**Success Rate:** 100% (1,387 transactions verified)
**Ready:** ✅ YES
