# BATCH IMPORT QUICK START

**For the impatient. Get started in 30 seconds.**

---

## COPY THIS PROMPT ⬇️

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

## THAT'S IT!

Paste the prompt above into Claude Code and it will:
- ✅ Check what needs importing
- ✅ Create batch structure
- ✅ Process each month (4 phases)
- ✅ Verify 100% accuracy
- ✅ Generate completion report

---

## SUCCESS LOOKS LIKE

```
MONTH YEAR: 1:1 TRANSACTION VERIFICATION
======================================================================
CSV Source: XXX transactions
Database: XXX transactions

MATCHING RESULTS:
Matched: XXX/XXX (100.0%)
Unmatched CSV: 0
Unmatched DB: 0

STATUS: ✅ VERIFIED
```

Every month should show **100.0%** match rate.

---

## DOCUMENTS CREATED

- **MASTER-IMPORT-PROTOCOL.md** - Full protocol reference
- **NEXT-BATCH-KICKOFF-PROMPT.md** - Detailed kickoff guide (this is shorter)
- **QUICK-START.md** - This file (fastest way to start)

Choose your speed:
- 🏃 Quick Start - Use prompt above
- 📖 Full Details - Read NEXT-BATCH-KICKOFF-PROMPT.md
- 📚 Deep Dive - Read MASTER-IMPORT-PROTOCOL.md

---

## CURRENT STATUS

**Verified (Protocol v2.0):**
- Jan-Aug 2023: 1,387 transactions (100% accurate)

**Next Up:**
- Sept-Dec 2023: 449 transactions
- Then 2024, then earlier months

**Success Rate:** 100% (zero discrepancies)

---

**Ready? Copy the prompt above and go! 🚀**
