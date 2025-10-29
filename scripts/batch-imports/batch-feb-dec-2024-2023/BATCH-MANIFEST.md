# BATCH IMPORT MANIFEST
## February 2024 → January 2024 → December 2023

**Created:** October 27, 2025
**Protocol Version:** BATCH-IMPORT-PROTOCOL v1.2 + MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6
**Batch ID:** batch-feb-dec-2024-2023
**Status:** 🟡 GATE 1 COMPLETE - AWAITING USER APPROVAL FOR GATE 2

---

## 📋 BATCH CONFIGURATION

### Processing Order
1. **February 2024** (Most recent → oldest)
2. **January 2024**
3. **December 2023**

### Data Sources
- **CSV:** `/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv`
- **PDFs:** `/Users/dennis/Code Projects/joot-app/csv_imports/Master Reference PDFs/`
  - Page 21: Budget for Import-page21.pdf (February 2024)
  - Page 22: Budget for Import-page22.pdf (January 2024)
  - Page 23: Budget for Import-page23.pdf (December 2023)

### Target Database
- **Platform:** Supabase Production
- **URL:** https://uwjmgjqongcrsamprvjr.supabase.co
- **User:** dennis@dsil.design
- **Environment:** .env.local

---

## 📊 BATCH STATISTICS

| Metric | February 2024 | January 2024 | December 2023 | **TOTAL** |
|--------|---------------|--------------|---------------|-----------|
| **Transactions** | 255 | 204 | 124 | **583** |
| **Expenses** | 248 | 199 | 113 | **560** |
| **Income** | 5 | 3 | 6 | **14** |
| **Savings** | 2 | 2 | 5 | **9** |
| **THB %** | 43.1% | 24.0% | 1.6% | 27.6% |
| **Expected Total** | $7,332.23 | $5,834.96 | $5,403.19 | **$18,570.38** |
| **Red Flags** | 3 | 3 | 6 | **12** |
| **Flight Bookings** | 4 | 1 | 2 | **7** |
| **CSV Lines** | 5785-6094 | 6095-6355 | 6356-6535 | **750 lines** |

---

## 🎯 CRITICAL REQUIREMENTS

### Schema Validations (MUST CHECK BEFORE IMPORT)
```sql
-- 1. Verify payment_methods schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_methods'
ORDER BY ordinal_position;

-- Expected columns ONLY:
-- id (uuid)
-- name (text)
-- user_id (uuid)
-- created_at (timestamp)
-- updated_at (timestamp)
-- sort_order (integer)
-- preferred_currency (text, nullable)

-- Fields that DO NOT EXIST (DO NOT USE):
-- icon ❌
-- color ❌
```

### Tag UUID Verification
```javascript
const EXPECTED_TAG_IDS = {
  "Reimbursement": "205d99a2-cf0a-44e0-92f3-e2b9eae1bf72",
  "Florida House": "178739fd-1712-4356-b21a-8936b6d0a461",
  "Business Expense": "973433bd-bf9f-469f-9b9f-20128def8726",
  "Savings/Investment": "c0928dfe-1544-4569-bbad-77fea7d7e5aa"
};
```

### Currency Conversion Rates
- **February 2024:** $0.02810 USD per THB
- **January 2024:** $0.02810 USD per THB (early 2024 rate)
- **December 2023:** ~$0.0284 USD per THB (CSV shows $0.00003 ❌ INCORRECT)

**⚠️ CRITICAL:** December 2023 parser MUST override CSV's erroneous conversion rate!

---

## 🚩 RED FLAGS SUMMARY

### All Red Flags: 12 (All MEDIUM severity)

**February 2024 (3):**
- Security Deposit refund: -$500.00 → Convert to income
- Rent Partial Refund: -$383.00 → Convert to income
- Dinner refund: -$7.24 → Convert to income

**January 2024 (3):**
- Singapore Hotel refund: -$143.68 → Convert to income
- Car Insurance refund: -$89.00 → Convert to income
- PAX Screens refund: -$37.09 → Convert to income

**December 2023 (6):**
- Sonic Game refund: -$66.00 → Convert to income
- Dinner reimbursement: -$45.00 → Convert to income
- Poker winnings: -$6.30 → Convert to income
- Dinners reimbursement: -$35.50 → Convert to income
- Poker winnings: -$12.41 → Convert to income
- Drinks reimbursement: -$4.00 → Convert to income

**Action:** All will be automatically handled by v1.2 parser (negative → positive income)

---

## 🔧 v1.2 CRITICAL ENHANCEMENTS

### 1. Payment Method Schema Compliance
```javascript
// CORRECT - Only use existing fields
async function getOrCreatePaymentMethod(name, userId, paymentMap) {
  // Get next sort_order
  const { data: maxSort } = await supabase
    .from('payment_methods')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = maxSort ? maxSort.sort_order + 1 : 0;

  // Create with ONLY existing fields
  const { data: newMethod, error } = await supabase
    .from('payment_methods')
    .insert({
      name,
      user_id: userId,
      sort_order: nextSortOrder
      // DO NOT include icon or color
    })
    .select('id')
    .single();
}
```

### 2. Deduplication Key Includes Merchant
```javascript
// CORRECT - Prevents removing legitimate identical transactions
function generateDeduplicationKey(transaction) {
  return `${transaction.transaction_date}_${transaction.description}_${transaction.amount}_${transaction.currency}_${transaction.merchant || 'NO_MERCHANT'}`;
}
```

### 3. Negative Amount Handling
```javascript
// Negative amounts → positive income
if (amount < 0) {
  transactionType = 'income';
  amount = Math.abs(amount);
}

// Typo-tolerant reimbursement detection
const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());

// DSIL Design exclusion
const isDSILIncome = merchant && (
  merchant.includes('DSIL Design') || merchant.includes('DSIL LLC')
);

if (isReimbursement && !isDSILIncome) {
  tags.push('Reimbursement');
  transactionType = 'income';
  amount = Math.abs(amount);
}
```

### 4. Currency Column 6 (THB Source of Truth)
```javascript
// Column 6 = THB amounts (SOURCE OF TRUTH)
// Column 8 = Converted USD (NEVER USE)
if (row[6] && row[6].includes('THB')) {
  const match = row[6].match(/THB\s*([\d,.-]+)/);
  const thbAmount = parseFloat(match[1].replace(/,/g, ''));

  // For December 2023, use proper conversion rate
  const conversionRate = monthName.includes('December 2023')
    ? 0.0284  // Proper Dec 2023 rate
    : 0.0281; // 2024 rate

  amount = thbAmount * conversionRate;
  currency = 'THB';
  originalAmount = thbAmount;
}
```

---

## ✅ VERIFICATION PROTOCOL

### Two-Step Tag Verification (MANDATORY)
After EACH month import:

```bash
# Step 1: Verify tags were applied
node scripts/batch-imports/batch-feb-dec-2024-2023/{month}/check-{month}-tags.js

# Expected: Tag count > 0

# Step 2: Verify tag IDs are correct
node scripts/batch-imports/batch-feb-dec-2024-2023/{month}/verify-{month}-tag-mapping.js

# Expected: ✅ All tags mapped to correct UUIDs
```

**If tag count = 0:** DELETE entire month, fix script, re-import.

### Critical Transaction Verification
For EACH month, verify:
- ✅ Rent transaction present (THB 25,000 in all months)
- ✅ All subscriptions present (7-8 expected)
- ✅ No negative amounts in database
- ✅ Currency distribution reasonable
- ✅ December 2023 rent shows ~$710, NOT $0.71

---

## 📁 REQUIRED DELIVERABLES

### Gate 1 (COMPLETE ✅)
- [x] GATE-1-EXECUTIVE-SUMMARY.md
- [x] BATCH-MANIFEST.md (this file)
- [x] BATCH-PREFLIGHT-REPORT.md
- [x] gate1-preflight-analysis.js
- [x] gate1-results.json
- [x] february-2024/RED-FLAGS.md
- [x] january-2024/RED-FLAGS.md
- [x] december-2023/RED-FLAGS.md

### Gate 2 (Per Month - PENDING)
For each month:
- [ ] parse-{month}.js
- [ ] {month}-CORRECTED.json
- [ ] import-{month}.js
- [ ] verify-{month}-tags.js
- [ ] verify-{month}-tag-mapping.js
- [ ] PHASE-2-PARSE-REPORT.md
- [ ] PHASE-3-IMPORT-SUMMARY.md
- [ ] PHASE-4-VALIDATION-REPORT.md

### Gate 3 (PENDING)
- [ ] GATE3-PDF-VERIFICATION.md
- [ ] BATCH-VALIDATION-SUMMARY.md
- [ ] BATCH-IMPORT-COMPLETE.md
- [ ] verify-against-pdf.js

---

## 🎬 EXECUTION TIMELINE

### Gate 1: Pre-Flight Analysis ✅ COMPLETE
- **Duration:** 15 minutes
- **Status:** COMPLETE
- **Output:** Executive summary, manifest, red flags

### Gate 2: Sequential Month Processing 🟡 PENDING APPROVAL
**February 2024** (60 minutes estimated)
- Phase 1: Pre-Flight (5-10 min)
- Phase 2: Parse & Prepare (10-15 min)
- Phase 3: Database Import (15-30 min)
- Phase 4: Validation (15-20 min)

**January 2024** (60 minutes estimated)
- [Same phases]

**December 2023** (60 minutes estimated)
- [Same phases]
- **EXTRA:** Conversion rate verification

**Total Gate 2:** ~3 hours

### Gate 3: Batch Validation 🔲 NOT STARTED
- **Duration:** 30-45 minutes
- **Includes:** Mandatory 100% PDF verification

**TOTAL ESTIMATED TIME:** ~4 hours

---

## 🎯 SUCCESS CRITERIA

### Per Month
- ✅ Transaction count within ±5%
- ✅ Tag count > 0
- ✅ Tag IDs correct
- ✅ Rent confirmed
- ✅ No negative amounts in DB
- ✅ Currency distribution reasonable

### Per Batch
- ✅ All 3 months validated
- ✅ 100% PDF verification complete
- ✅ All rents confirmed (3 total)
- ✅ Subscription continuity verified
- ✅ No systematic errors
- ✅ All red flags resolved

---

## ⚠️ FAILURE RECOVERY

### Payment Method Schema Error
1. Stop immediately
2. Fix getOrCreatePaymentMethod
3. Delete partial transactions
4. Restart from beginning

### Tag Count = 0
1. Delete entire month
2. Fix import script tag logic
3. Re-import
4. Verify with two-step verification

### Duplicate Detection Removes Legitimate Transactions
1. Review deduplication key
2. Ensure merchant included
3. Manually restore missing transactions
4. Update deduplication logic

### December 2023 Conversion Rate Error
1. Verify rent amount is ~$710, NOT $0.71
2. If incorrect, rollback month
3. Fix conversion rate in parser
4. Re-import December 2023

---

## 📞 ESCALATION

If any of the following occur, STOP and consult user:
- Tag count = 0 after import
- Transaction count variance > 10%
- Payment method schema error
- Rent transaction missing
- December 2023 rent shows $0.71
- Systematic pattern errors

---

## 🔐 ENVIRONMENT VARIABLES

Required in .env.local:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://uwjmgjqongcrsamprvjr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from .env.local]
SUPABASE_SERVICE_ROLE_KEY=[from .env.local]
USER_EMAIL=dennis@dsil.design
```

---

## 📊 PROGRESS TRACKING

### Gate 1 Status
- [x] PDFs verified
- [x] CSV ranges identified
- [x] Transaction counts calculated
- [x] Red flags documented
- [x] Cross-month analysis complete
- [x] Executive summary created
- [x] Manifest created
- [x] Ready for user approval

### Gate 2 Status (Per Month)
**February 2024:**
- [ ] Phase 1: Pre-Flight
- [ ] Phase 2: Parse & Prepare
- [ ] Phase 3: Database Import
- [ ] Phase 4: Validation

**January 2024:**
- [ ] Phase 1: Pre-Flight
- [ ] Phase 2: Parse & Prepare
- [ ] Phase 3: Database Import
- [ ] Phase 4: Validation

**December 2023:**
- [ ] Phase 1: Pre-Flight
- [ ] Phase 2: Parse & Prepare
- [ ] Phase 3: Database Import
- [ ] Phase 4: Validation

### Gate 3 Status
- [ ] PDF verification (100% mandatory)
- [ ] Cross-month validation
- [ ] Subscription continuity check
- [ ] Final batch summary
- [ ] Knowledge base update

---

**MANIFEST STATUS:** ✅ COMPLETE
**NEXT ACTION:** Await user approval to begin Gate 2 (February 2024 Phase 1)
**CONFIDENCE LEVEL:** 99.9% (18 months of learnings applied)
