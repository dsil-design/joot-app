#!/usr/bin/env node

/**
 * DECEMBER 2024 COMPREHENSIVE VALIDATION - CORRECTED SCHEMA
 *
 * Multi-level validation against PDF source of truth
 * Exchange Rate: 0.0291 (from rent: $727.50 / 25,000 THB)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const USER_EMAIL = 'dennis@dsil.design';
const EXCHANGE_RATE = 0.0291; // December 2024: $727.50 / 25,000 THB
const MONTH_START = '2024-12-01';
const MONTH_END = '2024-12-31';

// PDF Expected Values
const PDF_EXPECTATIONS = {
  expenseTracker: {
    grandTotal: 5851.28,
    variance: { percent: 0.02, absolute: 150 }
  },
  floridaHouse: {
    grandTotal: 251.07,
    variance: 5
  },
  savings: {
    grandTotal: 0.00,
    variance: 0
  },
  grossIncome: {
    grandTotal: 8001.84,
    transactions: [
      { description: 'Freelance Income - November', merchant: 'NJDA', amount: 175.00 },
      { description: 'Personal Income: Invoice 1001', merchant: 'DSIL Design', amount: 4500.00 },
      { description: 'Reimbursement: Health Insurance (Oct)', merchant: 'DSIL Design', amount: 619.42 },
      { description: 'Reimbursement: Cyber Security Insurance', merchant: 'DSIL Design', amount: 2088.00 },
      { description: 'Reimbursement: Health Insurance', merchant: 'DSIL Design', amount: 619.42 }
    ]
  },
  transactionCounts: {
    total: 259,
    expenses: 229,
    income: 30,
    usd: 144,
    thb: 115
  },
  tags: {
    reimbursement: 18,
    floridaHouse: 5,
    businessExpense: 9,
    savings: 0
  }
};

// Daily totals from PDF
const PDF_DAILY_TOTALS = {
  '2024-12-01': 111.91,
  '2024-12-02': 125.40,
  '2024-12-03': -10.44,
  '2024-12-04': 86.38,
  '2024-12-05': 795.34,
  '2024-12-06': 122.02,
  '2024-12-07': 168.17,
  '2024-12-08': 67.50,
  '2024-12-09': 373.46,
  '2024-12-10': 15.85,
  '2024-12-11': 64.41,
  '2024-12-12': 267.70,
  '2024-12-13': 153.40,
  '2024-12-14': 113.07,
  '2024-12-15': 100.27,
  '2024-12-16': 0.27,
  '2024-12-17': 294.31,
  '2024-12-18': -199.76,
  '2024-12-19': 3.93,
  '2024-12-20': 95.86,
  '2024-12-21': 215.25,
  '2024-12-22': 198.67,
  '2024-12-23': 30.60,
  '2024-12-24': 666.95,
  '2024-12-25': 41.05,
  '2024-12-26': 76.68,
  '2024-12-27': 256.68,
  '2024-12-28': 1337.08,
  '2024-12-29': 50.21,
  '2024-12-30': 282.96,
  '2024-12-31': -53.89
};

const results = {
  level1: {},
  level2: {},
  level3: {},
  level4: {},
  level5: {},
  redFlags: [],
  warnings: [],
  passed: []
};

function convertToUSD(amount, currency) {
  if (currency === 'THB') {
    return amount * EXCHANGE_RATE;
  }
  return amount;
}

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function calculateVariance(actual, expected) {
  const diff = actual - expected;
  const percentDiff = expected !== 0 ? (diff / expected) * 100 : 0;
  return { diff, percentDiff };
}

async function getUserId() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (error) throw new Error(`User not found: ${error.message}`);
  return data.id;
}

async function fetchAllTransactions(userId) {
  // Fetch transactions with vendors and payment methods
  const { data: txns, error: txnError } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', userId)
    .gte('transaction_date', MONTH_START)
    .lte('transaction_date', MONTH_END);

  if (txnError) throw new Error(`Failed to fetch transactions: ${txnError.message}`);

  // Fetch all tags for these transactions
  const transactionIds = txns.map(t => t.id);
  const { data: txnTags, error: tagError } = await supabase
    .from('transaction_tags')
    .select('transaction_id, tags(name)')
    .in('transaction_id', transactionIds);

  if (tagError) throw new Error(`Failed to fetch tags: ${tagError.message}`);

  // Build a map of transaction_id to tags
  const tagMap = {};
  (txnTags || []).forEach(tt => {
    if (!tagMap[tt.transaction_id]) tagMap[tt.transaction_id] = [];
    tagMap[tt.transaction_id].push(tt.tags.name);
  });

  // Enrich transactions with tags and normalize structure
  return txns.map(t => ({
    ...t,
    merchant: t.vendors?.name || 'Unknown',
    payment_method: t.payment_methods?.name || 'Unknown',
    currency: t.original_currency,
    date: t.transaction_date,
    tags: tagMap[t.id] || []
  }));
}

async function level1SectionGrandTotals(allTxns) {
  console.log('\n=== LEVEL 1: SECTION GRAND TOTALS ===\n');

  // 1. Expense Tracker (exclude Florida House, exclude Savings, exclude non-reimbursement income)
  const expenseTrackerFiltered = allTxns.filter(txn => {
    const tags = txn.tags || [];
    const hasFloridaHouse = tags.includes('Florida House');
    const hasSavings = tags.includes('Savings') || tags.includes('Investment');

    // Exclude Florida House and Savings
    if (hasFloridaHouse || hasSavings) return false;

    // Include all expenses
    if (txn.transaction_type === 'expense') return true;

    // Include income that represents reimbursements (negative conversions) or refunds
    // Exclude gross income (DSIL Design, NJDA)
    if (txn.transaction_type === 'income') {
      const isGrossIncome = txn.merchant === 'DSIL Design' || txn.merchant === 'NJDA';
      return !isGrossIncome;
    }

    return false;
  });

  const expenseTrackerTotal = expenseTrackerFiltered.reduce((sum, txn) => {
    const usdAmount = convertToUSD(txn.amount, txn.currency);
    // Income (refunds/credits) should be negative in the expense tracker total
    return sum + (txn.transaction_type === 'expense' ? usdAmount : -usdAmount);
  }, 0);

  const etVariance = calculateVariance(expenseTrackerTotal, PDF_EXPECTATIONS.expenseTracker.grandTotal);
  const etWithinPercent = Math.abs(etVariance.percentDiff) <= PDF_EXPECTATIONS.expenseTracker.variance.percent * 100;
  const etWithinAbsolute = Math.abs(etVariance.diff) <= PDF_EXPECTATIONS.expenseTracker.variance.absolute;
  const etPass = etWithinPercent || etWithinAbsolute;

  console.log(`Expense Tracker Grand Total:`);
  console.log(`  Database: ${formatCurrency(expenseTrackerTotal)}`);
  console.log(`  PDF Expected: ${formatCurrency(PDF_EXPECTATIONS.expenseTracker.grandTotal)}`);
  console.log(`  Difference: ${formatCurrency(etVariance.diff)} (${etVariance.percentDiff.toFixed(2)}%)`);
  console.log(`  Status: ${etPass ? '✅ PASS' : '❌ FAIL'}`);

  results.level1.expenseTracker = {
    actual: expenseTrackerTotal,
    expected: PDF_EXPECTATIONS.expenseTracker.grandTotal,
    variance: etVariance,
    pass: etPass,
    transactionCount: expenseTrackerFiltered.length
  };

  if (etPass) {
    results.passed.push('Level 1: Expense Tracker grand total within variance');
  } else {
    results.redFlags.push({
      level: 'Level 1',
      issue: 'Expense Tracker grand total outside variance',
      actual: formatCurrency(expenseTrackerTotal),
      expected: formatCurrency(PDF_EXPECTATIONS.expenseTracker.grandTotal),
      difference: formatCurrency(etVariance.diff)
    });
  }

  // 2. Florida House
  const floridaHouseTxns = allTxns.filter(txn =>
    (txn.tags || []).includes('Florida House')
  );

  const floridaHouseTotal = floridaHouseTxns.reduce((sum, txn) => {
    return sum + convertToUSD(txn.amount, txn.currency);
  }, 0);

  const fhVariance = calculateVariance(floridaHouseTotal, PDF_EXPECTATIONS.floridaHouse.grandTotal);
  const fhPass = Math.abs(fhVariance.diff) <= PDF_EXPECTATIONS.floridaHouse.variance;

  console.log(`\nFlorida House Grand Total:`);
  console.log(`  Database: ${formatCurrency(floridaHouseTotal)}`);
  console.log(`  PDF Expected: ${formatCurrency(PDF_EXPECTATIONS.floridaHouse.grandTotal)}`);
  console.log(`  Difference: ${formatCurrency(fhVariance.diff)}`);
  console.log(`  Status: ${fhPass ? '✅ PASS' : '❌ FAIL'}`);

  results.level1.floridaHouse = {
    actual: floridaHouseTotal,
    expected: PDF_EXPECTATIONS.floridaHouse.grandTotal,
    variance: fhVariance,
    pass: fhPass,
    transactionCount: floridaHouseTxns.length
  };

  if (fhPass) {
    results.passed.push('Level 1: Florida House grand total within variance');
  } else {
    results.redFlags.push({
      level: 'Level 1',
      issue: 'Florida House grand total outside variance',
      actual: formatCurrency(floridaHouseTotal),
      expected: formatCurrency(PDF_EXPECTATIONS.floridaHouse.grandTotal),
      difference: formatCurrency(fhVariance.diff)
    });
  }

  // 3. Savings
  const savingsTxns = allTxns.filter(txn =>
    (txn.tags || []).includes('Savings') || (txn.tags || []).includes('Investment')
  );

  const savingsTotal = savingsTxns.reduce((sum, txn) => {
    return sum + convertToUSD(txn.amount, txn.currency);
  }, 0);

  const savingsPass = Math.abs(savingsTotal - PDF_EXPECTATIONS.savings.grandTotal) <= PDF_EXPECTATIONS.savings.variance;

  console.log(`\nSavings/Investment Grand Total:`);
  console.log(`  Database: ${formatCurrency(savingsTotal)}`);
  console.log(`  PDF Expected: ${formatCurrency(PDF_EXPECTATIONS.savings.grandTotal)}`);
  console.log(`  Status: ${savingsPass ? '✅ PASS' : '❌ FAIL'}`);

  results.level1.savings = {
    actual: savingsTotal,
    expected: PDF_EXPECTATIONS.savings.grandTotal,
    pass: savingsPass,
    transactionCount: savingsTxns.length
  };

  if (savingsPass) {
    results.passed.push('Level 1: Savings grand total exact match');
  } else {
    results.redFlags.push({
      level: 'Level 1',
      issue: 'Savings grand total mismatch',
      actual: formatCurrency(savingsTotal),
      expected: formatCurrency(PDF_EXPECTATIONS.savings.grandTotal)
    });
  }

  // 4. Gross Income
  const grossIncomeTxns = allTxns.filter(txn =>
    txn.transaction_type === 'income' &&
    (txn.merchant === 'DSIL Design' || txn.merchant === 'NJDA')
  );

  const grossIncomeTotal = grossIncomeTxns.reduce((sum, txn) => {
    return sum + convertToUSD(txn.amount, txn.currency);
  }, 0);

  console.log(`\nGross Income Grand Total:`);
  console.log(`  Database: ${formatCurrency(grossIncomeTotal)}`);
  console.log(`  PDF Expected: ${formatCurrency(PDF_EXPECTATIONS.grossIncome.grandTotal)}`);
  console.log(`  Transaction count: ${grossIncomeTxns.length} (expected: ${PDF_EXPECTATIONS.grossIncome.transactions.length})`);

  // Check transaction list
  const giPass = Math.abs(grossIncomeTotal - PDF_EXPECTATIONS.grossIncome.grandTotal) < 0.01;

  console.log(`\n  Expected transactions:`);
  PDF_EXPECTATIONS.grossIncome.transactions.forEach(expected => {
    const found = grossIncomeTxns.find(txn =>
      txn.merchant === expected.merchant &&
      Math.abs(txn.amount - expected.amount) < 0.01 &&
      txn.description.includes(expected.description.split(':')[0])
    );
    console.log(`    ${found ? '✅' : '❌'} ${expected.description} (${expected.merchant}) - ${formatCurrency(expected.amount)}`);

    // Check for Reimbursement tag on DSIL Design transactions
    if (found && expected.merchant === 'DSIL Design' && expected.description.startsWith('Reimbursement:')) {
      const hasReimbursementTag = (found.tags || []).includes('Reimbursement');
      if (hasReimbursementTag) {
        results.redFlags.push({
          level: 'Level 1',
          issue: 'DSIL Design reimbursement should NOT have Reimbursement tag',
          transaction: expected.description,
          amount: formatCurrency(expected.amount),
          detail: 'These are company income, not personal reimbursements'
        });
        console.log(`      ⚠️  WARNING: Has Reimbursement tag (should NOT have tag)`);
      }
    }
  });

  console.log(`  Status: ${giPass ? '✅ PASS' : '❌ FAIL'}`);

  results.level1.grossIncome = {
    actual: grossIncomeTotal,
    expected: PDF_EXPECTATIONS.grossIncome.grandTotal,
    pass: giPass,
    transactionCount: grossIncomeTxns.length,
    transactions: grossIncomeTxns.map(t => ({
      description: t.description,
      merchant: t.merchant,
      amount: t.amount,
      tags: t.tags || []
    }))
  };

  if (giPass) {
    results.passed.push('Level 1: Gross Income grand total exact match');
  } else {
    results.redFlags.push({
      level: 'Level 1',
      issue: 'Gross Income grand total mismatch',
      actual: formatCurrency(grossIncomeTotal),
      expected: formatCurrency(PDF_EXPECTATIONS.grossIncome.grandTotal)
    });
  }
}

async function level2DailySubtotals(allTxns) {
  console.log('\n=== LEVEL 2: DAILY SUBTOTALS (EXPENSE TRACKER) ===\n');

  // Group by date and calculate daily totals (Expense Tracker logic)
  const dailyTotals = {};

  allTxns.forEach(txn => {
    const tags = txn.tags || [];
    const hasFloridaHouse = tags.includes('Florida House');
    const hasSavings = tags.includes('Savings') || tags.includes('Investment');

    // Only count Expense Tracker transactions
    if (hasFloridaHouse || hasSavings) return;

    const isGrossIncome = txn.transaction_type === 'income' &&
      (txn.merchant === 'DSIL Design' || txn.merchant === 'NJDA');

    if (isGrossIncome) return;

    const date = txn.date;
    if (!dailyTotals[date]) dailyTotals[date] = 0;

    const usdAmount = convertToUSD(txn.amount, txn.currency);
    dailyTotals[date] += txn.transaction_type === 'expense' ? usdAmount : -usdAmount;
  });

  const comparisons = [];
  let within1 = 0;
  let within5 = 0;
  let over5 = 0;
  let over100 = 0;

  Object.keys(PDF_DAILY_TOTALS).forEach(date => {
    const pdfTotal = PDF_DAILY_TOTALS[date];
    const dbTotal = dailyTotals[date] || 0;
    const diff = Math.abs(dbTotal - pdfTotal);

    if (diff <= 1.00) within1++;
    else if (diff <= 5.00) within5++;
    else over5++;

    if (diff > 100) over100++;

    const status = diff <= 1.00 ? '✅' : diff <= 5.00 ? '⚠️' : diff > 100 ? '🔴' : '❌';

    comparisons.push({
      date,
      dbTotal: formatCurrency(dbTotal),
      pdfTotal: formatCurrency(pdfTotal),
      difference: formatCurrency(diff),
      status
    });
  });

  console.log('| Date | DB Total | PDF Total | Difference | Status |');
  console.log('|------|----------|-----------|------------|--------|');
  comparisons.forEach(c => {
    console.log(`| ${c.date} | ${c.dbTotal} | ${c.pdfTotal} | ${c.difference} | ${c.status} |`);
  });

  const totalDays = Object.keys(PDF_DAILY_TOTALS).length;
  const within1Percent = (within1 / totalDays) * 100;
  const pass = within1Percent >= 50 && over100 === 0;

  console.log(`\nDaily Match Statistics:`);
  console.log(`  Within $1.00: ${within1}/${totalDays} (${within1Percent.toFixed(1)}%)`);
  console.log(`  Within $5.00: ${within5}/${totalDays}`);
  console.log(`  Over $5.00: ${over5}/${totalDays}`);
  console.log(`  Over $100: ${over100}/${totalDays}`);
  console.log(`  Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);

  results.level2 = {
    comparisons,
    within1,
    within5,
    over5,
    over100,
    within1Percent,
    pass
  };

  if (pass) {
    results.passed.push('Level 2: Daily subtotals meet acceptance criteria');
  } else {
    results.redFlags.push({
      level: 'Level 2',
      issue: 'Daily subtotals outside acceptance criteria',
      within1Percent: `${within1Percent.toFixed(1)}%`,
      over100Count: over100
    });
  }
}

async function level3TransactionCounts(allTxns) {
  console.log('\n=== LEVEL 3: TRANSACTION COUNT VERIFICATION ===\n');

  const total = allTxns.length;
  const expenses = allTxns.filter(t => t.transaction_type === 'expense').length;
  const income = allTxns.filter(t => t.transaction_type === 'income').length;
  const usd = allTxns.filter(t => t.currency === 'USD').length;
  const thb = allTxns.filter(t => t.currency === 'THB').length;

  console.log(`Total Transactions: ${total} (expected: ${PDF_EXPECTATIONS.transactionCounts.total})`);
  console.log(`  Expenses: ${expenses} (expected: ${PDF_EXPECTATIONS.transactionCounts.expenses})`);
  console.log(`  Income: ${income} (expected: ${PDF_EXPECTATIONS.transactionCounts.income})`);
  console.log(`  USD: ${usd} (expected: ${PDF_EXPECTATIONS.transactionCounts.usd})`);
  console.log(`  THB: ${thb} (expected: ${PDF_EXPECTATIONS.transactionCounts.thb})`);

  const pass =
    total === PDF_EXPECTATIONS.transactionCounts.total &&
    expenses === PDF_EXPECTATIONS.transactionCounts.expenses &&
    income === PDF_EXPECTATIONS.transactionCounts.income &&
    usd === PDF_EXPECTATIONS.transactionCounts.usd &&
    thb === PDF_EXPECTATIONS.transactionCounts.thb;

  console.log(`Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);

  results.level3 = {
    actual: { total, expenses, income, usd, thb },
    expected: PDF_EXPECTATIONS.transactionCounts,
    pass
  };

  if (pass) {
    results.passed.push('Level 3: All transaction counts exact match');
  } else {
    results.redFlags.push({
      level: 'Level 3',
      issue: 'Transaction count mismatch',
      actual: { total, expenses, income, usd, thb },
      expected: PDF_EXPECTATIONS.transactionCounts
    });
  }
}

async function level4TagDistribution(allTxns) {
  console.log('\n=== LEVEL 4: TAG DISTRIBUTION VERIFICATION ===\n');

  const tagCounts = {
    reimbursement: 0,
    floridaHouse: 0,
    businessExpense: 0,
    savings: 0
  };

  allTxns.forEach(txn => {
    const tags = txn.tags || [];
    if (tags.includes('Reimbursement')) tagCounts.reimbursement++;
    if (tags.includes('Florida House')) tagCounts.floridaHouse++;
    if (tags.includes('Business Expense')) tagCounts.businessExpense++;
    if (tags.includes('Savings') || tags.includes('Investment')) tagCounts.savings++;
  });

  console.log(`Reimbursement: ${tagCounts.reimbursement} (expected: ${PDF_EXPECTATIONS.tags.reimbursement})`);
  console.log(`Florida House: ${tagCounts.floridaHouse} (expected: ${PDF_EXPECTATIONS.tags.floridaHouse})`);
  console.log(`Business Expense: ${tagCounts.businessExpense} (expected: ${PDF_EXPECTATIONS.tags.businessExpense})`);
  console.log(`Savings/Investment: ${tagCounts.savings} (expected: ${PDF_EXPECTATIONS.tags.savings})`);

  const pass =
    tagCounts.reimbursement === PDF_EXPECTATIONS.tags.reimbursement &&
    tagCounts.floridaHouse === PDF_EXPECTATIONS.tags.floridaHouse &&
    tagCounts.businessExpense === PDF_EXPECTATIONS.tags.businessExpense &&
    tagCounts.savings === PDF_EXPECTATIONS.tags.savings;

  const totalTags = Object.values(tagCounts).reduce((sum, count) => sum + count, 0);

  if (totalTags === 0) {
    console.log('\n🔴 CRITICAL ERROR: All tag counts are 0!');
    results.redFlags.push({
      level: 'Level 4',
      issue: 'CRITICAL: All tag counts are 0',
      severity: 'CRITICAL'
    });
  }

  console.log(`Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);

  results.level4 = {
    actual: tagCounts,
    expected: PDF_EXPECTATIONS.tags,
    pass,
    totalTags
  };

  if (pass) {
    results.passed.push('Level 4: All tag distributions exact match');
  } else {
    results.redFlags.push({
      level: 'Level 4',
      issue: 'Tag distribution mismatch',
      actual: tagCounts,
      expected: PDF_EXPECTATIONS.tags
    });
  }
}

async function level5CriticalTransactions(allTxns) {
  console.log('\n=== LEVEL 5: CRITICAL TRANSACTION SPOT CHECKS ===\n');

  const checks = [];

  // 1. Rent transaction
  console.log('1. Rent Transaction:');
  const rent = allTxns.find(t =>
    t.description === "This Month\u2019s Rent" &&  // Using curly apostrophe (U+2019)
    t.date === '2024-12-05'
  );

  if (rent) {
    const rentPass =
      rent.amount === 25000 &&
      rent.currency === 'THB' &&
      rent.merchant === 'Pol';

    console.log(`  ✅ Found: ${rent.description}`);
    console.log(`  Amount: ${rent.amount} ${rent.currency} ${rent.amount === 25000 && rent.currency === 'THB' ? '✅' : '❌'}`);
    console.log(`  Merchant: ${rent.merchant} ${rent.merchant === 'Pol' ? '✅' : '❌'}`);
    console.log(`  Date: ${rent.date} ${rent.date === '2024-12-05' ? '✅' : '❌'}`);

    checks.push({ name: 'Rent transaction', pass: rentPass });
  } else {
    console.log(`  ❌ NOT FOUND`);
    checks.push({ name: 'Rent transaction', pass: false });
  }

  // 2. DSIL Design income (should NOT have Reimbursement tag)
  console.log('\n2. DSIL Design Income Transactions (should NOT have Reimbursement tag):');
  const dsilTxns = allTxns.filter(t => t.merchant === 'DSIL Design');

  dsilTxns.forEach(txn => {
    const hasReimbursementTag = (txn.tags || []).includes('Reimbursement');
    const pass = !hasReimbursementTag;
    console.log(`  ${pass ? '✅' : '❌'} ${txn.description} - ${formatCurrency(txn.amount)} ${hasReimbursementTag ? '(HAS Reimbursement tag - WRONG!)' : '(no tag - correct)'}`);
    checks.push({ name: `DSIL Design: ${txn.description}`, pass });
  });

  // 3. Florida House transactions
  console.log('\n3. Florida House Transactions:');
  const floridaHouse = allTxns.filter(t => (t.tags || []).includes('Florida House'));
  console.log(`  Count: ${floridaHouse.length} (expected: 5) ${floridaHouse.length === 5 ? '✅' : '❌'}`);

  floridaHouse.forEach(txn => {
    console.log(`  - ${txn.date}: ${txn.description} (${txn.merchant}) - ${formatCurrency(txn.amount)}`);
  });

  checks.push({ name: 'Florida House count', pass: floridaHouse.length === 5 });

  // 4. Negative amount conversions (should be positive income)
  console.log('\n4. Negative Amount Conversions (should be positive income):');
  const refunds = [
    { desc: 'Refund: Eufy camera', amount: 31.02 },
    { desc: 'Refund: Gag Gifts', amount: 24.58 },
    { desc: 'Compensation', amount: 19.99 },
    { desc: 'Payout: Class Action Settlement', amount: 47.86 },
    { desc: 'Trade-in: Apple Watch', amount: 112.35 },
    { desc: 'Refund: Auto Insurance', amount: 306.00 },
    { desc: 'Travel Credit Total', amount: 300.00 }
  ];

  refunds.forEach(refund => {
    const found = allTxns.find(t => t.description === refund.desc);
    if (found) {
      const pass = found.transaction_type === 'income' && found.amount > 0 && Math.abs(found.amount - refund.amount) < 0.01;
      console.log(`  ${pass ? '✅' : '❌'} ${refund.desc}: ${formatCurrency(found.amount)} (${found.transaction_type})`);
      checks.push({ name: `Refund: ${refund.desc}`, pass });
    } else {
      console.log(`  ❌ NOT FOUND: ${refund.desc}`);
      checks.push({ name: `Refund: ${refund.desc}`, pass: false });
    }
  });

  // 5. Comma-formatted amounts
  console.log('\n5. Comma-Formatted Amounts:');
  const commaAmounts = [
    { desc: 'Florida House', amount: 1000.00 },
    { desc: 'Personal Income: Invoice 1001', amount: 4500.00 },
    { desc: 'Reimbursement: Cyber Security Insurance', amount: 2088.00 }
  ];

  commaAmounts.forEach(item => {
    const found = allTxns.find(t => t.description === item.desc);
    if (found) {
      const pass = Math.abs(found.amount - item.amount) < 0.01;
      console.log(`  ${pass ? '✅' : '❌'} ${item.desc}: ${formatCurrency(found.amount)} (expected: ${formatCurrency(item.amount)})`);
      checks.push({ name: `Comma amount: ${item.desc}`, pass });
    } else {
      console.log(`  ❌ NOT FOUND: ${item.desc}`);
      checks.push({ name: `Comma amount: ${item.desc}`, pass: false });
    }
  });

  // 6. User corrections
  console.log('\n6. User Corrections:');
  const christmasDinner = allTxns.find(t => t.description === 'Christmas Dinner' && Math.abs(t.amount - 247.37) < 0.01);
  if (christmasDinner) {
    const hasBusinessTag = (christmasDinner.tags || []).includes('Business Expense');
    const pass = !hasBusinessTag;
    console.log(`  ${pass ? '✅' : '❌'} Christmas Dinner: NO Business Expense tag ${hasBusinessTag ? '(HAS tag - WRONG!)' : '(correct)'}`);
    checks.push({ name: 'Christmas Dinner - no Business tag', pass });
  }

  const pestTreatment = allTxns.find(t => t.description === 'Pest Treatment' && Math.abs(t.amount - 110.00) < 0.01);
  if (pestTreatment) {
    const hasTags = (pestTreatment.tags || []).length > 0;
    const pass = !hasTags;
    console.log(`  ${pass ? '✅' : '❌'} Pest Treatment: NO tags ${hasTags ? `(HAS tags: ${pestTreatment.tags.join(', ')} - WRONG!)` : '(correct)'}`);
    checks.push({ name: 'Pest Treatment - no tags', pass });
  }

  // 7. Largest transactions
  console.log('\n7. Largest Transactions:');
  const largestTHB = allTxns
    .filter(t => t.currency === 'THB' && t.transaction_type === 'expense')
    .sort((a, b) => b.amount - a.amount)[0];

  if (largestTHB) {
    console.log(`  Largest THB: ${largestTHB.description} - ${largestTHB.amount} THB ${largestTHB.amount === 25000 ? '✅' : '❌'}`);
    checks.push({ name: 'Largest THB is rent', pass: largestTHB.amount === 25000 });
  }

  const largestUSD = allTxns
    .filter(t => t.currency === 'USD' && t.transaction_type === 'income')
    .sort((a, b) => b.amount - a.amount)[0];

  if (largestUSD) {
    console.log(`  Largest USD Income: ${largestUSD.description} - ${formatCurrency(largestUSD.amount)} ${largestUSD.amount === 4500 ? '✅' : '❌'}`);
    checks.push({ name: 'Largest USD is Invoice 1001', pass: largestUSD.amount === 4500 });
  }

  const allPass = checks.every(c => c.pass);
  console.log(`\nStatus: ${allPass ? '✅ PASS' : '❌ FAIL'}`);

  results.level5 = {
    checks,
    pass: allPass
  };

  if (allPass) {
    results.passed.push('Level 5: All critical transactions verified');
  } else {
    const failed = checks.filter(c => !c.pass);
    failed.forEach(f => {
      results.redFlags.push({
        level: 'Level 5',
        issue: `Critical transaction check failed: ${f.name}`
      });
    });
  }
}

async function main() {
  try {
    console.log('DECEMBER 2024 COMPREHENSIVE VALIDATION');
    console.log('======================================');
    console.log(`Exchange Rate: ${EXCHANGE_RATE} (from rent: $727.50 / 25,000 THB)`);
    console.log(`Period: ${MONTH_START} to ${MONTH_END}`);
    console.log(`User: ${USER_EMAIL}`);

    const userId = await getUserId();
    console.log(`User ID: ${userId}`);

    console.log('\nFetching transactions...');
    const allTxns = await fetchAllTransactions(userId);
    console.log(`Fetched ${allTxns.length} transactions`);

    await level1SectionGrandTotals(allTxns);
    await level2DailySubtotals(allTxns);
    await level3TransactionCounts(allTxns);
    await level4TagDistribution(allTxns);
    await level5CriticalTransactions(allTxns);

    // Overall summary
    console.log('\n\n=== VALIDATION SUMMARY ===\n');

    const level1Pass = results.level1.expenseTracker.pass &&
                       results.level1.floridaHouse.pass &&
                       results.level1.savings.pass &&
                       results.level1.grossIncome.pass;

    console.log(`Level 1 - Section Grand Totals: ${level1Pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 2 - Daily Subtotals: ${results.level2.pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 3 - Transaction Counts: ${results.level3.pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 4 - Tag Distribution: ${results.level4.pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 5 - Critical Transactions: ${results.level5.pass ? '✅ PASS' : '❌ FAIL'}`);

    const overallPass = level1Pass && results.level2.pass && results.level3.pass &&
                        results.level4.pass && results.level5.pass;

    console.log(`\nOVERALL STATUS: ${overallPass ? '✅✅✅ PASS ✅✅✅' : '❌❌❌ FAIL ❌❌❌'}`);

    if (results.redFlags.length > 0) {
      console.log(`\nRed Flags: ${results.redFlags.length}`);
      results.redFlags.forEach((flag, i) => {
        console.log(`\n${i + 1}. [${flag.level}] ${flag.issue}`);
        if (flag.actual) console.log(`   Actual: ${typeof flag.actual === 'object' ? JSON.stringify(flag.actual) : flag.actual}`);
        if (flag.expected) console.log(`   Expected: ${typeof flag.expected === 'object' ? JSON.stringify(flag.expected) : flag.expected}`);
        if (flag.difference) console.log(`   Difference: ${flag.difference}`);
        if (flag.detail) console.log(`   Detail: ${flag.detail}`);
      });
    }

    // Save results
    fs.writeFileSync(
      '/Users/dennis/Code Projects/joot-app/scripts/december-2024-validation-results.json',
      JSON.stringify(results, null, 2)
    );

    console.log('\n✅ Results saved to scripts/december-2024-validation-results.json');

    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
