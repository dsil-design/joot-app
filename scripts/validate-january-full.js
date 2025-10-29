const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const JANUARY_2025_START = '2025-01-01';
const JANUARY_2025_END = '2025-01-31';

// From parse report
const EXPECTED = {
  total: 195,
  expenses: 172,
  income: 23,
  usd: 92,
  thb: 103,
  reimbursement: 15,
  businessExpense: 3,
  floridaHouse: 3,
  tags: 21
};

let report = [];
let comprehensiveData = {};

function log(text) {
  console.log(text);
  report.push(text);
}

function startSection(title) {
  log('\n' + '='.repeat(70));
  log(title);
  log('='.repeat(70));
}

async function validateTransactionCount(transactions) {
  startSection('LEVEL 3: TRANSACTION COUNT VERIFICATION');

  const expenses = transactions.filter(t => t.transaction_type === 'expense');
  const income = transactions.filter(t => t.transaction_type === 'income');
  const usd = transactions.filter(t => t.original_currency === 'USD');
  const thb = transactions.filter(t => t.original_currency === 'THB');

  const pass = transactions.length === EXPECTED.total ? 'PASS' : 'FAIL';
  log(`Total: ${transactions.length} (Expected: ${EXPECTED.total}) - ${pass}`);
  log(`  Expenses: ${expenses.length} (Expected: ${EXPECTED.expenses})`);
  log(`  Income: ${income.length} (Expected: ${EXPECTED.income})`);
  log(`  USD: ${usd.length} (Expected: ${EXPECTED.usd})`);
  log(`  THB: ${thb.length} (Expected: ${EXPECTED.thb})`);

  comprehensiveData.transactionCount = {
    total: transactions.length,
    expenses: expenses.length,
    income: income.length,
    usd: usd.length,
    thb: thb.length
  };
}

async function validateTags(transactions) {
  startSection('LEVEL 4: TAG DISTRIBUTION VERIFICATION');

  const { data: allTags, error } = await supabase
    .from('transaction_tags')
    .select('tag:tags(name), transaction_id');

  if (error) {
    log('ERROR: Could not query tags - ' + error.message);
    return;
  }

  const janTransactionIds = new Set(transactions.map(t => t.id));
  const tagCounts = {};

  allTags.forEach(tagEntry => {
    if (janTransactionIds.has(tagEntry.transaction_id) && tagEntry.tag) {
      const tagName = tagEntry.tag.name;
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    }
  });

  log('Tag Distribution:');
  Object.keys(tagCounts).sort().forEach(tagName => {
    const count = tagCounts[tagName];
    const expected = EXPECTED[tagName.replace(/\s/g, '').toLowerCase()] || 0;
    const status = count === expected ? 'PASS' : 'FAIL';
    log(`  ${tagName}: ${count} (Expected: ${expected}) - ${status}`);
  });

  const totalTags = Object.values(tagCounts).reduce((a, b) => a + b, 0);
  const pass = totalTags === EXPECTED.tags ? 'PASS' : 'FAIL';
  log(`Total tags: ${totalTags} (Expected: ${EXPECTED.tags}) - ${pass}`);

  comprehensiveData.tagCounts = tagCounts;
  comprehensiveData.tagCounts._total = totalTags;
}

async function validateCriticalTransactions(transactions) {
  startSection('LEVEL 5: CRITICAL TRANSACTION SPOT CHECKS');

  const rent1 = transactions.find(t =>
    t.transaction_date === '2025-01-02' && t.description === 'This Month\'s Rent'
  );

  const rent2 = transactions.find(t =>
    t.transaction_date === '2025-01-31' && t.description === 'First Month\'s Rent'
  );

  const incomeAdj = transactions.find(t =>
    t.description === 'Business income correction - returned funds'
  );

  log('\nRent Transactions:');
  if (rent1) {
    log(`  Rent #1 (Jan 2): FOUND`);
    log(`    Amount: ${rent1.amount} ${rent1.original_currency} (Expected: 25000 THB)`);
    log(`    Type: ${rent1.transaction_type} (Expected: expense)`);
    const status = rent1.amount === 25000 && rent1.original_currency === 'THB' ? 'PASS' : 'FAIL';
    log(`    Status: ${status}`);
  } else {
    log(`  Rent #1 (Jan 2): NOT FOUND - FAIL`);
  }

  if (rent2) {
    log(`  Rent #2 (Jan 31): FOUND`);
    log(`    Amount: ${rent2.amount} ${rent2.original_currency} (Expected: 35000 THB)`);
    log(`    Type: ${rent2.transaction_type} (Expected: expense)`);
    const status = rent2.amount === 35000 && rent2.original_currency === 'THB' ? 'PASS' : 'FAIL';
    log(`    Status: ${status}`);
  } else {
    log(`  Rent #2 (Jan 31): NOT FOUND - FAIL`);
  }

  log('\nIncome Adjustment (CRITICAL):');
  if (incomeAdj) {
    log(`  Status: FOUND`);
    log(`  Amount: ${incomeAdj.amount} ${incomeAdj.original_currency}`);
    log(`  Type: ${incomeAdj.transaction_type} (Expected: expense)`);
    log(`  Date: ${incomeAdj.transaction_date}`);
    const status = incomeAdj.transaction_type === 'expense' && incomeAdj.amount === 602 ? 'PASS' : 'FAIL';
    log(`  Verification: ${status}`);
  } else {
    log(`  Status: NOT FOUND - CRITICAL FAIL`);
  }

  comprehensiveData.criticalTransactions = {
    rent1: rent1 ? { found: true, amount: rent1.amount, currency: rent1.original_currency } : { found: false },
    rent2: rent2 ? { found: true, amount: rent2.amount, currency: rent2.original_currency } : { found: false },
    incomeAdj: incomeAdj ? { found: true, amount: incomeAdj.amount, type: incomeAdj.transaction_type } : { found: false }
  };
}

async function validateSamples(transactions) {
  startSection('LEVEL 1: SECTION GRAND TOTALS');

  // Get all tags to categorize transactions
  const { data: allTags } = await supabase
    .from('transaction_tags')
    .select('tag:tags(name), transaction_id');

  const janTransactionIds = new Set(transactions.map(t => t.id));
  const floridaHouseIds = new Set();
  const reimbursementIds = new Set();

  allTags.forEach(tagEntry => {
    if (janTransactionIds.has(tagEntry.transaction_id) && tagEntry.tag) {
      if (tagEntry.tag.name === 'Florida House') {
        floridaHouseIds.add(tagEntry.transaction_id);
      } else if (tagEntry.tag.name === 'Reimbursement') {
        reimbursementIds.add(tagEntry.transaction_id);
      }
    }
  });

  // Exchange rate from Rent #1 (25,000 THB)
  // Will calculate based on actual USD amount from rent transaction
  // For now, estimate at 0.0286 (1 THB = 0.0286 USD, or ~35 THB/USD)
  const EXCHANGE_RATE = 0.0286;

  // Florida House total
  const floridaHouse = transactions.filter(t => floridaHouseIds.has(t.id));
  const floridaHouseTotal = floridaHouse.reduce((sum, t) => {
    const amount = t.original_currency === 'THB' ? t.amount * EXCHANGE_RATE : t.amount;
    return sum + amount;
  }, 0);

  log(`\nFlorida House Total: $${floridaHouseTotal.toFixed(2)} (Expected: ~$1,123.27)`);
  floridaHouse.forEach(t => {
    const usdAmount = t.original_currency === 'THB' ? t.amount * EXCHANGE_RATE : t.amount;
    log(`  - ${t.transaction_date}: ${t.description} - ${usdAmount.toFixed(2)} USD`);
  });

  // Gross Income
  const incomeTransactions = transactions.filter(t => t.transaction_type === 'income');
  const incomeTotal = incomeTransactions.reduce((sum, t) => {
    const amount = t.original_currency === 'THB' ? t.amount * EXCHANGE_RATE : t.amount;
    return sum + amount;
  }, 0);

  log(`\nGross Income Total: $${incomeTotal.toFixed(2)}`);
  log(`  (Includes 6 income transactions from parse report)`);

  // Expense Tracker (all expenses + reimbursements, exclude Florida House)
  const expenseTrackerTransactions = transactions.filter(t =>
    !floridaHouseIds.has(t.id)
  );
  const expenseTrackerTotal = expenseTrackerTransactions.reduce((sum, t) => {
    const amount = t.original_currency === 'THB' ? t.amount * EXCHANGE_RATE : t.amount;
    return sum + amount;
  }, 0);

  log(`\nExpense Tracker Total: $${expenseTrackerTotal.toFixed(2)}`);
  log(`  (Expected from CSV: ~$6,925.77 + various adjustments)`);

  comprehensiveData.sectionTotals = {
    floridaHouse: floridaHouseTotal,
    income: incomeTotal,
    expenseTracker: expenseTrackerTotal,
    exchangeRate: EXCHANGE_RATE
  };
}

async function validateSampleTransactions(transactions) {
  startSection('SAMPLE TRANSACTIONS');

  const sorted = [...transactions].sort((a, b) => b.amount - a.amount);

  log('\nLargest 10 transactions:');
  sorted.slice(0, 10).forEach((t, i) => {
    const desc = t.description.substring(0, 40).padEnd(40);
    log(`${(i + 1).toString().padStart(2)}. ${t.transaction_date} | ${desc} | ${t.amount} ${t.original_currency}`);
  });

  log('\nFirst 5 transactions of month:');
  const chronological = [...transactions].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  chronological.slice(0, 5).forEach((t, i) => {
    const desc = t.description.substring(0, 40).padEnd(40);
    log(`${i + 1}. ${t.transaction_date} | ${desc} | ${t.amount} ${t.original_currency}`);
  });
}

async function main() {
  try {
    log('JANUARY 2025 COMPREHENSIVE VALIDATION REPORT');
    log(`Generated: ${new Date().toISOString()}`);

    // Query database
    log('\nQuerying January 2025 transactions from database...');
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', JANUARY_2025_START)
      .lte('transaction_date', JANUARY_2025_END)
      .order('transaction_date', { ascending: true });

    if (error) {
      log('ERROR: Database query failed - ' + error.message);
      process.exit(1);
    }

    log(`Retrieved ${transactions.length} transactions`);

    // Run validations
    await validateTransactionCount(transactions);
    await validateTags(transactions);
    await validateCriticalTransactions(transactions);
    await validateSamples(transactions);
    await validateSampleTransactions(transactions);

    startSection('VALIDATION SUMMARY');
    log('\nTransaction count: ' + (comprehensiveData.transactionCount.total === EXPECTED.total ? 'PASS' : 'FAIL'));
    log('Critical transactions found: ' +
      (comprehensiveData.criticalTransactions.rent1.found &&
       comprehensiveData.criticalTransactions.rent2.found &&
       comprehensiveData.criticalTransactions.incomeAdj.found ? 'PASS' : 'FAIL'));
    log('Tag count: ' + (comprehensiveData.tagCounts._total === EXPECTED.tags ? 'PASS' : 'FAIL'));

    // Save report files
    const reportPath = '/Users/dennis/Code Projects/joot-app/scripts/JANUARY-2025-VALIDATION-REPORT.md';
    fs.writeFileSync(reportPath, report.join('\n'));
    log('\nReport saved to: ' + reportPath);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
