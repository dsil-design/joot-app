# DUAL RESIDENCE PATTERN - HISTORICAL CONTEXT

**Last Updated:** October 29, 2025
**Status:** CONFIRMED by user
**Applies To:** ALL historical imports (June 2017 - present)

---

## User Confirmation

**Date:** October 29, 2025
**Source:** Direct user confirmation during Nov-Oct-Sept 2023 batch import

> "I've maintained dual residences in the USA and Thailand throughout all of the data we're importing all the way back to June 2017."

---

## Pattern Details

**USA Residence:**
- Location: Conshohocken, PA (primary location in CSV)
- Rent Payee: Jordan (typically)
- Amount: $957-$987 USD/month
- Currency: USD
- Payment: Venmo

**Thailand Residence:**
- Location: Various (Bangkok, Chiang Mai)
- Rent Payee: Pol (primary), various landlords
- Amount: THB 25,000-35,000/month (~$700-1,000 USD)
- Currency: THB
- Payment: Bangkok Bank Account

**Total Monthly Rent:** ~$1,650-2,000 USD equivalent

---

## Import Implications

### ✅ BOTH RENTS ARE VALID EXPENSES

**DO NOT:**
- Flag dual rents as duplicates
- Question multiple rent payments per month
- Remove either rent transaction
- Mark as red flag (normal pattern)

**DO:**
- Import both rents as separate valid expenses
- Preserve original currency (USD for USA, THB for Thailand)
- Maintain proper merchant attribution (Jordan vs Pol)
- Document in validation reports as expected pattern

### Rent Reimbursements

**Pattern Identified:** Mike D. (friend)
- Occasionally stayed at USA apartment
- Reimbursed rent (e.g., October 2023: -$400)
- **Should be tagged:** Reimbursement (income)
- **Transaction type:** income

**Other potential rent reimbursers:**
- Check for negative rent amounts
- Check for Venmo receipts mentioning "rent"
- Apply Reimbursement tag when detected

---

## Historical Context (June 2017 - October 2025)

**8+ years of dual residence:**
- Continuous USA apartment (Conshohocken, PA)
- Continuous Thailand residence (various locations)
- User travels between both locations
- Both residences maintained simultaneously

**THB % as Location Indicator:**
- High THB% (>40%) = Currently in Thailand
- Low THB% (<10%) = Currently in USA
- Both rents paid regardless of current location

**Expected Variance:**
- Some months may show only 1 rent (travel timing, payment delays)
- Some months may show 3+ rents (overlapping leases, deposits)
- Apartment moves may cause rent amount changes

---

## Future Import Guidance

**For ALL historical imports (2017-2023):**

1. **Expect dual rents** in most months
2. **Do NOT flag as anomaly** or duplicate
3. **Verify amounts** are reasonable for year/location:
   - USA: $800-1,200 USD range (varies by year)
   - Thailand: THB 20,000-35,000 range (varies by location)
4. **Check for reimbursements** from friends/subletters
5. **Document** in validation reports as normal pattern

**Red Flag Updates:**
- Remove "dual rent" from WARNING category
- Move to INFO category: "Dual residence pattern detected (expected)"
- Only flag if >2 rents to same payee (potential duplicate)

---

## Protocol Updates Needed

**BATCH-IMPORT-PROTOCOL v1.2:**
- Add dual residence context to "Cross-Month Pattern Analysis"
- Update rent verification to expect 2 rents
- Add Mike D. and similar rent reimbursements to detection logic

**MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6:**
- Update "Critical Transaction Verification" to expect dual rents
- Add rent reimbursement pattern detection
- Remove dual rent from red flag categories

---

**Maintained By:** Claude Code
**Referenced In:** Nov-Oct-Sept 2023 batch import (first identification)
**Applies To:** ALL future and historical imports
