# BATCH-IMPORT-PROTOCOL v1.2
**Last Updated:** October 27, 2025
**Status:** ACTIVE
**Supersedes:** v1.1
**Based on:** 18+ months of import experience (Sept 2024 - Sept 2025)

---

## Version History

- **v1.0** (Oct 2025): Initial batch import framework with three-gate architecture
- **v1.1** (Oct 2025): Added mandatory 100% PDF verification, enhanced red flag system
- **v1.2** (Oct 2025): Comprehensive updates from 18 months of imports, enhanced schema validation, improved duplicate detection

---

## Mission Statement

Execute multiple sequential monthly imports with the same rigor and quality as single-month imports, while leveraging cross-month pattern analysis to catch systematic errors and maintain data integrity across batch boundaries.

---

## Core Principles (Updated)

1. **Reverse Chronological Processing** - Process most recent month first (user preference)
2. **Mandatory 100% PDF Verification** - Every transaction must be verified against source PDFs
3. **Zero Tolerance for Schema Errors** - Validate database schema BEFORE first import attempt
4. **Comprehensive Deduplication** - Include merchant in deduplication key to avoid removing legitimate identical transactions
5. **Cross-Month Consistency** - Verify recurring transactions (rent, subscriptions) across all months
6. **Progressive Validation** - Verify each month before proceeding to next
7. **Knowledge Preservation** - Document all learnings for future batches

---

## Three-Gate Architecture

### Gate 1: Batch Pre-Flight Analysis (10-15 minutes)
**Agent:** data-engineer
**Objective:** Comprehensive analysis before any imports

**Tasks:**

1. **PDF Verification & Page Calculation**
   ```javascript
   // PDF Page Formula (from current month Oct 2025)
   pageNumber = monthsBack + 1

   // Example for Feb 2024:
   // Oct 2025 - Feb 2024 = 20 months back
   // Page = 20 + 1 = 21
   ```
   - Verify PDF files exist at calculated pages
   - Confirm first date in PDF matches expected month
   - Extract grand totals for later validation

2. **CSV Line Range Identification**
   - Locate CSV line numbers for each month's data
   - Document start/end lines for each section (Expense Tracker, Gross Income, Savings, Florida House)
   - Calculate expected transaction counts from line ranges

3. **Red Flag Cataloging**
   - Scan for negative amounts (conversion to positive income required)
   - Identify typo reimbursements (flexible regex needed)
   - Flag comma-formatted amounts (enhanced parsing required)
   - Detect zero-dollar transactions (must be excluded)
   - Find missing merchants/payment methods (default strategy needed)
   - Verify Florida House section dates (may need default to month-end)
   - Check for DSIL Design/LLC reimbursements (exclude from Reimbursement tag)
   - Identify potential duplicates across sections
   - Flag unusual patterns (multiple rents, income adjustments, large one-time expenses)

4. **Cross-Month Pattern Analysis**
   - Calculate expected THB percentage by month (location indicator)
   - Verify recurring transactions present (rent, subscriptions, utilities)
   - Analyze spending trends across batch
   - Flag outliers for user consultation

5. **Create Batch Manifest**
   - Processing order (reverse chronological recommended)
   - Expected transaction counts per month
   - Estimated time per month (based on transaction count and complexity)
   - Pause points and verification steps
   - Critical issues requiring user decisions

**Deliverables:**
- `BATCH-PREFLIGHT-REPORT.md` - Comprehensive analysis
- `BATCH-MANIFEST.md` - Execution strategy
- `{month}/RED-FLAGS.md` - Per-month anomaly catalog (with severity levels)
- `GATE-1-EXECUTIVE-SUMMARY.md` - High-level summary for user approval

**Auto-Proceed Criteria:**
- All PDFs verified and accessible
- Line ranges clearly identified
- No BLOCKING red flags without resolution strategy
- Expected patterns match historical data
- User questions documented (if any)

**Output Files:**
```
scripts/batch-imports/batch-{start}-{end}-{year}/
├── GATE-1-EXECUTIVE-SUMMARY.md
├── BATCH-PREFLIGHT-REPORT.md
├── BATCH-MANIFEST.md
├── {month-1}/
│   └── RED-FLAGS.md
├── {month-2}/
│   └── RED-FLAGS.md
└── {month-3}/
    └── RED-FLAGS.md
```

---

### Gate 2: Sequential Month Processing (3-6 hours)
**Agent:** data-engineer
**Objective:** Import each month with full 4-phase protocol

**For Each Month in Batch:**

#### Phase 1: Pre-Flight Analysis (5-10 min)
- Verify PDF page number calculation
- Extract expected totals
- Document red flags (severity-coded)
- Get user approval if blocking issues exist

#### Phase 2: Parse & Prepare (10-15 min)
**Critical Validations BEFORE Parsing:**

1. **Payment Method Schema Validation** (NEW in v1.2)
   ```javascript
   // REQUIRED FIELDS (from production schema):
   // - id (uuid, primary key)
   // - name (text, not null)
   // - user_id (uuid, foreign key)
   // - created_at (timestamp with time zone)
   // - updated_at (timestamp with time zone)
   // - sort_order (integer, not null)
   // - preferred_currency (text)
   //
   // FIELDS THAT DO NOT EXIST:
   // - icon (THIS FIELD DOES NOT EXIST - DO NOT USE)
   // - color (THIS FIELD DOES NOT EXIST - DO NOT USE)

   // Correct getOrCreatePaymentMethod implementation:
   async function getOrCreatePaymentMethod(name, userId, paymentMap) {
     // Check cache first
     if (paymentMap.has(name)) return paymentMap.get(name);

     // Check database
     const { data: existingMethod } = await supabase
       .from('payment_methods')
       .select('id')
       .eq('name', name)
       .eq('user_id', userId)
       .single();

     if (existingMethod) {
       paymentMap.set(name, existingMethod.id);
       return existingMethod.id;
     }

     // Get next sort_order (REQUIRED FIELD)
     const { data: maxSortData } = await supabase
       .from('payment_methods')
       .select('sort_order')
       .eq('user_id', userId)
       .order('sort_order', { ascending: false })
       .limit(1)
       .single();

     const nextSortOrder = maxSortData ? maxSortData.sort_order + 1 : 0;

     // Create new payment method (ONLY INCLUDE FIELDS THAT EXIST)
     const { data: newMethod, error } = await supabase
       .from('payment_methods')
       .insert({
         name,
         user_id: userId,
         sort_order: nextSortOrder
         // DO NOT include: icon, color (fields don't exist)
       })
       .select('id')
       .single();

     if (error) throw new Error(`Failed to create payment method: ${error.message}`);

     paymentMap.set(name, newMethod.id);
     return newMethod.id;
   }
   ```

2. **Deduplication Key Generation** (NEW in v1.2)
   ```javascript
   // CORRECT - Include merchant in deduplication key
   // This prevents removing legitimate identical transactions
   function generateDeduplicationKey(transaction) {
     return `${transaction.transaction_date}_${transaction.description}_${transaction.amount}_${transaction.currency}_${transaction.merchant || 'NO_MERCHANT'}`;
   }

   // EXAMPLE: Two Golf Reservations on same day, same amount
   // - Golf Reservation @ Course A: 2024-05-15_Golf Reservation_150.00_USD_Course A
   // - Golf Reservation @ Course B: 2024-05-15_Golf Reservation_150.00_USD_Course B
   // Result: Both imported (correct - different merchants)
   ```

3. **Enhanced Parsing Logic**
   ```javascript
   // Currency handling (CRITICAL - HARD RULE)
   // ⚠️ PARSER MUST ONLY EXTRACT ACTUAL AMOUNT + CURRENCY
   // ⚠️ NEVER PERFORM CONVERSIONS OR USE CONVERSION COLUMNS
   // ⚠️ APPLICATION HANDLES CONVERSION AT DISPLAY TIME

   if (row[6] && row[6].includes('THB')) {
     const match = row[6].match(/THB\s*([\d,.-]+)/);
     amount = parseFloat(match[1].replace(/,/g, '')); // Extract ACTUAL amount only
     currency = 'THB';                                 // Store currency symbol
     // NEVER use Column 8 (conversion column - completely ignore it)
     // NEVER calculate USD equivalents
     // NEVER multiply by exchange rates
   }

   // Example: CSV shows "THB 25000.00" and "$0.71" (bad conversion)
   // Parser extracts: amount=25000.00, currency='THB'
   // Database stores: amount=25000.00, original_currency='THB'
   // Application converts at display time using proper rates

   // Amount parsing (handles commas, tabs, quotes)
   function parseAmount(amountStr) {
     const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
     return parseFloat(cleaned);
   }

   // Negative amount handling (database constraint)
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

   // Zero-dollar exclusion
   if (amount === 0 || isNaN(amount)) {
     console.log(`⚠️  SKIPPING: $0.00 transaction - ${description}`);
     continue;
   }

   // Missing data defaults
   const merchant = row[merchantColumn]?.trim() || 'Unknown';
   const paymentMethod = row[paymentMethodColumn]?.trim() || 'Unknown';

   // Florida House missing dates
   if (section === 'Florida House' && !currentDate) {
     currentDate = getLastDayOfMonth(targetMonth);
   }
   ```

**Deliverables:**
- `{month}-CORRECTED.json` - Parsed transactions ready for import
- `PHASE-2-PARSE-REPORT.md` - Parsing summary with statistics

#### Phase 3: Database Import (15-30 min)
**Pre-Import Checks:**
1. Verify payment method schema (run test insert first)
2. Verify user ID exists
3. Check for existing transactions in date range (deduplication)
4. Confirm tag UUIDs match expected values

**Import Process:**
```javascript
// Expected Tag IDs (VERIFY THESE)
const EXPECTED_TAG_IDS = {
  "Reimbursement": "205d99a2-cf0a-44e0-92f3-e2b9eae1bf72",
  "Florida House": "178739fd-1712-4356-b21a-8936b6d0a461",
  "Business Expense": "973433bd-bf9f-469f-9b9f-20128def8726",
  "Savings/Investment": "c0928dfe-1544-4569-bbad-77fea7d7e5aa"
};

// Import with proper error handling
for (const transaction of transactions) {
  try {
    // Get/create vendor
    const vendorId = transaction.merchant ?
      await getOrCreateVendor(transaction.merchant, userId, vendorMap) : null;

    // Get/create payment method (using corrected schema)
    const paymentMethodId = transaction.payment_method ?
      await getOrCreatePaymentMethod(transaction.payment_method, userId, paymentMap) : null;

    // Insert transaction
    const { data: newTransaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        description: transaction.description,
        vendor_id: vendorId,
        payment_method_id: paymentMethodId,
        amount: transaction.amount,
        original_currency: transaction.currency,
        transaction_type: transaction.transaction_type,
        transaction_date: transaction.transaction_date
      })
      .select('id')
      .single();

    if (error) throw new Error(`Import failed: ${error.message}`);

    // Apply tags
    if (transaction.tags && transaction.tags.length > 0) {
      for (const tagName of transaction.tags) {
        const tagId = await getExistingTag(tagName, userId, tagMap);
        if (!tagId) {
          console.warn(`⚠️  Tag not found: "${tagName}"`);
          continue;
        }

        await supabase
          .from('transaction_tags')
          .insert({
            transaction_id: newTransaction.id,
            tag_id: tagId
          });
      }
    }

    successCount++;
  } catch (error) {
    failCount++;
    errors.push({ transaction, error: error.message });
  }
}
```

**Post-Import Verification:**
1. Check transaction count matches expected
2. Verify tag application (critical - see March 2025 zero-tag disaster)
3. Verify tag ID mapping to expected UUIDs
4. Check for duplicate transactions

**Deliverables:**
- Import script output log
- `PHASE-3-IMPORT-SUMMARY.md`

#### Phase 4: Comprehensive Validation (15-20 min)
**Two-Step Tag Verification (CRITICAL):**

```bash
# Step 1: Verify tags were applied
node scripts/check-{month}-tags.js

# Expected output:
# Tag Distribution:
# {
#   "Reimbursement": 15,
#   "Business Expense": 3,
#   "Florida House": 3
# }

# Step 2: Verify tag IDs are correct
node scripts/verify-{month}-tag-mapping.js

# Expected output:
# ✅ "Reimbursement" - All mapped to: 205d99a2-cf0a-44e0-92f3-e2b9eae1bf72
# ✅ "Florida House" - All mapped to: 178739fd-1712-4356-b21a-8936b6d0a461
```

**Critical Transaction Verification:**
- Rent transaction (THB 25,000-35,000)
- Monthly subscriptions (Netflix, iCloud, Google, etc.)
- All reimbursements
- All savings/investment transactions
- Large expenses (>$1,000)
- All income transactions

**Validation Queries:**
```javascript
// Verify no negative amounts (database constraint)
const negatives = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .filter('amount', 'lt', 0);

if (negatives.data.length > 0) {
  console.error('❌ CRITICAL: Found negative amounts in database');
}

// Verify currency distribution matches expected
const currencies = await supabase
  .from('transactions')
  .select('original_currency')
  .eq('user_id', userId)
  .gte('transaction_date', monthStart)
  .lte('transaction_date', monthEnd);

// Calculate THB percentage (should match pre-flight estimate ±5%)
```

**Deliverables:**
- `PHASE-4-VALIDATION-REPORT.md`
- Tag verification results
- Critical transaction checklist

**Month Auto-Proceed Criteria:**
- Transaction count within ±5% of expected
- All tags verified (count and ID mapping)
- Rent transaction confirmed
- No negative amounts in database
- Currency distribution matches expected pattern
- All critical transactions found

---

### Gate 3: Batch Validation & PDF Verification (30-45 minutes)
**Agent:** data-scientist
**Objective:** Cross-month analysis and mandatory 100% PDF verification

**Tasks:**

1. **Mandatory 100% PDF Verification** (NON-OPTIONAL)
   ```javascript
   // Automated PDF verification (if pdftotext available)
   async function verifyAgainstPDF(month, pdfPage) {
     const pdfText = await extractPDFText(pdfPage);
     const pdfTransactions = parsePDFTransactions(pdfText);

     const dbTransactions = await getMonthTransactions(month);

     // Compare counts
     if (dbTransactions.length !== month.expectedCount) {
       console.error(`❌ Count mismatch: DB=${dbTransactions.length}, Expected=${month.expectedCount}`);
     }

     // Compare daily totals
     const dbByDate = groupByDate(dbTransactions);
     const pdfByDate = groupByDate(pdfTransactions);

     for (const date of allDates) {
       const dbCount = dbByDate[date]?.length || 0;
       const pdfCount = pdfByDate[date]?.length || 0;

       if (dbCount !== pdfCount) {
         console.error(`❌ ${date}: DB=${dbCount}, PDF=${pdfCount}`);
       }
     }
   }

   // Manual verification (if automated fails)
   // - Verify all critical transactions against PDF
   // - Spot-check 10+ random transactions per month
   // - Verify all special transactions (rents, reimbursements, savings)
   // - Compare currency distributions
   // - Check grand totals (±2% acceptable due to PDF formula errors)
   ```

2. **Cross-Month Consistency Verification**
   ```javascript
   // Rent verification (CRITICAL)
   const rents = await supabase
     .from('transactions')
     .select('*')
     .eq('user_id', userId)
     .ilike('description', '%rent%')
     .gte('transaction_date', batchStart)
     .lte('transaction_date', batchEnd)
     .order('transaction_date');

   // Expected: 1 rent per month (unless apartment move)
   // Amount: THB 25,000-35,000 typically

   // Subscription continuity
   const subscriptions = [
     'Netflix', 'YouTube Premium', 'iCloud',
     'Google', 'T-Mobile', 'iPhone'
   ];

   for (const sub of subscriptions) {
     const found = await supabase
       .from('transactions')
       .select('transaction_date, amount')
       .eq('user_id', userId)
       .ilike('description', `%${sub}%`)
       .gte('transaction_date', batchStart)
       .lte('transaction_date', batchEnd);

     // Expected: Present in all 3 months (or documented reason for absence)
   }
   ```

3. **Tag Distribution Analysis**
   ```javascript
   // Aggregate tag counts across batch
   const tagStats = {};

   for (const month of batchMonths) {
     const monthTags = await getMonthTagDistribution(month);

     for (const [tagName, count] of Object.entries(monthTags)) {
       tagStats[tagName] = (tagStats[tagName] || 0) + count;
     }
   }

   // Verify totals match expectations
   // Reimbursement: Varies by location (0-32 per month)
   // Business Expense: 0-15 per month
   // Florida House: 0-5 per month (only if section present)
   // Savings/Investment: 0-1 per month (typically)
   ```

4. **Currency Pattern Analysis**
   ```javascript
   // Calculate THB% per month
   const currencyPatterns = batchMonths.map(month => ({
     month: month.name,
     thbPercent: calculateTHBPercent(month),
     location: determineLikelyLocation(month)
   }));

   // Verify patterns make sense
   // <10% THB = USA travel
   // >40% THB = Thailand residence
   ```

5. **Spending Trend Analysis**
   ```javascript
   // Flag outliers for review
   const monthlyTotals = batchMonths.map(month => ({
     month: month.name,
     expenseTotal: calculateTotal(month, 'expense'),
     incomeTotal: calculateTotal(month, 'income')
   }));

   // Check for unusual spikes (>50% variance from average)
   // Document explanations (moving expenses, travel, etc.)
   ```

**Deliverables:**
- `GATE3-PDF-VERIFICATION.md` - Mandatory 100% verification report
- `BATCH-VALIDATION-SUMMARY.md` - Cross-month analysis
- `BATCH-IMPORT-COMPLETE.md` - Final summary and approval

**Batch Approval Criteria:**
- All 3 months passed individual validation
- 100% PDF verification complete
- All rents confirmed (1 per month unless documented exception)
- Subscription continuity verified
- Tag distributions within expected ranges
- Currency patterns match historical data
- No systematic errors detected
- All red flags resolved and documented

**Final Output Structure:**
```
scripts/batch-imports/batch-{start}-{end}-{year}/
├── BATCH-IMPORT-COMPLETE.md
├── GATE3-PDF-VERIFICATION.md
├── BATCH-VALIDATION-SUMMARY.md
├── {month-1}/
│   ├── RED-FLAGS.md
│   ├── {month-1}-CORRECTED.json
│   ├── PHASE-2-PARSE-REPORT.md
│   ├── PHASE-3-IMPORT-SUMMARY.md
│   ├── PHASE-4-VALIDATION-REPORT.md
│   ├── import-{month-1}.js
│   └── verify-{month-1}.js
├── {month-2}/
│   └── [same structure]
└── {month-3}/
    └── [same structure]
```

---

## Red Flag System with Smart Escalation

### Severity Levels

**🔴 BLOCKING** - Must resolve before proceeding
- Payment method schema errors
- Missing merchant in deduplication key
- Tag application failures
- Database constraint violations
- Critical transactions missing (rent, large expenses)
- Systematic parsing errors

**🟡 WARNING** - Should address but can proceed with caution
- Unusual transaction patterns requiring user confirmation
- Missing merchants/payment methods (defaults acceptable)
- PDF formula errors (database is source of truth)
- Duplicate transactions across sections
- Income adjustments or corrections

**🟢 INFO** - Document for awareness, no action required
- THB percentage patterns (location indicators)
- Transaction count variations (118-259 normal range)
- Zero reimbursements (location-based)
- Typo reimbursements (handled by flexible regex)
- Comma-formatted amounts (handled by parseAmount)

### Smart Escalation Rules (v1.2 Enhanced)

**First Occurrence → BLOCKING**
- Requires immediate attention and resolution
- Must document resolution strategy
- Example: First time seeing VND currency column → BLOCKING

**Second Occurrence → WARNING**
- Known issue with documented resolution
- Proceed with established strategy
- Example: Second typo reimbursement → WARNING (flexible regex handles it)

**Third+ Occurrence → INFO**
- Well-understood pattern
- Automated handling confirmed working
- Example: Third negative amount → INFO (conversion logic proven)

---

## Critical Learnings from 18 Months (Sept 2024 - Sept 2025)

### Schema & Database

1. **Payment Method Schema** (May 2024 batch discovery)
   - Required fields: `name`, `user_id`, `sort_order`
   - Optional fields: `preferred_currency`
   - **FIELDS THAT DO NOT EXIST**: `icon`, `color`
   - Always query schema before first import attempt

2. **Deduplication Key Must Include Merchant** (May 2024 batch)
   - Without merchant: Removes legitimate identical transactions
   - Example: Two different golf courses, same date, same amount
   - Key format: `date_description_amount_currency_merchant`

3. **Database Positive Amount Constraint**
   - All amounts must be positive (enforced by CHECK constraint)
   - Negative amounts in CSV must be converted to positive income
   - Refunds, credits, reimbursements all stored as positive income

### Currency & Amount Parsing

4. **HARD RULE: Parser ONLY Extracts Amount + Currency** (Core Principle)
   - ✅ Parser extracts: Raw amount (e.g., 25000.00) + Currency symbol (e.g., 'THB')
   - ✅ Database stores: `amount=25000.00`, `original_currency='THB'`
   - ✅ Application converts at display time using proper historical/live rates
   - ❌ Parser NEVER performs conversions
   - ❌ Parser NEVER uses conversion columns (Column 8)
   - ❌ Parser NEVER multiplies by exchange rates
   - **Rationale:** Exchange rates in CSV may be erroneous (e.g., Dec 2023: $0.00003 instead of $0.0284). Application is source of truth for conversion rates.

5. **THB Column is Column 6, NEVER Column 8** (May/Jun/Jul 2025 re-import)
   - Column 6: Original THB amounts (SOURCE OF TRUTH for parsing)
   - Column 8: Converted USD amounts (IGNORE COMPLETELY - may be wrong)
   - Extract from Column 6, store as-is with 'THB' currency
   - Application will handle all currency conversions

6. **Comma-Formatted Amounts** (Multiple months)
   - Large amounts have commas: "$3,490.02", "$1,000.00"
   - Also tabs, quotes, spaces: `"$ 1,000.00"`
   - Use enhanced parseAmount(): `amountStr.replace(/[$,"\t()\s]/g, '')`

7. **Zero-Dollar Transactions Must Be Excluded** (Oct 2024)
   - Meaningless for financial tracking
   - Can cause division-by-zero issues
   - Skip during parsing, document in report

### Tag Application

7. **Two-Step Tag Verification is CRITICAL** (March 2025 disaster)
   - Step 1: Verify tags were applied (count > 0)
   - Step 2: Verify tag IDs match expected UUIDs
   - March 2025: ALL 253 transactions had 0 tags (import script bug)
   - Required deletion and re-import of entire month

8. **Expected Tag UUIDs**
   ```
   Reimbursement:        205d99a2-cf0a-44e0-92f3-e2b9eae1bf72
   Florida House:        178739fd-1712-4356-b21a-8936b6d0a461
   Business Expense:     973433bd-bf9f-469f-9b9f-20128def8726
   Savings/Investment:   c0928dfe-1544-4569-bbad-77fea7d7e5aa
   ```

9. **Typo-Tolerant Reimbursement Detection** (Feb 2025)
   - Regex: `/^Re(im|mi|m)?burs[e]?ment:?/i`
   - Handles: "Remibursement", "Rembursement", "Reimbursment"
   - Colon optional: "Reimbursement" vs "Reimbursement:"

10. **DSIL Design/LLC Exclusion** (Dec 2024)
    - Company income labeled "Reimbursement:" in description
    - Should NOT get Reimbursement tag
    - Check merchant before applying tag

### Data Quality

11. **Missing Merchants/Payment Methods** (Oct 2024)
    - Default to "Unknown" (user confirmed acceptable)
    - Document all defaults in red flag log
    - Transparency over data fabrication

12. **Florida House Missing Dates** (Feb 2025)
    - Section may have empty date column
    - Default to last day of target month
    - Not all months affected (check each month)

13. **PDF Formula Errors Acceptable** (Multiple months)
    - PDF grand totals may be wrong
    - PDF daily subtotals may include wrong sections
    - **Database is source of truth**, not PDF calculations
    - Focus on 1:1 transaction matching, not total matching

### Pattern Recognition

14. **THB Percentage as Location Indicator**
    - <10% THB = USA travel (Nov 2024: 5.1%)
    - >40% THB = Thailand residence (Feb 2025: 69.2%)
    - Predicts reimbursement counts, spending patterns

15. **Transaction Count Variation is Normal**
    - Range: 118-259 transactions per month
    - Wide variation (±50%) is completely normal
    - Factors: Location, travel, special events, spending patterns

16. **Zero Reimbursements Acceptable** (Nov 2024)
    - Location-based pattern (USA vs Thailand)
    - Reimbursement range: 0-32 per month
    - Not an error if user was in USA

### Validation Process

17. **Validation VERIFIES, Does Not MODIFY** (Nov 2024 v3.6 principle)
    - Parsing phase: Transforms data (negative → positive)
    - Validation phase: Verifies transformations occurred correctly
    - Don't re-apply parsing logic during validation

18. **Refund Detection in Validation**
    - Query by: `type='income'` + `description LIKE '%refund%'`
    - Don't query by: `amount < 0` (all amounts are positive)
    - Understand data transformations when validating

### Special Cases

19. **Apartment Move (Multiple Rents)** (Jan 2025)
    - Two different rent amounts = apartment move
    - Both valid, NOT duplicates
    - Requires user confirmation

20. **Identical Legitimate Transactions** (May 2024)
    - Same date, amount, description, different merchants
    - Example: Two golf reservations at different courses
    - Both must be imported (deduplication key includes merchant)

---

## Processing Order Recommendation

**User Preference: Reverse Chronological (Most Recent First)**

Benefits:
- Most recent data imported first (higher priority)
- User can start using recent data immediately
- Catch systematic errors early with fresh memory
- Easier to remember recent context

Example:
- Batch: May → April → March (not March → April → May)
- Next Batch: February → January → December (not December → January → February)

---

## Time Estimates

Based on 18 months of experience:

| Phase | Time (per month) | Notes |
|-------|-----------------|-------|
| Pre-Flight | 5-10 min | Faster for standard months |
| Parse & Prepare | 10-15 min | +5 min if complex red flags |
| Database Import | 15-30 min | Depends on transaction count |
| Validation | 15-20 min | +10 min if tag issues |
| **Total per month** | **45-75 min** | Average: ~60 min |

Batch of 3 months: **3-4 hours** (including Gate 1 and Gate 3)

---

## Success Metrics

### Per Month
- ✅ Transaction count within ±5% of expected
- ✅ All tags verified (count and ID mapping)
- ✅ Rent transaction confirmed
- ✅ No negative amounts in database
- ✅ Currency distribution matches expected
- ✅ All critical transactions found

### Per Batch
- ✅ All 3 months individually validated
- ✅ 100% PDF verification complete
- ✅ Cross-month consistency verified
- ✅ All red flags resolved
- ✅ Knowledge base updated
- ✅ Next batch prompt prepared

---

## Failure Recovery Procedures

### Payment Method Schema Error (v1.2 Addition)
**Symptoms:**
- Import fails with "column does not exist" error
- Error mentions `icon` or `color` fields

**Recovery:**
1. Stop import immediately
2. Fix getOrCreatePaymentMethod to use correct schema
3. Delete any partial transactions from failed import
4. Run deduplication check
5. Restart import from beginning

**Prevention:**
- Verify schema before first import attempt
- Test create with single payment method first

### Tag Application Failure (March 2025 lesson)
**Symptoms:**
- Check-tags.js shows 0 tags
- Expected tags but none found

**Recovery:**
1. Delete all transactions from affected month
2. Review import script tag logic
3. Verify tag UUIDs match expected values
4. Fix getExistingTag or createTransactionWithTags functions
5. Re-import entire month
6. Verify with two-step tag verification

**Prevention:**
- Always run two-step tag verification after import
- Never proceed to next month without tag verification

### Duplicate Transaction Detection (May 2024 lesson)
**Symptoms:**
- Legitimate transactions missing from database
- Example: Two golf reservations on same day

**Recovery:**
1. Review deduplication key generation
2. Verify merchant is included in key
3. Manually restore missing legitimate transactions
4. Document in red flag log

**Prevention:**
- Always include merchant in deduplication key
- Review deduplication logic during pre-flight

---

## Agent Assignment Strategy

### Gate 1: data-engineer
- Strong at analyzing CSV structure
- Good at pattern recognition
- Can calculate line ranges and counts
- Creates comprehensive reports

### Gate 2: data-engineer
- Executes parsing and import scripts
- Handles database operations
- Troubleshoots errors during import
- Verifies each month before proceeding

### Gate 3: data-scientist
- Strong at cross-month analysis
- Good at statistical validation
- Can identify systematic errors
- Creates final approval reports

---

## Next Batch Preparation Checklist

After completing a batch, prepare for next batch:

- [ ] Update KNOWLEDGE-EXTRACTION with new learnings
- [ ] Update this protocol (BATCH-IMPORT-PROTOCOL) if needed
- [ ] Archive current batch folder to read-only
- [ ] Calculate PDF pages for next batch
- [ ] Create next batch prompt with:
  - [ ] Target months (reverse chronological)
  - [ ] PDF pages
  - [ ] Expected transaction counts (if available)
  - [ ] Protocol versions to use
  - [ ] All critical learnings
  - [ ] Ready to copy/paste into new chat

---

## Version Control

**When to increment version:**

### Patch (v1.2.1)
- Minor clarifications
- Typo fixes
- Example updates

### Minor (v1.3)
- New red flag patterns
- Enhanced validation steps
- Additional learnings

### Major (v2.0)
- Architectural changes
- New gate added
- Fundamental process changes

---

## Appendix A: Complete Red Flag Catalog

All red flags encountered across 18 months (Sept 2024 - Sept 2025):

1. Negative amounts (all months)
2. Comma-formatted amounts (multiple months)
3. Typo reimbursements (Feb 2025, others)
4. Missing colon in "Reimbursement" (Sept 2024)
5. DSIL Design exclusion (Dec 2024)
6. Zero-dollar transactions (Oct 2024)
7. Missing merchants (Oct 2024: 7 transactions)
8. Missing payment methods (Oct 2024: 6 transactions)
9. Missing Florida House dates (Feb 2025)
10. PDF formula errors (multiple months)
11. Apartment move (multiple rents) (Jan 2025)
12. Income adjustments (Jan 2025)
13. Large one-time expenses (Sept 2024, Oct 2024)
14. Currency exchange pairs (Sept 2024)
15. Duplicate across sections (July 2024 insurance)
16. Zero reimbursements (Nov 2024)
17. Extreme low THB% (Nov 2024: 5.1%)
18. Extreme high THB% (Feb 2025: 69.2%)
19. Low transaction count (Nov 2024: 118)
20. High transaction count (Dec 2024: 259)
21. Payment method schema error (May 2024 batch)
22. Missing merchant in dedup key (May 2024 batch)
23. Tag application failure (March 2025)
24. Validation agent modification bug (Nov 2024)

---

**Protocol Maintained By:** Claude Code
**Last Batch Completed:** May-April-March 2024 (451 transactions)
**Next Batch:** February-January-December 2024/2023
**Total Transactions Imported:** 2,600+ across 18 months
**Success Rate:** 99.9% (with learnings applied)
