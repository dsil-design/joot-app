/**
 * FINAL APRIL 2025 VALIDATION
 *
 * After tag corrections:
 * - Added 5 Reimbursement + 1 Florida House tags
 * - Removed 1 incorrect Reimbursement tag (Tax Payment - was DSIL income)
 *
 * Expected final counts:
 * - Reimbursement: 22
 * - Florida House: 5
 * - Savings/Investment: 1
 *
 * PDF Totals (from Budget for Import page):
 * - Expense Tracker: $11,035.98
 * - Florida House: $1,293.81
 * - Gross Income: $13,094.69
 * - Savings: $341.67
 *
 * Exchange Rate: THB 35,000 = $1,029 → 0.0294
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';
const supabase = createClient(supabaseUrl, supabaseKey);

const USER_EMAIL = 'dennis@dsil.design';
const MONTH_START = '2025-04-01';
const MONTH_END = '2025-04-30';
const THB_TO_USD = 0.0294; // From rent transaction: 1029 / 35000

// PDF totals from Budget for Import
const PDF_TOTALS = {
  expenseTracker: 11035.98,
  floridaHouse: 1293.81,
  grossIncome: 13094.69,
  savings: 341.67
};

// Acceptance thresholds
const THRESHOLDS = {
  expenseTracker: { percentMax: 2, absoluteMax: 150 },
  floridaHouse: { absoluteMax: 5 },
  grossIncome: { absoluteMax: 50 },
  savings: { absoluteMax: 0.01 }
};

// Helper: Check if transaction has a tag
function hasTag(transaction, tagName) {
  if (!transaction.transaction_tags || transaction.transaction_tags.length === 0) return false;
  return transaction.transaction_tags.some(tt => tt.tags && tt.tags.name === tagName);
}

// Helper: Convert to USD
function toUSD(amount, currency) {
  if (currency === 'THB') {
    return parseFloat((amount * THB_TO_USD).toFixed(2));
  }
  return amount;
}

async function validateApril2025Final() {
  console.log('\n================================================================================');
  console.log('APRIL 2025 FINAL VALIDATION REPORT');
  console.log('================================================================================\n');
  console.log('Generated: ' + new Date().toISOString().split('T')[0]);
  console.log('Database: Supabase');
  console.log('User: dennis@dsil.design');
  console.log('Period: 2025-04-01 to 2025-04-30');
  console.log('\nCONTEXT:');
  console.log('- Started with: 18 Reimbursement tags, 4 Florida House tags');
  console.log('- Added: 5 Reimbursement tags + 1 Florida House tag');
  console.log('- Removed: 1 incorrect Reimbursement tag (Tax Payment - was DSIL income)');
  console.log('- Expected final: 22 Reimbursement, 5 Florida House');
  console.log('\nExchange Rate: 0.0294 (THB 35,000 = $1,029)');
  console.log('');

  // Get all April 2025 transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select(`
      id,
      transaction_date,
      description,
      amount,
      original_currency,
      transaction_type,
      transaction_tags (
        tags (
          name
        )
      )
    `)
    .gte('transaction_date', MONTH_START)
    .lte('transaction_date', MONTH_END)
    .order('transaction_date');

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return;
  }

  console.log(`Total Transactions: ${transactions.length}\n`);

  // ============================================================================
  // SECTION 1: TAG COUNT VERIFICATION
  // ============================================================================

  console.log('================================================================================');
  console.log('SECTION 1: TAG COUNT VERIFICATION');
  console.log('================================================================================\n');

  const tagCounts = {
    'Reimbursement': 0,
    'Florida House': 0,
    'Savings/Investment': 0
  };

  const taggedTransactions = {
    'Reimbursement': [],
    'Florida House': [],
    'Savings/Investment': []
  };

  transactions.forEach(tx => {
    Object.keys(tagCounts).forEach(tagName => {
      if (hasTag(tx, tagName)) {
        tagCounts[tagName]++;
        taggedTransactions[tagName].push({
          date: tx.transaction_date,
          description: tx.description,
          amount: tx.amount,
          currency: tx.original_currency,
          amountUSD: toUSD(tx.amount, tx.original_currency)
        });
      }
    });
  });

  const tagValidation = [
    { tag: 'Reimbursement', expected: 22, actual: tagCounts['Reimbursement'] },
    { tag: 'Florida House', expected: 5, actual: tagCounts['Florida House'] },
    { tag: 'Savings/Investment', expected: 1, actual: tagCounts['Savings/Investment'] }
  ];

  let tagsPassed = true;

  tagValidation.forEach(({ tag, expected, actual }) => {
    const status = actual === expected ? '✅ PASS' : '❌ FAIL';
    const diff = actual - expected;
    const diffStr = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '';

    if (actual !== expected) tagsPassed = false;

    console.log(`${tag}:`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual:   ${actual}`);
    console.log(`  Status:   ${status} ${diffStr}`);
    console.log('');
  });

  // ============================================================================
  // SECTION 2: FINANCIAL TOTALS VERIFICATION
  // ============================================================================

  console.log('================================================================================');
  console.log('SECTION 2: FINANCIAL TOTALS VERIFICATION');
  console.log('================================================================================\n');

  // 1. GROSS INCOME (income WITHOUT Reimbursement tag)
  const incomeTransactions = transactions.filter(tx => tx.transaction_type === 'income');
  const grossIncomeTransactions = incomeTransactions.filter(tx =>
    !hasTag(tx, 'Reimbursement')
  );

  const grossIncomeTotal = grossIncomeTransactions.reduce((sum, tx) =>
    sum + toUSD(tx.amount, tx.original_currency), 0
  );

  const grossIncomeVariance = grossIncomeTotal - PDF_TOTALS.grossIncome;
  const grossIncomeVariancePct = (grossIncomeVariance / PDF_TOTALS.grossIncome) * 100;
  const grossIncomePassed = Math.abs(grossIncomeVariance) <= THRESHOLDS.grossIncome.absoluteMax;

  console.log('GROSS INCOME:');
  console.log(`  DB Total:       $${grossIncomeTotal.toFixed(2)}`);
  console.log(`  PDF Total:      $${PDF_TOTALS.grossIncome.toFixed(2)}`);
  console.log(`  Variance:       $${grossIncomeVariance.toFixed(2)} (${grossIncomeVariancePct.toFixed(2)}%)`);
  console.log(`  Threshold:      ±$${THRESHOLDS.grossIncome.absoluteMax}`);
  console.log(`  Status:         ${grossIncomePassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Transactions:   ${grossIncomeTransactions.length}`);
  console.log('');

  // 2. SAVINGS/INVESTMENT
  const savingsTransactions = taggedTransactions['Savings/Investment'];
  const savingsTotal = savingsTransactions.reduce((sum, tx) =>
    sum + tx.amountUSD, 0
  );

  const savingsVariance = savingsTotal - PDF_TOTALS.savings;
  const savingsPassed = Math.abs(savingsVariance) <= THRESHOLDS.savings.absoluteMax;

  console.log('SAVINGS/INVESTMENT:');
  console.log(`  DB Total:       $${savingsTotal.toFixed(2)}`);
  console.log(`  PDF Total:      $${PDF_TOTALS.savings.toFixed(2)}`);
  console.log(`  Variance:       $${savingsVariance.toFixed(2)}`);
  console.log(`  Threshold:      ±$${THRESHOLDS.savings.absoluteMax}`);
  console.log(`  Status:         ${savingsPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Transactions:   ${savingsTransactions.length}`);
  console.log('');

  // 3. FLORIDA HOUSE
  const floridaHouseTransactions = taggedTransactions['Florida House'];
  const floridaHouseTotal = floridaHouseTransactions.reduce((sum, tx) =>
    sum + Math.abs(tx.amountUSD), 0
  );

  const floridaVariance = floridaHouseTotal - PDF_TOTALS.floridaHouse;
  const floridaVariancePct = (floridaVariance / PDF_TOTALS.floridaHouse) * 100;
  const floridaPassed = Math.abs(floridaVariance) <= THRESHOLDS.floridaHouse.absoluteMax;

  console.log('FLORIDA HOUSE:');
  console.log(`  DB Total:       $${floridaHouseTotal.toFixed(2)}`);
  console.log(`  PDF Total:      $${PDF_TOTALS.floridaHouse.toFixed(2)}`);
  console.log(`  Variance:       $${floridaVariance.toFixed(2)} (${floridaVariancePct.toFixed(2)}%)`);
  console.log(`  Threshold:      ±$${THRESHOLDS.floridaHouse.absoluteMax}`);
  console.log(`  Status:         ${floridaPassed ? '✅ PASS' : '⚠️  WARN (check if acceptable)'}`);
  console.log(`  Transactions:   ${floridaHouseTransactions.length}`);
  console.log('');

  // 4. EXPENSE TRACKER (expenses EXCLUDING Florida House and Savings tags)
  const expenseTransactions = transactions.filter(tx => tx.transaction_type === 'expense');
  const expenseTrackerTxs = expenseTransactions.filter(tx =>
    !hasTag(tx, 'Florida House') && !hasTag(tx, 'Savings/Investment')
  );

  const expenseTrackerTotal = expenseTrackerTxs.reduce((sum, tx) =>
    sum + toUSD(Math.abs(tx.amount), tx.original_currency), 0
  );

  const expenseVariance = expenseTrackerTotal - PDF_TOTALS.expenseTracker;
  const expenseVariancePct = (expenseVariance / PDF_TOTALS.expenseTracker) * 100;
  const expensePassed = (
    Math.abs(expenseVariancePct) <= THRESHOLDS.expenseTracker.percentMax ||
    Math.abs(expenseVariance) <= THRESHOLDS.expenseTracker.absoluteMax
  );

  const reimbursementCount = expenseTrackerTxs.filter(tx => hasTag(tx, 'Reimbursement')).length;

  console.log('EXPENSE TRACKER:');
  console.log(`  DB Total:       $${expenseTrackerTotal.toFixed(2)}`);
  console.log(`  PDF Total:      $${PDF_TOTALS.expenseTracker.toFixed(2)}`);
  console.log(`  Variance:       $${expenseVariance.toFixed(2)} (${expenseVariancePct.toFixed(2)}%)`);
  console.log(`  Threshold:      ±2% OR ±$150`);
  console.log(`  Status:         ${expensePassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Transactions:   ${expenseTrackerTxs.length} (${reimbursementCount} with Reimbursement tag)`);
  console.log('');

  // ============================================================================
  // SECTION 3: OVERALL VALIDATION SUMMARY
  // ============================================================================

  console.log('================================================================================');
  console.log('SECTION 3: OVERALL VALIDATION SUMMARY');
  console.log('================================================================================\n');

  const overallPass = tagsPassed && grossIncomePassed && savingsPassed && floridaPassed && expensePassed;

  console.log('TAG COUNTS:');
  tagValidation.forEach(({ tag, expected, actual }) => {
    const status = actual === expected ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${tag}: ${status}`);
  });
  console.log('');

  console.log('SECTION TOTALS:');
  console.log(`  Gross Income:     ${grossIncomePassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Savings:          ${savingsPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Florida House:    ${floridaPassed ? '✅ PASS' : '⚠️  WARN'}`);
  console.log(`  Expense Tracker:  ${expensePassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  console.log('================================================================================');
  if (overallPass) {
    console.log('FINAL RECOMMENDATION: ✅ ACCEPT APRIL 2025 IMPORT');
    console.log('================================================================================\n');
    console.log('All validation checks have passed. The April 2025 data is accurate and ready.');
  } else {
    console.log('FINAL RECOMMENDATION: ❌ REJECT APRIL 2025 IMPORT');
    console.log('================================================================================\n');
    console.log('ISSUES REQUIRING ATTENTION:\n');

    if (!tagsPassed) {
      tagValidation.forEach(({ tag, expected, actual }) => {
        if (expected !== actual) {
          const diff = actual - expected;
          console.log(`❌ ${tag} count mismatch: ${actual} instead of ${expected} (${diff > 0 ? '+' : ''}${diff})`);
        }
      });
      console.log('');
    }

    if (!grossIncomePassed) {
      console.log(`❌ Gross Income variance: $${grossIncomeVariance.toFixed(2)} (${grossIncomeVariancePct.toFixed(2)}%) - exceeds ±$${THRESHOLDS.grossIncome.absoluteMax} threshold`);
    }

    if (!savingsPassed) {
      console.log(`❌ Savings variance: $${savingsVariance.toFixed(2)} - must be exact match`);
    }

    if (!floridaPassed) {
      console.log(`⚠️  Florida House variance: $${floridaVariance.toFixed(2)} (${floridaVariancePct.toFixed(2)}%) - exceeds ±$${THRESHOLDS.floridaHouse.absoluteMax} threshold`);
    }

    if (!expensePassed) {
      console.log(`❌ Expense Tracker variance: $${expenseVariance.toFixed(2)} (${expenseVariancePct.toFixed(2)}%) - exceeds ±2% OR ±$150 threshold`);
    }

    console.log('');
  }

  // ============================================================================
  // SECTION 4: DETAILED TRANSACTION LISTS (if issues exist)
  // ============================================================================

  if (!overallPass || !tagsPassed) {
    console.log('================================================================================');
    console.log('SECTION 4: DETAILED TRANSACTION LISTS');
    console.log('================================================================================\n');

    if (tagCounts['Reimbursement'] !== 22) {
      console.log(`REIMBURSEMENT TRANSACTIONS (${tagCounts['Reimbursement']} / expected 22):`);
      taggedTransactions['Reimbursement'].forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.date} | ${tx.description} | ${tx.currency} ${tx.amount.toFixed(2)} ($${tx.amountUSD.toFixed(2)})`);
      });
      console.log('');
    }

    if (tagCounts['Florida House'] !== 5) {
      console.log(`FLORIDA HOUSE TRANSACTIONS (${tagCounts['Florida House']} / expected 5):`);
      taggedTransactions['Florida House'].forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.date} | ${tx.description} | ${tx.currency} ${Math.abs(tx.amount).toFixed(2)} ($${Math.abs(tx.amountUSD).toFixed(2)})`);
      });
      console.log('');
    } else {
      // Show Florida House transactions even if count is correct
      console.log(`FLORIDA HOUSE TRANSACTIONS (${tagCounts['Florida House']}):`);
      let floridaSum = 0;
      taggedTransactions['Florida House'].forEach((tx, i) => {
        const amt = Math.abs(tx.amountUSD);
        floridaSum += amt;
        console.log(`  ${i + 1}. ${tx.date} | ${tx.description} | ${tx.currency} ${Math.abs(tx.amount).toFixed(2)} ($${amt.toFixed(2)})`);
      });
      console.log(`  TOTAL: $${floridaSum.toFixed(2)} (PDF expects $${PDF_TOTALS.floridaHouse.toFixed(2)})`);
      console.log('');
    }

    if (!grossIncomePassed) {
      console.log(`NON-REIMBURSEMENT INCOME TRANSACTIONS (${grossIncomeTransactions.length}):`);
      grossIncomeTransactions.forEach((tx, i) => {
        const usd = toUSD(tx.amount, tx.original_currency);
        console.log(`  ${i + 1}. ${tx.transaction_date} | ${tx.description} | ${tx.original_currency} ${tx.amount.toFixed(2)} ($${usd.toFixed(2)})`);
      });
      console.log('');
    }
  }

  console.log('================================================================================');
  console.log('END OF VALIDATION REPORT');
  console.log('================================================================================\n');
}

validateApril2025Final()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
