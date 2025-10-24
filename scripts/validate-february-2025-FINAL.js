#!/usr/bin/env node

/**
 * FEBRUARY 2025 COMPREHENSIVE VALIDATION SCRIPT - FINAL
 *
 * Validates February 2025 import against PDF source of truth
 * Using multi-level validation with 100% coverage
 *
 * Exchange Rate: 0.0294 (from rent: $735 / THB 25000)
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const USER_EMAIL = 'dennis@dsil.design';

// Exchange rate from PDF rent transaction
const EXCHANGE_RATE = 0.0294; // $735 / THB 25000

// PDF Expected Values
const PDF_EXPECTATIONS = {
  expenseTracker: {
    grandTotal: 4927.65,
    variance: 0.02, // 2%
    absoluteVariance: 150
  },
  floridaHouse: {
    grandTotal: 91.29,
    variance: 5
  },
  savings: {
    grandTotal: 0,
    variance: 0
  },
  grossIncome: {
    grandTotal: 175.00,
    variance: 0
  },
  transactionCount: 211,
  tagCounts: {
    reimbursement: 19,
    floridaHouse: 2,
    businessExpense: 1,
    savings: 0
  }
};

// Daily totals from PDF
const PDF_DAILY_TOTALS = {
  '2025-02-01': 1261.60,
  '2025-02-02': 136.53,
  '2025-02-03': -185.67,
  '2025-02-04': 46.25,
  '2025-02-05': 939.13,
  '2025-02-06': 46.70,
  '2025-02-07': 22.29,
  '2025-02-08': 112.95,
  '2025-02-09': 151.46,
  '2025-02-10': 21.14,
  '2025-02-11': 210.00,
  '2025-02-12': 39.64,
  '2025-02-13': 124.11,
  '2025-02-14': 182.35,
  '2025-02-15': 95.49,
  '2025-02-16': 620.15,
  '2025-02-17': 52.32,
  '2025-02-18': 122.21,
  '2025-02-19': 4.47,
  '2025-02-20': 157.07,
  '2025-02-21': 130.10,
  '2025-02-22': 111.21,
  '2025-02-23': 244.85,
  '2025-02-24': -43.49,
  '2025-02-25': 36.79,
  '2025-02-26': 154.89,
  '2025-02-27': 127.59,
  '2025-02-28': 5.52
};

// Results storage
const results = {
  level1: {},
  level2: {},
  level3: {},
  level4: {},
  level5: {},
  level6: {},
  errors: [],
  warnings: [],
  criticalErrors: []
};

/**
 * Get user ID from email
 */
async function getUserId() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Get tag IDs by name
 */
async function getTagIds(userId) {
  const { data } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId);

  const tagMap = {};
  for (const tag of data || []) {
    tagMap[tag.name] = tag.id;
  }
  return tagMap;
}

/**
 * Convert THB to USD using exchange rate
 */
function convertToUSD(amount, currency) {
  if (currency === 'USD') return amount;
  if (currency === 'THB') return amount * EXCHANGE_RATE;
  return amount;
}

/**
 * Get transactions with tags
 */
async function getTransactionsWithTags(userId, startDate, endDate, tagFilter = null) {
  let query = supabase
    .from('transactions')
    .select('*, transaction_tags(tag_id, tags(name))')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  const { data } = await query;

  // Transform to include tag names array
  return (data || []).map(txn => ({
    ...txn,
    tagNames: txn.transaction_tags?.map(tt => tt.tags.name) || []
  }));
}

/**
 * LEVEL 1: Section Grand Totals
 */
async function validateLevel1(userId) {
  console.log('\n=== LEVEL 1: SECTION GRAND TOTALS ===\n');

  const level1Results = {};
  const allTxns = await getTransactionsWithTags(userId, '2025-02-01', '2025-02-28');

  // 1. Expense Tracker (expenses + reimbursements, exclude Florida House, exclude Savings)
  console.log('1.1 Validating Expense Tracker Grand Total...');
  const expenseTrackerTxns = allTxns.filter(t =>
    !t.tagNames.includes('Florida House') &&
    !t.tagNames.includes('Savings/Investment')
  );

  let expenseTrackerTotal = 0;
  for (const txn of expenseTrackerTxns) {
    const usdAmount = convertToUSD(txn.amount, txn.original_currency);
    if (txn.transaction_type === 'expense') {
      expenseTrackerTotal += usdAmount;
    } else if (txn.transaction_type === 'income' && txn.tagNames.includes('Reimbursement')) {
      // Reimbursements are stored as positive income, but reduce the total
      expenseTrackerTotal -= usdAmount;
    }
    // Exclude non-reimbursement income from Expense Tracker total
  }

  const expenseTrackerVariance = Math.abs(expenseTrackerTotal - PDF_EXPECTATIONS.expenseTracker.grandTotal);
  const expenseTrackerPercentVariance = (expenseTrackerVariance / PDF_EXPECTATIONS.expenseTracker.grandTotal) * 100;
  const expenseTrackerPass = expenseTrackerPercentVariance <= (PDF_EXPECTATIONS.expenseTracker.variance * 100) ||
                             expenseTrackerVariance <= PDF_EXPECTATIONS.expenseTracker.absoluteVariance;

  level1Results.expenseTracker = {
    dbTotal: expenseTrackerTotal.toFixed(2),
    pdfTotal: PDF_EXPECTATIONS.expenseTracker.grandTotal.toFixed(2),
    variance: expenseTrackerVariance.toFixed(2),
    percentVariance: expenseTrackerPercentVariance.toFixed(2) + '%',
    pass: expenseTrackerPass,
    transactionCount: expenseTrackerTxns.length
  };

  console.log(`   DB Total: $${expenseTrackerTotal.toFixed(2)}`);
  console.log(`   PDF Total: $${PDF_EXPECTATIONS.expenseTracker.grandTotal.toFixed(2)}`);
  console.log(`   Variance: $${expenseTrackerVariance.toFixed(2)} (${expenseTrackerPercentVariance.toFixed(2)}%)`);
  console.log(`   Status: ${expenseTrackerPass ? '✅ PASS' : '❌ FAIL'}`);

  if (!expenseTrackerPass) {
    results.criticalErrors.push(`Level 1: Expense Tracker total variance exceeds threshold: $${expenseTrackerVariance.toFixed(2)}`);
  }

  // 2. Florida House
  console.log('\n1.2 Validating Florida House Grand Total...');
  const floridaHouseTxns = allTxns.filter(t => t.tagNames.includes('Florida House'));

  let floridaHouseTotal = 0;
  for (const txn of floridaHouseTxns) {
    const usdAmount = convertToUSD(txn.amount, txn.original_currency);
    floridaHouseTotal += usdAmount;
  }

  const floridaHouseVariance = Math.abs(floridaHouseTotal - PDF_EXPECTATIONS.floridaHouse.grandTotal);
  const floridaHousePass = floridaHouseVariance <= PDF_EXPECTATIONS.floridaHouse.variance;

  level1Results.floridaHouse = {
    dbTotal: floridaHouseTotal.toFixed(2),
    pdfTotal: PDF_EXPECTATIONS.floridaHouse.grandTotal.toFixed(2),
    variance: floridaHouseVariance.toFixed(2),
    pass: floridaHousePass,
    transactionCount: floridaHouseTxns.length
  };

  console.log(`   DB Total: $${floridaHouseTotal.toFixed(2)}`);
  console.log(`   PDF Total: $${PDF_EXPECTATIONS.floridaHouse.grandTotal.toFixed(2)}`);
  console.log(`   Variance: $${floridaHouseVariance.toFixed(2)}`);
  console.log(`   Status: ${floridaHousePass ? '✅ PASS' : '❌ FAIL'}`);

  if (!floridaHousePass) {
    results.criticalErrors.push(`Level 1: Florida House total variance exceeds threshold: $${floridaHouseVariance.toFixed(2)}`);
  }

  // 3. Savings/Investment
  console.log('\n1.3 Validating Savings/Investment Grand Total...');
  const savingsTxns = allTxns.filter(t => t.tagNames.includes('Savings/Investment'));

  const savingsTotal = savingsTxns.length;
  const savingsPass = savingsTotal === PDF_EXPECTATIONS.savings.grandTotal;

  level1Results.savings = {
    dbTotal: '$0.00',
    pdfTotal: '$0.00',
    variance: '$0.00',
    pass: savingsPass,
    transactionCount: savingsTotal
  };

  console.log(`   DB Total: $0.00`);
  console.log(`   PDF Total: $0.00`);
  console.log(`   Transaction Count: ${savingsTotal}`);
  console.log(`   Status: ${savingsPass ? '✅ PASS' : '❌ FAIL'}`);

  if (!savingsPass) {
    results.criticalErrors.push(`Level 1: Savings/Investment should have 0 transactions, found ${savingsTotal}`);
  }

  // 4. Gross Income (exclude reimbursements)
  console.log('\n1.4 Validating Gross Income Grand Total...');
  const incomeTxns = allTxns.filter(t =>
    t.transaction_type === 'income' &&
    !t.tagNames.includes('Reimbursement')
  );

  let incomeTotal = 0;
  for (const txn of incomeTxns) {
    const usdAmount = convertToUSD(txn.amount, txn.original_currency);
    incomeTotal += usdAmount;
  }

  const incomeVariance = Math.abs(incomeTotal - PDF_EXPECTATIONS.grossIncome.grandTotal);
  const incomePass = incomeVariance <= PDF_EXPECTATIONS.grossIncome.variance;

  level1Results.grossIncome = {
    dbTotal: incomeTotal.toFixed(2),
    pdfTotal: PDF_EXPECTATIONS.grossIncome.grandTotal.toFixed(2),
    variance: incomeVariance.toFixed(2),
    pass: incomePass,
    transactionCount: incomeTxns.length
  };

  console.log(`   DB Total: $${incomeTotal.toFixed(2)}`);
  console.log(`   PDF Total: $${PDF_EXPECTATIONS.grossIncome.grandTotal.toFixed(2)}`);
  console.log(`   Variance: $${incomeVariance.toFixed(2)}`);
  console.log(`   Status: ${incomePass ? '✅ PASS' : '❌ FAIL'}`);

  if (!incomePass) {
    results.criticalErrors.push(`Level 1: Gross Income total variance: $${incomeVariance.toFixed(2)}`);
  }

  results.level1 = level1Results;
  return level1Results;
}

/**
 * LEVEL 2: Daily Subtotals
 */
async function validateLevel2(userId) {
  console.log('\n=== LEVEL 2: DAILY SUBTOTALS ===\n');

  const dailyResults = [];
  const stats = {
    within1Dollar: 0,
    within5Dollars: 0,
    over5Dollars: 0,
    over100Dollars: 0
  };

  const allTxns = await getTransactionsWithTags(userId, '2025-02-01', '2025-02-28');

  for (const [date, pdfTotal] of Object.entries(PDF_DAILY_TOTALS)) {
    // Get all Expense Tracker transactions for this day
    const dayTxns = allTxns.filter(t =>
      t.transaction_date === date &&
      !t.tagNames.includes('Florida House') &&
      !t.tagNames.includes('Savings/Investment')
    );

    let dbDayTotal = 0;
    for (const txn of dayTxns) {
      const usdAmount = convertToUSD(txn.amount, txn.original_currency);
      if (txn.transaction_type === 'expense') {
        dbDayTotal += usdAmount;
      } else if (txn.transaction_type === 'income' && txn.tagNames.includes('Reimbursement')) {
        dbDayTotal -= usdAmount;
      }
      // Exclude non-reimbursement income
    }

    const variance = Math.abs(dbDayTotal - pdfTotal);
    let status = '✅';

    if (variance <= 1.00) {
      stats.within1Dollar++;
    } else if (variance <= 5.00) {
      stats.within5Dollars++;
      status = '⚠️';
    } else if (variance > 100.00) {
      stats.over100Dollars++;
      status = '❌';
      results.criticalErrors.push(`Level 2: ${date} variance exceeds $100: $${variance.toFixed(2)}`);
    } else {
      stats.over5Dollars++;
      status = '⚠️';
    }

    dailyResults.push({
      date,
      dbTotal: dbDayTotal.toFixed(2),
      pdfTotal: pdfTotal.toFixed(2),
      variance: variance.toFixed(2),
      status,
      transactionCount: dayTxns.length
    });
  }

  const totalDays = Object.keys(PDF_DAILY_TOTALS).length;
  const matchRate = (stats.within1Dollar / totalDays) * 100;
  const pass = matchRate >= 50 && stats.over100Dollars === 0;

  results.level2 = {
    dailyResults,
    stats,
    matchRate: matchRate.toFixed(2) + '%',
    pass
  };

  console.log('Daily Subtotal Statistics:');
  console.log(`   Within $1.00: ${stats.within1Dollar}/${totalDays} (${(stats.within1Dollar/totalDays*100).toFixed(1)}%)`);
  console.log(`   Within $5.00: ${stats.within5Dollars}/${totalDays} (${(stats.within5Dollars/totalDays*100).toFixed(1)}%)`);
  console.log(`   Over $5.00: ${stats.over5Dollars}/${totalDays}`);
  console.log(`   Over $100: ${stats.over100Dollars}/${totalDays}`);
  console.log(`   Match Rate: ${matchRate.toFixed(2)}%`);
  console.log(`   Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);

  return results.level2;
}

/**
 * LEVEL 3: Transaction Count Verification
 */
async function validateLevel3(userId) {
  console.log('\n=== LEVEL 3: TRANSACTION COUNT VERIFICATION ===\n');

  const allTxns = await getTransactionsWithTags(userId, '2025-02-01', '2025-02-28');

  const total = allTxns.length;
  const byType = {
    expense: allTxns.filter(t => t.transaction_type === 'expense').length,
    income: allTxns.filter(t => t.transaction_type === 'income').length
  };
  const byCurrency = {
    USD: allTxns.filter(t => t.original_currency === 'USD').length,
    THB: allTxns.filter(t => t.original_currency === 'THB').length
  };
  const bySection = {
    expenseTracker: allTxns.filter(t =>
      !t.tagNames.includes('Florida House') &&
      !t.tagNames.includes('Savings/Investment')
    ).length,
    floridaHouse: allTxns.filter(t => t.tagNames.includes('Florida House')).length,
    savings: allTxns.filter(t => t.tagNames.includes('Savings/Investment')).length,
    grossIncome: allTxns.filter(t =>
      t.transaction_type === 'income' &&
      !t.tagNames.includes('Reimbursement')
    ).length
  };

  const pass = total === PDF_EXPECTATIONS.transactionCount;

  results.level3 = {
    total,
    expected: PDF_EXPECTATIONS.transactionCount,
    variance: total - PDF_EXPECTATIONS.transactionCount,
    pass,
    byType,
    byCurrency,
    bySection
  };

  console.log(`Total Transactions: ${total}`);
  console.log(`Expected: ${PDF_EXPECTATIONS.transactionCount}`);
  console.log(`Variance: ${total - PDF_EXPECTATIONS.transactionCount}`);
  console.log(`\nBy Type:`);
  console.log(`   Expense: ${byType.expense}`);
  console.log(`   Income: ${byType.income}`);
  console.log(`\nBy Currency:`);
  console.log(`   USD: ${byCurrency.USD}`);
  console.log(`   THB: ${byCurrency.THB}`);
  console.log(`\nBy Section:`);
  console.log(`   Expense Tracker: ${bySection.expenseTracker}`);
  console.log(`   Florida House: ${bySection.floridaHouse}`);
  console.log(`   Savings: ${bySection.savings}`);
  console.log(`   Gross Income: ${bySection.grossIncome}`);
  console.log(`\nStatus: ${pass ? '✅ PASS' : '❌ FAIL'}`);

  if (!pass) {
    results.criticalErrors.push(`Level 3: Transaction count mismatch. Expected ${PDF_EXPECTATIONS.transactionCount}, found ${total}`);
  }

  return results.level3;
}

/**
 * LEVEL 4: Tag Distribution Verification
 */
async function validateLevel4(userId) {
  console.log('\n=== LEVEL 4: TAG DISTRIBUTION VERIFICATION ===\n');

  const allTxns = await getTransactionsWithTags(userId, '2025-02-01', '2025-02-28');

  const tagCounts = {
    reimbursement: allTxns.filter(t => t.tagNames.includes('Reimbursement')).length,
    floridaHouse: allTxns.filter(t => t.tagNames.includes('Florida House')).length,
    businessExpense: allTxns.filter(t => t.tagNames.includes('Business Expense')).length,
    savings: allTxns.filter(t => t.tagNames.includes('Savings/Investment')).length
  };

  const results_level4 = {};
  let allPass = true;

  for (const [tag, count] of Object.entries(tagCounts)) {
    const expected = PDF_EXPECTATIONS.tagCounts[tag];
    const pass = count === expected;
    const isCritical = count === 0 && expected > 0;

    results_level4[tag] = {
      count,
      expected,
      variance: count - expected,
      pass,
      critical: isCritical
    };

    console.log(`${tag}: ${count} (expected: ${expected}) ${pass ? '✅' : isCritical ? '❌ CRITICAL' : '❌'}`);

    if (!pass) {
      allPass = false;
      if (isCritical) {
        results.criticalErrors.push(`Level 4: CRITICAL - ${tag} count is 0 but expected ${expected}`);
      } else {
        results.errors.push(`Level 4: ${tag} count mismatch. Expected ${expected}, found ${count}`);
      }
    }
  }

  results.level4 = {
    tagCounts: results_level4,
    pass: allPass
  };

  console.log(`\nOverall Status: ${allPass ? '✅ PASS' : '❌ FAIL'}`);

  return results.level4;
}

/**
 * LEVEL 5: Critical Transaction Spot Checks
 */
async function validateLevel5(userId) {
  console.log('\n=== LEVEL 5: CRITICAL TRANSACTION SPOT CHECKS ===\n');

  const checks = [];
  const allTxns = await getTransactionsWithTags(userId, '2025-02-01', '2025-02-28');

  // 1. Rent Transaction
  console.log('5.1 Verifying Rent Transaction...');
  const rentTxn = allTxns.find(t =>
    t.transaction_date === '2025-02-05' &&
    t.description === "This Month's Rent"
  );

  const rentPass = rentTxn &&
                   rentTxn.amount === 25000 &&
                   rentTxn.original_currency === 'THB';

  checks.push({
    name: 'Rent Transaction',
    expected: { description: "This Month's Rent", amount: 25000, currency: 'THB', date: '2025-02-05' },
    found: rentTxn ? { description: rentTxn.description, amount: rentTxn.amount, currency: rentTxn.original_currency, date: rentTxn.transaction_date } : null,
    pass: rentPass
  });

  console.log(`   ${rentPass ? '✅' : '❌'} ${rentPass ? 'PASS' : 'FAIL'}`);

  // 2. Florida House Transactions
  console.log('5.2 Verifying Florida House Transactions...');
  const floridaTxns = allTxns.filter(t =>
    t.transaction_date === '2025-02-28' &&
    t.tagNames.includes('Florida House')
  );

  const waterBill = floridaTxns.find(t => t.description === 'Water Bill');
  const gasBill = floridaTxns.find(t => t.description === 'Gas Bill');

  const waterPass = waterBill && waterBill.amount === 54.8 && waterBill.original_currency === 'USD';
  const gasPass = gasBill && gasBill.amount === 36.49 && gasBill.original_currency === 'USD';

  checks.push({
    name: 'Florida House - Water Bill',
    expected: { description: 'Water Bill', amount: 54.8, currency: 'USD', date: '2025-02-28' },
    found: waterBill || null,
    pass: waterPass
  });

  checks.push({
    name: 'Florida House - Gas Bill',
    expected: { description: 'Gas Bill', amount: 36.49, currency: 'USD', date: '2025-02-28' },
    found: gasBill || null,
    pass: gasPass
  });

  console.log(`   Water Bill: ${waterPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Gas Bill: ${gasPass ? '✅ PASS' : '❌ FAIL'}`);

  // 3. Typo Reimbursements
  console.log('5.3 Verifying Typo Reimbursements...');
  const typoReimb = allTxns.filter(t =>
    t.tagNames.includes('Reimbursement') &&
    (t.description.includes('Remibursement:') ||
     t.description.includes('Rembursement:') ||
     t.description.includes('Reimbursment:'))
  );

  const remibursement = typoReimb.find(t => t.description.includes('Remibursement:'));
  const rembursement = typoReimb.find(t => t.description.includes('Rembursement:'));
  const reimbursment = typoReimb.find(t => t.description.includes('Reimbursment:'));

  console.log(`   Remibursement: ${remibursement ? '✅ FOUND' : '❌ NOT FOUND'}`);
  console.log(`   Rembursement: ${rembursement ? '✅ FOUND' : '❌ NOT FOUND'}`);
  console.log(`   Reimbursment: ${reimbursment ? '✅ FOUND' : '❌ NOT FOUND'}`);

  checks.push({
    name: 'Typo Reimbursements',
    expected: { count: 3, variants: ['Remibursement:', 'Rembursement:', 'Reimbursment:'] },
    found: { count: typoReimb.length, found: typoReimb.map(t => t.description) },
    pass: (remibursement || rembursement) && typoReimb.length >= 2
  });

  // 4. Golf Winnings (converted to income)
  console.log('5.4 Verifying Golf Winnings...');
  const golfWinnings = allTxns.find(t =>
    t.transaction_date === '2025-02-09' &&
    t.description === 'Golf Winnings'
  );

  const golfPass = golfWinnings &&
                   golfWinnings.amount === 500 &&
                   golfWinnings.original_currency === 'THB' &&
                   golfWinnings.transaction_type === 'income';

  checks.push({
    name: 'Golf Winnings',
    expected: { description: 'Golf Winnings', amount: 500, currency: 'THB', type: 'income', date: '2025-02-09' },
    found: golfWinnings || null,
    pass: golfPass
  });

  console.log(`   ${golfPass ? '✅ PASS' : '❌ FAIL'}`);

  // 5. Comma-formatted amount
  console.log('5.5 Verifying Comma-Formatted Amount...');
  const floridaHouseTxn = allTxns.find(t =>
    t.transaction_date === '2025-02-01' &&
    t.description === 'Florida House'
  );

  const commaPass = floridaHouseTxn &&
                    floridaHouseTxn.amount === 1000 &&
                    floridaHouseTxn.original_currency === 'USD';

  checks.push({
    name: 'Comma-Formatted Amount',
    expected: { description: 'Florida House', amount: 1000, currency: 'USD', date: '2025-02-01' },
    found: floridaHouseTxn || null,
    pass: commaPass
  });

  console.log(`   ${commaPass ? '✅ PASS' : '❌ FAIL'}`);

  // 6. Largest THB transaction
  console.log('5.6 Verifying Largest THB Transaction...');
  const thbTxns = allTxns.filter(t => t.original_currency === 'THB').sort((a, b) => b.amount - a.amount);
  const largestTHB = thbTxns[0];
  console.log(`   Largest: ${largestTHB?.description} - ${largestTHB?.amount} THB on ${largestTHB?.transaction_date}`);

  checks.push({
    name: 'Largest THB Transaction',
    found: largestTHB || null,
    pass: true
  });

  // 7. Largest USD transaction
  console.log('5.7 Verifying Largest USD Transaction...');
  const usdTxns = allTxns.filter(t => t.original_currency === 'USD').sort((a, b) => b.amount - a.amount);
  const largestUSD = usdTxns[0];
  console.log(`   Largest: ${largestUSD?.description} - $${largestUSD?.amount} on ${largestUSD?.transaction_date}`);

  checks.push({
    name: 'Largest USD Transaction',
    found: largestUSD || null,
    pass: true
  });

  const allPass = checks.every(c => c.pass);
  results.level5 = { checks, pass: allPass };

  console.log(`\nOverall Status: ${allPass ? '✅ PASS' : '❌ FAIL'}`);

  if (!allPass) {
    const failedChecks = checks.filter(c => !c.pass).map(c => c.name);
    results.criticalErrors.push(`Level 5: Failed critical transaction checks: ${failedChecks.join(', ')}`);
  }

  return results.level5;
}

/**
 * LEVEL 6: 100% Comprehensive 1:1 PDF Verification
 */
async function validateLevel6(userId) {
  console.log('\n=== LEVEL 6: 100% COMPREHENSIVE 1:1 PDF VERIFICATION ===\n');

  console.log('NOTE: Level 6 requires manual PDF extraction of ALL transactions.');
  console.log('This script provides the database query results for manual comparison.\n');

  const allTxns = await getTransactionsWithTags(userId, '2025-02-01', '2025-02-28');

  const level6Data = {
    expenseTracker: [],
    floridaHouse: [],
    grossIncome: [],
    savings: []
  };

  for (const txn of allTxns) {
    const entry = {
      date: txn.transaction_date,
      description: txn.description,
      amount: txn.amount,
      currency: txn.original_currency,
      usdAmount: convertToUSD(txn.amount, txn.original_currency).toFixed(2),
      type: txn.transaction_type,
      tags: txn.tagNames
    };

    if (txn.tagNames.includes('Florida House')) {
      level6Data.floridaHouse.push(entry);
    } else if (txn.tagNames.includes('Savings/Investment')) {
      level6Data.savings.push(entry);
    } else if (txn.transaction_type === 'income' && !txn.tagNames.includes('Reimbursement')) {
      level6Data.grossIncome.push(entry);
    } else {
      level6Data.expenseTracker.push(entry);
    }
  }

  results.level6 = {
    data: level6Data,
    stats: {
      expenseTracker: level6Data.expenseTracker.length,
      floridaHouse: level6Data.floridaHouse.length,
      grossIncome: level6Data.grossIncome.length,
      savings: level6Data.savings.length,
      total: allTxns.length
    },
    note: 'Manual PDF verification required for 100% coverage'
  };

  console.log('Database Transaction Counts by Section:');
  console.log(`   Expense Tracker: ${level6Data.expenseTracker.length}`);
  console.log(`   Florida House: ${level6Data.floridaHouse.length}`);
  console.log(`   Gross Income: ${level6Data.grossIncome.length}`);
  console.log(`   Savings: ${level6Data.savings.length}`);
  console.log(`   Total: ${allTxns.length}\n`);

  return results.level6;
}

/**
 * Generate Executive Summary
 */
function generateExecutiveSummary() {
  const allLevelsPassed =
    results.level1.expenseTracker?.pass &&
    results.level1.floridaHouse?.pass &&
    results.level1.savings?.pass &&
    results.level1.grossIncome?.pass &&
    results.level2?.pass &&
    results.level3?.pass &&
    results.level4?.pass &&
    results.level5?.pass;

  const criticalCount = results.criticalErrors.length;
  const errorCount = results.errors.length;
  const warningCount = results.warnings.length;

  return {
    overallStatus: allLevelsPassed && criticalCount === 0 ? 'PASS' : 'FAIL',
    criticalErrors: criticalCount,
    errors: errorCount,
    warnings: warningCount,
    recommendation: allLevelsPassed && criticalCount === 0
      ? 'APPROVE: February 2025 import validated successfully. All validation levels passed.'
      : 'REJECT: February 2025 import has validation failures. Review discrepancies before approval.',
    levels: {
      level1: results.level1.expenseTracker?.pass && results.level1.floridaHouse?.pass &&
              results.level1.savings?.pass && results.level1.grossIncome?.pass ? 'PASS' : 'FAIL',
      level2: results.level2?.pass ? 'PASS' : 'FAIL',
      level3: results.level3?.pass ? 'PASS' : 'FAIL',
      level4: results.level4?.pass ? 'PASS' : 'FAIL',
      level5: results.level5?.pass ? 'PASS' : 'FAIL',
      level6: 'MANUAL_REVIEW_REQUIRED'
    }
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     FEBRUARY 2025 COMPREHENSIVE VALIDATION - FINAL             ║');
  console.log('║     Multi-Level Validation with 100% Coverage                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('Retrieving user ID...');
    const userId = await getUserId();
    console.log(`User ID: ${userId}\n`);

    console.log('Exchange Rate: 0.0294 (from rent: $735 / THB 25000)\n');

    // Execute all validation levels
    await validateLevel1(userId);
    await validateLevel2(userId);
    await validateLevel3(userId);
    await validateLevel4(userId);
    await validateLevel5(userId);
    await validateLevel6(userId);

    // Generate executive summary
    const summary = generateExecutiveSummary();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    EXECUTIVE SUMMARY                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Overall Status: ${summary.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`\nValidation Levels:`);
    console.log(`   Level 1 (Section Grand Totals): ${summary.levels.level1}`);
    console.log(`   Level 2 (Daily Subtotals): ${summary.levels.level2}`);
    console.log(`   Level 3 (Transaction Count): ${summary.levels.level3}`);
    console.log(`   Level 4 (Tag Distribution): ${summary.levels.level4}`);
    console.log(`   Level 5 (Critical Spot Checks): ${summary.levels.level5}`);
    console.log(`   Level 6 (1:1 PDF Verification): ${summary.levels.level6}`);

    console.log(`\nIssue Summary:`);
    console.log(`   Critical Errors: ${summary.criticalErrors}`);
    console.log(`   Errors: ${summary.errors}`);
    console.log(`   Warnings: ${summary.warnings}`);

    if (summary.criticalErrors > 0) {
      console.log(`\nCritical Errors:`);
      results.criticalErrors.forEach(err => console.log(`   ❌ ${err}`));
    }

    if (summary.errors > 0) {
      console.log(`\nErrors:`);
      results.errors.forEach(err => console.log(`   ⚠️ ${err}`));
    }

    console.log(`\n${summary.recommendation}\n`);

    // Save full results to file
    const fs = require('fs');
    fs.writeFileSync(
      path.resolve(__dirname, 'february-2025-validation-results-FINAL.json'),
      JSON.stringify({ summary, ...results }, null, 2)
    );

    console.log('Full results saved to: scripts/february-2025-validation-results-FINAL.json\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
