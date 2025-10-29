# Clean Slate Transaction Import Plan
## Joot App - Complete Re-Import Strategy

**Created:** October 23, 2025
**Owner:** Dennis (dennis@dsil.design)
**Status:** 🟡 AWAITING APPROVAL

---

## Executive Summary

Complete clean slate re-import of all transaction data from June 2017 - October 2025, validated against PDF reference files, with month-by-month manual approval.

**Current State:**
- Database: 31 transactions for September 2025 ($1,551.56)
- Master Data: ~200 transactions for September 2025 ($6,804.11)
- **Discrepancy:** ~169 missing transactions (~$5,252.55)

**Target State:**
- 100% accurate transaction data
- All tags correctly applied
- Zero unexplained duplicates
- Complete audit trail

---

## Phase 1: Setup & Emergency Rollback (30 mins)

### Step 1.1: Create Backup Infrastructure

**Create backup directory structure:**
```bash
mkdir -p backups/pre-import-2025-10-23
mkdir -p backups/monthly-checkpoints
mkdir -p backups/rollback-scripts
```

**Create backup script:**
```javascript
// scripts/db/create-backup.js
- Export all transactions for dennis@dsil.design to JSON
- Export vendors table
- Export payment_methods table
- Export transaction_tags relationships
- Save with timestamp
```

**Run initial backup:**
```bash
node scripts/db/create-backup.js
# Output: backups/pre-import-2025-10-23/backup-[timestamp].json
```

### Step 1.2: Document Current State

**Run state analysis:**
```bash
node scripts/db/analyze-current-state.js
```

**Expected output:**
```json
{
  "timestamp": "2025-10-23T...",
  "user": "dennis@dsil.design",
  "transaction_count": 31,
  "vendor_count": X,
  "payment_method_count": Y,
  "date_range": {
    "earliest": "...",
    "latest": "..."
  },
  "total_expenses": ...,
  "total_income": ...
}
```

### Step 1.3: Create Rollback Scripts

**Script 1: Soft Rollback** (undo last import)
```javascript
// scripts/db/rollback-soft.js
// Deletes transactions after a specific timestamp
// Preserves vendors/payment methods
```

**Script 2: Hard Rollback** (nuclear option)
```javascript
// scripts/db/rollback-hard.js
// Restores from backup JSON file
// Completely wipes user data and re-imports
```

**Script 3: Verify Backup**
```javascript
// scripts/db/verify-backup.js
// Ensures backup is valid and complete
```

**Test rollback:**
1. Create test backup
2. Make test change (add 1 dummy transaction)
3. Run soft rollback
4. Verify dummy transaction removed
5. Verify original data intact

---

## Phase 2: Clean Slate (15 mins)

### Step 2.1: Final Backup Before Deletion

```bash
# Create final backup before deletion
node scripts/db/create-backup.js --label="before-clean-slate"
# Verify backup integrity
node scripts/db/verify-backup.js backups/pre-import-2025-10-23/backup-[timestamp].json
```

### Step 2.2: Delete Existing Transaction Data

**Create deletion script:**
```javascript
// scripts/db/clean-slate.js
const USER_EMAIL = 'dennis@dsil.design';

async function cleanSlate() {
  // 1. Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  // 2. Delete transaction_tags relationships
  await supabase
    .from('transaction_tags')
    .delete()
    .in('transaction_id',
      supabase.from('transactions').select('id').eq('user_id', user.id)
    );

  // 3. Delete all transactions
  const { data: deleted } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .select('id');

  console.log(`Deleted ${deleted.length} transactions`);

  // 4. Clean orphaned vendors (optional - discuss with user)
  // 5. Clean orphaned payment methods (optional - discuss with user)

  // 6. Verify deletion
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id);

  console.log(`Remaining transactions: ${count} (should be 0)`);
}
```

**Run with confirmation:**
```bash
# DRY RUN first
node scripts/db/clean-slate.js --dry-run

# APPROVE: Then run for real
node scripts/db/clean-slate.js --confirm
```

### Step 2.3: Verify Clean State

```bash
# Should show 0 transactions
node scripts/db/analyze-current-state.js
```

---

## Phase 3: Month-by-Month Import (Main Phase)

### Import Order Strategy

**Test Phase:**
1. **September 2025** (our known discrepancy - perfect for validation)

**Current Year (working backwards):**
2. October 2025
3. August 2025
4. July 2025
5. June 2025
6. May 2025
7. April 2025
8. March 2025
9. February 2025
10. January 2025

**Previous Years (working backwards):**
11. December 2024
12. November 2024
... continue through to June 2017

**Rationale:** Start with September 2025 since we know the exact discrepancy and can validate the fix immediately.

---

### Import Process for Each Month

#### Pre-Import Checklist
- [ ] Backup checkpoint created
- [ ] PDF reference file identified
- [ ] Expected transaction count known
- [ ] Expected grand total known

#### Import Steps

**1. Parse CSV Data**
```bash
node scripts/import-month.js --month=2025-09 --dry-run
```

**Output:**
```
📊 PARSING: September 2025
========================================
Transactions found: 158
├─ Expenses: 136
└─ Income: 22

💰 Totals:
├─ Total Expenses: $6,871.57
├─ Expected (PDF): $6,804.11
└─ Variance: $67.46 (1.0%)

🏷️  Tags:
├─ Florida House: 6 transactions
├─ Reimbursement: 22 transactions
└─ Business Expense: 9 transactions

💱 Currencies:
├─ USD: 120 transactions
└─ THB: 38 transactions
```

**2. Show First 5 and Last 5 Transactions**
```
🔍 FIRST 5 TRANSACTIONS:
1. 2025-09-01 | Work Email | Google | $6.36 USD
2. 2025-09-01 | Monthly Subscription: CursorAI | $20.00 USD
3. 2025-09-01 | Reimbursement: Sweater | -$30.91 USD [INCOME]
4. 2025-09-02 | Annual Fee: Costco | $65.00 USD
5. 2025-09-02 | Cosmetic Cream for Nidnoi | $26.42 USD [BUSINESS]

🔍 LAST 5 TRANSACTIONS:
154. 2025-09-11 | Gas Bill | TECO | $37.76 USD [FLORIDA]
155. 2025-09-13 | Doorcam | RING | $10.69 USD [FLORIDA]
156. 2025-09-20 | FL Internet | Xfinity | $73.00 USD [FLORIDA]
157. 2025-09-03 | Electricity Bill | FPL | $87.44 USD [FLORIDA]
158. 2025-09-30 | Electricity Bill | FPL | $104.19 USD [FLORIDA]
```

**3. WAIT FOR USER APPROVAL**
```
⏸️  APPROVAL REQUIRED
========================================
Does this data look correct?
Type 'yes' to import to database, 'no' to abort: _
```

**4. Import to Database**
```bash
# Only runs after user types 'yes'
node scripts/import-month.js --month=2025-09 --confirm
```

**Import Process:**
```javascript
async function importMonth(transactions, userId) {
  // 1. Create or get vendors
  const vendorMap = await upsertVendors(transactions);

  // 2. Create or get payment methods
  const paymentMethodMap = await upsertPaymentMethods(transactions);

  // 3. Create or get tags
  const tagMap = await upsertTags(['Florida House', 'Reimbursement', 'Business Expense']);

  // 4. Insert transactions in batches of 50
  const batches = chunkArray(transactions, 50);
  for (const batch of batches) {
    const transactionsToInsert = batch.map(t => ({
      user_id: userId,
      transaction_date: t.date,
      description: t.description,
      amount: t.amount,
      original_currency: t.currency,
      transaction_type: t.transaction_type,
      vendor_id: vendorMap[t.merchant],
      payment_method_id: paymentMethodMap[t.payment_method]
    }));

    const { data: inserted } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select('id');

    // 5. Insert transaction_tags relationships
    const tagRelationships = [];
    inserted.forEach((txn, idx) => {
      const originalTxn = batch[idx];
      originalTxn.tags.forEach(tagName => {
        tagRelationships.push({
          transaction_id: txn.id,
          tag_id: tagMap[tagName]
        });
      });
    });

    if (tagRelationships.length > 0) {
      await supabase
        .from('transaction_tags')
        .insert(tagRelationships);
    }
  }

  console.log(`✅ Imported ${transactions.length} transactions`);
}
```

**5. Validate Import**
```bash
node scripts/validate-month.js --month=2025-09
```

**Validation Checks:**
```javascript
async function validateMonth(monthStr, expectedCount, expectedTotal) {
  // 1. Count transactions
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .gte('transaction_date', `${monthStr}-01`)
    .lt('transaction_date', getNextMonth(monthStr));

  console.log(`Transactions in DB: ${count}`);
  console.log(`Expected: ${expectedCount}`);
  console.log(`Match: ${count === expectedCount ? '✅' : '❌'}`);

  // 2. Sum total expenses
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount, original_currency')
    .eq('transaction_type', 'expense')
    .gte('transaction_date', `${monthStr}-01`)
    .lt('transaction_date', getNextMonth(monthStr));

  // Convert all to USD and sum
  const totalUSD = expenses.reduce((sum, txn) => {
    // Use exchange rate service or approximate
    return sum + convertToUSD(txn.amount, txn.original_currency);
  }, 0);

  console.log(`Total Expenses: $${totalUSD.toFixed(2)}`);
  console.log(`Expected: $${expectedTotal}`);
  console.log(`Variance: $${Math.abs(totalUSD - expectedTotal).toFixed(2)}`);

  // 3. Check for duplicates
  const { data: duplicates } = await supabase.rpc('find_duplicate_transactions', {
    month_start: `${monthStr}-01`
  });

  console.log(`Duplicate Check: ${duplicates.length === 0 ? '✅' : '❌'} (${duplicates.length} found)`);

  // 4. Tag verification
  const { data: tagCounts } = await supabase
    .rpc('count_tags_for_month', { month_start: `${monthStr}-01` });

  console.log(`Tag Distribution:`);
  tagCounts.forEach(t => console.log(`  - ${t.tag_name}: ${t.count}`));
}
```

**6. Create Checkpoint**
```bash
node scripts/db/create-checkpoint.js --month=2025-09
# Saves: backups/monthly-checkpoints/2025-09-checkpoint.json
```

**7. Generate PDF Comparison Report**
```bash
node scripts/compare-to-pdf.js --month=2025-09
```

**Report Output:**
```markdown
# September 2025 Import Validation Report

## Summary
✅ Import successful

## Comparison to PDF Reference
| Metric | Database | PDF Reference | Match |
|--------|----------|---------------|-------|
| Transaction Count | 158 | 158 | ✅ |
| Total Expenses | $6,871.57 | $6,804.11 | ⚠️ 1.0% variance |
| Florida House Txns | 6 | 6 | ✅ |
| Business Expenses | 9 | 9 | ✅ |

## Discrepancies
- Minor variance in total ($67.46) due to THB/USD exchange rate differences

## Recommendation
✅ Proceed to next month
```

**8. USER APPROVAL CHECKPOINT**
```
========================================
✅ SEPTEMBER 2025 IMPORT COMPLETE
========================================

Validation Report:
  📊 Transactions: 158/158 ✅
  💰 Total: $6,871.57 (Expected: $6,804.11) ⚠️ 1.0% variance
  🏷️  Tags: All correct ✅
  🔍 Duplicates: None found ✅

Do you approve this import and want to proceed to October 2025?
Type 'yes' to continue, 'no' to rollback and investigate: _
```

**9. Proceed to Next Month**
```bash
# Only after approval
node scripts/import-month.js --month=2025-10 --dry-run
# ... repeat process ...
```

---

## Phase 4: Final Validation (After All Imports)

### Step 4.1: Cross-Reference All Sources

**Run comprehensive validation:**
```bash
node scripts/validate-all.js
```

**Checks:**
1. Count all transactions in database vs CSV
2. Compare totals for each month vs PDF references
3. Verify all tags applied correctly
4. Check for duplicates across entire dataset
5. Validate currency codes
6. Verify date ranges

### Step 4.2: Generate Final Report

```markdown
# Complete Import Validation Report

## Overview
- Total Months Imported: 102 (June 2017 - October 2025)
- Total Transactions: XXXX
- Total Vendors: XXX
- Total Payment Methods: XX

## Monthly Breakdown
| Month | Transactions | Expenses | Income | Status |
|-------|-------------|----------|---------|--------|
| Sep 2025 | 158 | $6,871.57 | $679.75 | ✅ |
| Oct 2025 | XXX | $X,XXX.XX | $XXX.XX | ✅ |
| ... | ... | ... | ... | ... |

## Data Quality Metrics
- Average variance from PDF: X.X%
- Duplicates found: 0
- Missing tags: 0
- Invalid currencies: 0

## Conclusion
✅ Import complete and validated
```

### Step 4.3: Create Final Backup

```bash
node scripts/db/create-backup.js --label="post-complete-import"
# Archive old backups
tar -czf backups/archive-2025-10-23.tar.gz backups/
```

---

## Rollback Procedures

### Scenario 1: Bad Data in Last Month Import

**Problem:** October 2025 import has errors

**Solution:**
```bash
# Rollback to September 2025 checkpoint
node scripts/db/rollback-to-checkpoint.js --checkpoint=2025-09

# Verify
node scripts/db/analyze-current-state.js

# Fix import script
# Re-import October 2025
```

### Scenario 2: Complete Failure

**Problem:** Multiple months have issues

**Solution:**
```bash
# Nuclear option: restore from pre-import backup
node scripts/db/rollback-hard.js --backup=backups/pre-import-2025-10-23/backup-[timestamp].json

# Verify restoration
node scripts/db/verify-backup.js

# Start over from Phase 2
```

---

## Success Criteria

- [ ] All months from June 2017 - October 2025 imported
- [ ] Transaction counts match CSV exactly
- [ ] Monthly totals within 2% of PDF references
- [ ] All tags correctly applied
- [ ] Zero unexplained duplicates
- [ ] September 2025 shows $6,804.11 in expenses (not $1,551.56)
- [ ] Complete audit trail maintained
- [ ] All backups verified and archived

---

## Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Setup | 30 mins | Backups, rollback scripts, testing |
| Phase 2: Clean Slate | 15 mins | Delete old data, verify |
| Phase 3: Import (102 months) | ~15 hours | 8-10 mins per month with review |
| Phase 4: Final Validation | 1 hour | Comprehensive checks, reports |
| **Total** | **~16.5 hours** | Over 2-3 sessions |

**Recommended Approach:**
- Session 1: Phases 1-2 + September 2025 import (1 hour)
- Session 2: Import 2025 months (2 hours)
- Session 3+: Import remaining years in batches

---

## Next Steps

1. **REVIEW THIS PLAN** - Confirm approach is acceptable
2. **APPROVE PHASE 1** - Allow me to create backup infrastructure
3. **RUN SEPTEMBER 2025 TEST** - Validate parsing and import logic
4. **DECIDE**: Proceed with full import or adjust plan

---

**Status:** 🟡 AWAITING YOUR APPROVAL

Type "approved" to begin Phase 1, or ask questions/request changes.
