/**
 * APRIL 2025 RE-VALIDATION SCRIPT (POST TAG-FIX)
 *
 * Purpose: Re-validate April 2025 after adding 6 missing tags
 * - 5 Reimbursement tags (was 18, should be 23)
 * - 1 Florida House tag (was 4, should be 5)
 *
 * Focus Areas:
 * - Level 1: Section Grand Totals
 * - Level 4: Tag Distribution
 *
 * Expected Improvements:
 * - Expense Tracker variance should drop from -17.13% to ≤ ±2%
 * - Florida House variance should drop from -$107.31 to ≤ ±$5
 * - Tag counts should match exactly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// PDF Expected Values (from validation report)
const PDF_TOTALS = {
  expenseTracker: 11035.98,
  floridaHouse: 1293.81,
  savings: 341.67,
  grossIncome: 13094.69,
};

// Baseline (BEFORE fix) from validation report
const BASELINE = {
  expenseTracker: 9145.61,
  floridaHouse: 1186.50,
  savings: 341.67,
  grossIncome: 13146.15,
  tagCounts: {
    reimbursement: 18,
    floridaHouse: 4,
    savings: 1,
  }
};

// Exchange rate from rent transaction
const THB_TO_USD = 0.0294; // THB 35,000 = $1,029

const USER_EMAIL = 'dennis@dsil.design';
const START_DATE = '2025-04-01';
const END_DATE = '2025-04-30';

/**
 * Fetch all transactions for April 2025
 */
async function fetchTransactions() {
  // First get the user ID
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;

  const user = userData.users.find(u => u.email === USER_EMAIL);
  if (!user) throw new Error(`User ${USER_EMAIL} not found`);

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      tags:transaction_tags(tag:tags(name)),
      vendor:vendors(name),
      payment_method:payment_methods(name)
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', START_DATE)
    .lte('transaction_date', END_DATE)
    .order('transaction_date', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Convert amount to USD
 */
function toUSD(amount, currency) {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (currency === 'USD') return parsedAmount;
  if (currency === 'THB') return parsedAmount * THB_TO_USD;
  throw new Error(`Unknown currency: ${currency}`);
}

/**
 * Check if transaction has a specific tag
 */
function hasTag(transaction, tagName) {
  return transaction.tags?.some(t => t.tag.name === tagName) || false;
}

/**
 * Calculate section totals
 */
function calculateSections(transactions) {
  let expenseTracker = 0;
  let floridaHouse = 0;
  let savings = 0;
  let grossIncome = 0;

  const tagCounts = {
    reimbursement: 0,
    floridaHouse: 0,
    savings: 0,
  };

  const details = {
    expenseTrackerItems: [],
    floridaHouseItems: [],
    savingsItems: [],
    grossIncomeItems: [],
  };

  for (const t of transactions) {
    const usdAmount = toUSD(t.amount, t.original_currency);
    const tags = t.tags?.map(tt => tt.tag.name) || [];

    // Count tags
    if (hasTag(t, 'Reimbursement')) tagCounts.reimbursement++;
    if (hasTag(t, 'Florida House')) tagCounts.floridaHouse++;
    if (hasTag(t, 'Savings/Investment')) tagCounts.savings++;

    // Section calculations
    if (hasTag(t, 'Savings/Investment')) {
      // Savings section
      if (t.transaction_type === 'expense') {
        savings += usdAmount;
        details.savingsItems.push({ date: t.transaction_date, description: t.description, amount: usdAmount, tags });
      }
    } else if (hasTag(t, 'Florida House')) {
      // Florida House section
      if (t.transaction_type === 'expense') {
        floridaHouse += usdAmount;
        details.floridaHouseItems.push({ date: t.transaction_date, description: t.description, amount: usdAmount, tags });
      }
    } else if (t.transaction_type === 'income') {
      // Income - split between Expense Tracker (reimbursements) and Gross Income (non-reimbursements)
      if (hasTag(t, 'Reimbursement')) {
        // Reimbursements REDUCE the net expense (subtract from Expense Tracker)
        expenseTracker -= usdAmount;
        details.expenseTrackerItems.push({
          date: t.transaction_date,
          description: t.description,
          amount: -usdAmount, // Negative because it reduces expenses
          type: 'reimbursement-income',
          tags
        });
      } else {
        // Non-reimbursement income goes to Gross Income
        grossIncome += usdAmount;
        details.grossIncomeItems.push({ date: t.transaction_date, description: t.description, amount: usdAmount, tags });
      }
    } else if (t.transaction_type === 'expense') {
      // Regular expenses (not Florida House, not Savings) - ADD to Expense Tracker
      expenseTracker += usdAmount;
      details.expenseTrackerItems.push({
        date: t.transaction_date,
        description: t.description,
        amount: usdAmount,
        type: 'expense',
        tags
      });
    }
  }

  return {
    totals: {
      expenseTracker: Math.round(expenseTracker * 100) / 100,
      floridaHouse: Math.round(floridaHouse * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      grossIncome: Math.round(grossIncome * 100) / 100,
    },
    tagCounts,
    details,
  };
}

/**
 * Calculate variance and status
 */
function analyzeVariance(actual, expected, threshold) {
  const variance = actual - expected;
  const percentVariance = expected !== 0 ? (variance / expected) * 100 : 0;

  let status = 'FAIL';
  if (typeof threshold === 'number') {
    // Absolute threshold
    status = Math.abs(variance) <= threshold ? 'PASS' : 'FAIL';
  } else if (typeof threshold === 'object') {
    // Percentage or absolute
    const { percent, absolute } = threshold;
    if (Math.abs(percentVariance) <= percent || Math.abs(variance) <= absolute) {
      status = 'PASS';
    }
  }

  return {
    actual,
    expected,
    variance,
    percentVariance,
    status,
  };
}

/**
 * Generate comparison report
 */
function generateReport(results) {
  const { totals, tagCounts, details } = results;

  console.log('\n' + '='.repeat(80));
  console.log('APRIL 2025 RE-VALIDATION REPORT (POST TAG-FIX)');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Database: Supabase`);
  console.log(`User: ${USER_EMAIL}`);
  console.log(`Period: ${START_DATE} to ${END_DATE}`);
  console.log('='.repeat(80));

  // EXECUTIVE SUMMARY
  console.log('\n## EXECUTIVE SUMMARY\n');

  const expenseTrackerAnalysis = analyzeVariance(
    totals.expenseTracker,
    PDF_TOTALS.expenseTracker,
    { percent: 2, absolute: 150 }
  );
  const floridaHouseAnalysis = analyzeVariance(
    totals.floridaHouse,
    PDF_TOTALS.floridaHouse,
    5
  );
  const savingsAnalysis = analyzeVariance(
    totals.savings,
    PDF_TOTALS.savings,
    0
  );
  const grossIncomeAnalysis = analyzeVariance(
    totals.grossIncome,
    PDF_TOTALS.grossIncome,
    0
  );

  const allPassed = [
    expenseTrackerAnalysis,
    floridaHouseAnalysis,
    savingsAnalysis,
    grossIncomeAnalysis
  ].every(a => a.status === 'PASS');

  const tagsPassed =
    tagCounts.reimbursement === 23 &&
    tagCounts.floridaHouse === 5 &&
    tagCounts.savings === 1;

  console.log(`Overall Status: ${allPassed && tagsPassed ? '✅ ACCEPT' : '⚠️  ACCEPT WITH NOTES'}`);
  console.log(`Section Validations: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log(`Tag Validations: ${tagsPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log('');

  // BEFORE/AFTER COMPARISON
  console.log('\n## BEFORE/AFTER COMPARISON\n');
  console.log('### Section Totals\n');

  console.log('| Section | Before Fix | After Fix | PDF Target | Improvement | Status |');
  console.log('|---------|------------|-----------|------------|-------------|--------|');

  const etImprovement = Math.abs(totals.expenseTracker - PDF_TOTALS.expenseTracker) -
                        Math.abs(BASELINE.expenseTracker - PDF_TOTALS.expenseTracker);
  console.log(`| Expense Tracker | $${BASELINE.expenseTracker.toLocaleString()} | $${totals.expenseTracker.toLocaleString()} | $${PDF_TOTALS.expenseTracker.toLocaleString()} | ${etImprovement >= 0 ? '+' : ''}$${etImprovement.toFixed(2)} | ${expenseTrackerAnalysis.status} |`);

  const fhImprovement = Math.abs(totals.floridaHouse - PDF_TOTALS.floridaHouse) -
                        Math.abs(BASELINE.floridaHouse - PDF_TOTALS.floridaHouse);
  console.log(`| Florida House | $${BASELINE.floridaHouse.toLocaleString()} | $${totals.floridaHouse.toLocaleString()} | $${PDF_TOTALS.floridaHouse.toLocaleString()} | ${fhImprovement >= 0 ? '+' : ''}$${fhImprovement.toFixed(2)} | ${floridaHouseAnalysis.status} |`);

  console.log(`| Savings | $${BASELINE.savings.toLocaleString()} | $${totals.savings.toLocaleString()} | $${PDF_TOTALS.savings.toLocaleString()} | $0.00 | ${savingsAnalysis.status} |`);

  const giImprovement = Math.abs(totals.grossIncome - PDF_TOTALS.grossIncome) -
                        Math.abs(BASELINE.grossIncome - PDF_TOTALS.grossIncome);
  console.log(`| Gross Income | $${BASELINE.grossIncome.toLocaleString()} | $${totals.grossIncome.toLocaleString()} | $${PDF_TOTALS.grossIncome.toLocaleString()} | ${giImprovement >= 0 ? '+' : ''}$${giImprovement.toFixed(2)} | ${grossIncomeAnalysis.status} |`);

  console.log('\n### Tag Distribution\n');
  console.log('| Tag | Before Fix | After Fix | Expected | Status |');
  console.log('|-----|------------|-----------|----------|--------|');
  console.log(`| Reimbursement | ${BASELINE.tagCounts.reimbursement} | ${tagCounts.reimbursement} | 23 | ${tagCounts.reimbursement === 23 ? '✅ PASS' : '❌ FAIL'} |`);
  console.log(`| Florida House | ${BASELINE.tagCounts.floridaHouse} | ${tagCounts.floridaHouse} | 5 | ${tagCounts.floridaHouse === 5 ? '✅ PASS' : '❌ FAIL'} |`);
  console.log(`| Savings/Investment | ${BASELINE.tagCounts.savings} | ${tagCounts.savings} | 1 | ${tagCounts.savings === 1 ? '✅ PASS' : '❌ FAIL'} |`);

  // DETAILED VARIANCE ANALYSIS
  console.log('\n## DETAILED VARIANCE ANALYSIS\n');

  console.log('### Expense Tracker\n');
  console.log(`Database Total: $${totals.expenseTracker.toLocaleString()}`);
  console.log(`PDF Total: $${PDF_TOTALS.expenseTracker.toLocaleString()}`);
  console.log(`Variance: ${expenseTrackerAnalysis.variance >= 0 ? '+' : ''}$${expenseTrackerAnalysis.variance.toFixed(2)} (${expenseTrackerAnalysis.percentVariance >= 0 ? '+' : ''}${expenseTrackerAnalysis.percentVariance.toFixed(2)}%)`);
  console.log(`Threshold: ±2% or ±$150`);
  console.log(`Status: ${expenseTrackerAnalysis.status}`);
  console.log(`\nBefore Fix: $${BASELINE.expenseTracker.toLocaleString()} (-17.13%)`);
  console.log(`After Fix: $${totals.expenseTracker.toLocaleString()} (${expenseTrackerAnalysis.percentVariance >= 0 ? '+' : ''}${expenseTrackerAnalysis.percentVariance.toFixed(2)}%)`);
  console.log(`Improvement: ${etImprovement >= 0 ? '+' : ''}$${etImprovement.toFixed(2)}`);

  console.log('\n### Florida House\n');
  console.log(`Database Total: $${totals.floridaHouse.toLocaleString()}`);
  console.log(`PDF Total: $${PDF_TOTALS.floridaHouse.toLocaleString()}`);
  console.log(`Variance: ${floridaHouseAnalysis.variance >= 0 ? '+' : ''}$${floridaHouseAnalysis.variance.toFixed(2)} (${floridaHouseAnalysis.percentVariance >= 0 ? '+' : ''}${floridaHouseAnalysis.percentVariance.toFixed(2)}%)`);
  console.log(`Threshold: ±$5`);
  console.log(`Status: ${floridaHouseAnalysis.status}`);
  console.log(`\nBefore Fix: $${BASELINE.floridaHouse.toLocaleString()} (-$107.31)`);
  console.log(`After Fix: $${totals.floridaHouse.toLocaleString()} (${floridaHouseAnalysis.variance >= 0 ? '+' : ''}$${floridaHouseAnalysis.variance.toFixed(2)})`);
  console.log(`Improvement: ${fhImprovement >= 0 ? '+' : ''}$${fhImprovement.toFixed(2)}`);

  console.log('\n### Savings/Investment\n');
  console.log(`Database Total: $${totals.savings.toLocaleString()}`);
  console.log(`PDF Total: $${PDF_TOTALS.savings.toLocaleString()}`);
  console.log(`Variance: ${savingsAnalysis.variance >= 0 ? '+' : ''}$${savingsAnalysis.variance.toFixed(2)}`);
  console.log(`Status: ${savingsAnalysis.status}`);

  console.log('\n### Gross Income\n');
  console.log(`Database Total: $${totals.grossIncome.toLocaleString()}`);
  console.log(`PDF Total: $${PDF_TOTALS.grossIncome.toLocaleString()}`);
  console.log(`Variance: ${grossIncomeAnalysis.variance >= 0 ? '+' : ''}$${grossIncomeAnalysis.variance.toFixed(2)} (${grossIncomeAnalysis.percentVariance >= 0 ? '+' : ''}${grossIncomeAnalysis.percentVariance.toFixed(2)}%)`);
  console.log(`Status: ${grossIncomeAnalysis.status}`);
  console.log(`\nBefore Fix: $${BASELINE.grossIncome.toLocaleString()} (+$51.46)`);
  console.log(`After Fix: $${totals.grossIncome.toLocaleString()} (${grossIncomeAnalysis.variance >= 0 ? '+' : ''}$${grossIncomeAnalysis.variance.toFixed(2)})`);

  // FLORIDA HOUSE TRANSACTIONS (if tag count doesn't match)
  if (tagCounts.floridaHouse !== 5) {
    console.log('\n### Florida House Transactions (Current)\n');
    console.log(`Found ${tagCounts.floridaHouse} Florida House tagged transactions:\n`);
    details.floridaHouseItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item.date} - ${item.description}: $${item.amount.toFixed(2)}`);
    });
  }

  // REIMBURSEMENT TRANSACTIONS (if tag count doesn't match)
  if (tagCounts.reimbursement !== 23) {
    console.log('\n### Reimbursement Transactions (Current)\n');
    console.log(`Found ${tagCounts.reimbursement} Reimbursement tagged transactions:\n`);
    const reimbursements = details.expenseTrackerItems.filter(item => item.type === 'reimbursement-income');
    reimbursements.forEach((item, i) => {
      console.log(`${i + 1}. ${item.date} - ${item.description}: $${item.amount.toFixed(2)}`);
    });
  }

  // FINAL RECOMMENDATION
  console.log('\n## FINAL RECOMMENDATION\n');

  if (allPassed && tagsPassed) {
    console.log('Status: ✅ **ACCEPT**\n');
    console.log('All section totals are within acceptable variance thresholds.');
    console.log('All tag counts match expected values.');
    console.log('The tag fixes have successfully resolved the validation issues.');
  } else {
    console.log('Status: ⚠️  **ACCEPT WITH NOTES**\n');

    if (!allPassed) {
      console.log('Section Variance Issues:');
      if (expenseTrackerAnalysis.status === 'FAIL') {
        console.log(`- Expense Tracker variance (${expenseTrackerAnalysis.percentVariance.toFixed(2)}%) exceeds ±2% threshold`);
      }
      if (floridaHouseAnalysis.status === 'FAIL') {
        console.log(`- Florida House variance ($${floridaHouseAnalysis.variance.toFixed(2)}) exceeds ±$5 threshold`);
      }
      if (grossIncomeAnalysis.status === 'FAIL') {
        console.log(`- Gross Income variance ($${grossIncomeAnalysis.variance.toFixed(2)}) not exact match`);
      }
      console.log('');
    }

    if (!tagsPassed) {
      console.log('Tag Distribution Issues:');
      if (tagCounts.reimbursement !== 23) {
        console.log(`- Reimbursement tags: Expected 23, found ${tagCounts.reimbursement}`);
      }
      if (tagCounts.floridaHouse !== 5) {
        console.log(`- Florida House tags: Expected 5, found ${tagCounts.floridaHouse}`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('END OF REPORT');
  console.log('='.repeat(80) + '\n');

  return {
    passed: allPassed && tagsPassed,
    results: {
      sections: {
        expenseTracker: expenseTrackerAnalysis,
        floridaHouse: floridaHouseAnalysis,
        savings: savingsAnalysis,
        grossIncome: grossIncomeAnalysis,
      },
      tags: tagCounts,
      details,
    }
  };
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Fetching April 2025 transactions from database...');
    const transactions = await fetchTransactions();
    console.log(`✓ Fetched ${transactions.length} transactions\n`);

    console.log('Calculating section totals and tag distribution...');
    const results = calculateSections(transactions);
    console.log('✓ Calculations complete\n');

    const { passed } = generateReport(results);

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
