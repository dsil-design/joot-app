const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SEPTEMBER_2024_START = '2024-09-01';
const SEPTEMBER_2024_END = '2024-09-30';
const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

// Expected values from preflight
const EXPECTED = {
  totalTransactions: 217,
  expenses: 210,
  income: 7,
  usd: 142,
  thb: 75,
  reimbursement: 1,
  floridaHouse: 2,
  businessExpense: 0,
  savingsInvestment: 1
};

// Expected totals from PDF
const EXPECTED_TOTALS = {
  expenseTrackerNet: 6562.96,
  floridaHouse: 195.16,
  savingsInvestment: 341.67,
  grossIncome: 6724.05
};

// Exchange rate from rent transaction: THB 25,000 = $737.50
const EXCHANGE_RATE = 737.50 / 25000; // 0.0295

async function getAllData() {
  console.log('=== SEPTEMBER 2024 COMPREHENSIVE VALIDATION ===\n');
  console.log('Querying September 2024 transactions with tags...\n');

  // Query all September 2024 transactions with tags
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, transaction_tags(tag_id, tags(id, name))')
    .eq('user_id', USER_ID)
    .gte('transaction_date', SEPTEMBER_2024_START)
    .lte('transaction_date', SEPTEMBER_2024_END)
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('Database query error:', error);
    return null;
  }

  console.log('Found ' + transactions.length + ' total transactions\n');

  // Helper function to get tag names
  function getTagNames(tx) {
    if (!tx.transaction_tags || tx.transaction_tags.length === 0) {
      return [];
    }
    return tx.transaction_tags
      .filter(tt => tt.tags && tt.tags.name)
      .map(tt => tt.tags.name);
  }

  // ===== LEVEL 3: TRANSACTION COUNT VERIFICATION =====
  console.log('=== LEVEL 3: TRANSACTION COUNT VERIFICATION ===');
  const expenses = transactions.filter(t => t.transaction_type === 'expense');
  const income = transactions.filter(t => t.transaction_type === 'income');
  const usd = transactions.filter(t => t.original_currency === 'USD');
  const thb = transactions.filter(t => t.original_currency === 'THB');

  const level3Results = {
    total: { db: transactions.length, expected: EXPECTED.totalTransactions, match: transactions.length === EXPECTED.totalTransactions },
    expenses: { db: expenses.length, expected: EXPECTED.expenses, match: expenses.length === EXPECTED.expenses },
    income: { db: income.length, expected: EXPECTED.income, match: income.length === EXPECTED.income },
    usd: { db: usd.length, expected: EXPECTED.usd, match: usd.length === EXPECTED.usd },
    thb: { db: thb.length, expected: EXPECTED.thb, match: thb.length === EXPECTED.thb }
  };

  console.log('Total Transactions: ' + transactions.length + ' (expected: ' + EXPECTED.totalTransactions + ') ' + (level3Results.total.match ? 'PASS' : 'FAIL'));
  console.log('Expenses: ' + expenses.length + ' (expected: ' + EXPECTED.expenses + ') ' + (level3Results.expenses.match ? 'PASS' : 'FAIL'));
  console.log('Income: ' + income.length + ' (expected: ' + EXPECTED.income + ') ' + (level3Results.income.match ? 'PASS' : 'FAIL'));
  console.log('USD: ' + usd.length + ' (expected: ' + EXPECTED.usd + ') ' + (level3Results.usd.match ? 'PASS' : 'FAIL'));
  console.log('THB: ' + thb.length + ' (expected: ' + EXPECTED.thb + ') ' + (level3Results.thb.match ? 'PASS' : 'FAIL'));

  // ===== LEVEL 4: TAG DISTRIBUTION =====
  console.log('\n=== LEVEL 4: TAG DISTRIBUTION ===');
  const reimbursement = transactions.filter(t => getTagNames(t).includes('Reimbursement'));
  const floridaHouse = transactions.filter(t => getTagNames(t).includes('Florida House'));
  const businessExpense = transactions.filter(t => getTagNames(t).includes('Business Expense'));
  const savingsInvestment = transactions.filter(t => getTagNames(t).includes('Savings/Investment'));

  const level4Results = {
    reimbursement: { db: reimbursement.length, expected: EXPECTED.reimbursement, match: reimbursement.length === EXPECTED.reimbursement },
    floridaHouse: { db: floridaHouse.length, expected: EXPECTED.floridaHouse, match: floridaHouse.length === EXPECTED.floridaHouse },
    businessExpense: { db: businessExpense.length, expected: EXPECTED.businessExpense, match: businessExpense.length === EXPECTED.businessExpense },
    savingsInvestment: { db: savingsInvestment.length, expected: EXPECTED.savingsInvestment, match: savingsInvestment.length === EXPECTED.savingsInvestment }
  };

  console.log('Reimbursement: ' + reimbursement.length + ' (expected: ' + EXPECTED.reimbursement + ') ' + (level4Results.reimbursement.match ? 'PASS' : 'FAIL'));
  console.log('Florida House: ' + floridaHouse.length + ' (expected: ' + EXPECTED.floridaHouse + ') ' + (level4Results.floridaHouse.match ? 'PASS' : 'FAIL'));
  console.log('Business Expense: ' + businessExpense.length + ' (expected: ' + EXPECTED.businessExpense + ') ' + (level4Results.businessExpense.match ? 'PASS' : 'FAIL'));
  console.log('Savings/Investment: ' + savingsInvestment.length + ' (expected: ' + EXPECTED.savingsInvestment + ') ' + (level4Results.savingsInvestment.match ? 'PASS' : 'FAIL'));

  // ===== LEVEL 1: SECTION GRAND TOTALS =====
  console.log('\n=== LEVEL 1: SECTION GRAND TOTALS ===');

  // Calculate totals
  let expenseTrackerNetTotal = 0;
  let floridaHouseTotal = 0;
  let savingsInvestmentTotal = 0;
  let grossIncomeTotal = 0;

  transactions.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    const usdAmount = t.original_currency === 'USD' ? amount : amount * EXCHANGE_RATE;
    const tags = getTagNames(t);

    if (t.transaction_type === 'income') {
      grossIncomeTotal += usdAmount;
    } else {
      // Expense
      if (tags.includes('Florida House')) {
        floridaHouseTotal += usdAmount;
      } else if (tags.includes('Savings/Investment')) {
        savingsInvestmentTotal += usdAmount;
      } else {
        expenseTrackerNetTotal += usdAmount;
      }
    }
  });

  const level1Results = {
    expenseTrackerNet: {
      db: expenseTrackerNetTotal,
      expected: EXPECTED_TOTALS.expenseTrackerNet,
      variance: Math.abs(expenseTrackerNetTotal - EXPECTED_TOTALS.expenseTrackerNet),
      threshold: Math.max(150, EXPECTED_TOTALS.expenseTrackerNet * 0.02),
      pass: Math.abs(expenseTrackerNetTotal - EXPECTED_TOTALS.expenseTrackerNet) <= Math.max(150, EXPECTED_TOTALS.expenseTrackerNet * 0.02)
    },
    floridaHouse: {
      db: floridaHouseTotal,
      expected: EXPECTED_TOTALS.floridaHouse,
      variance: Math.abs(floridaHouseTotal - EXPECTED_TOTALS.floridaHouse),
      threshold: 5,
      pass: Math.abs(floridaHouseTotal - EXPECTED_TOTALS.floridaHouse) <= 5
    },
    savingsInvestment: {
      db: savingsInvestmentTotal,
      expected: EXPECTED_TOTALS.savingsInvestment,
      variance: Math.abs(savingsInvestmentTotal - EXPECTED_TOTALS.savingsInvestment),
      threshold: 0,
      pass: savingsInvestmentTotal === EXPECTED_TOTALS.savingsInvestment
    },
    grossIncome: {
      db: grossIncomeTotal,
      expected: EXPECTED_TOTALS.grossIncome,
      variance: Math.abs(grossIncomeTotal - EXPECTED_TOTALS.grossIncome),
      threshold: 1,
      pass: Math.abs(grossIncomeTotal - EXPECTED_TOTALS.grossIncome) <= 1
    }
  };

  console.log('Expense Tracker NET:');
  console.log('  Database Total: $' + expenseTrackerNetTotal.toFixed(2));
  console.log('  PDF Total: $' + EXPECTED_TOTALS.expenseTrackerNet.toFixed(2));
  console.log('  Variance: $' + level1Results.expenseTrackerNet.variance.toFixed(2));
  console.log('  Threshold: ±$' + level1Results.expenseTrackerNet.threshold.toFixed(2));
  console.log('  Status: ' + (level1Results.expenseTrackerNet.pass ? 'PASS' : 'FAIL'));

  console.log('\nFlorida House:');
  console.log('  Database Total: $' + floridaHouseTotal.toFixed(2));
  console.log('  PDF Total: $' + EXPECTED_TOTALS.floridaHouse.toFixed(2));
  console.log('  Variance: $' + level1Results.floridaHouse.variance.toFixed(2));
  console.log('  Threshold: ±$' + level1Results.floridaHouse.threshold.toFixed(2));
  console.log('  Status: ' + (level1Results.floridaHouse.pass ? 'PASS' : 'FAIL'));

  console.log('\nSavings/Investment:');
  console.log('  Database Total: $' + savingsInvestmentTotal.toFixed(2));
  console.log('  PDF Total: $' + EXPECTED_TOTALS.savingsInvestment.toFixed(2));
  console.log('  Variance: $' + level1Results.savingsInvestment.variance.toFixed(2));
  console.log('  Threshold: Exact match');
  console.log('  Status: ' + (level1Results.savingsInvestment.pass ? 'PASS' : 'FAIL'));

  console.log('\nGross Income:');
  console.log('  Database Total: $' + grossIncomeTotal.toFixed(2));
  console.log('  PDF Total: $' + EXPECTED_TOTALS.grossIncome.toFixed(2));
  console.log('  Variance: $' + level1Results.grossIncome.variance.toFixed(2));
  console.log('  Threshold: ±$' + level1Results.grossIncome.threshold.toFixed(2));
  console.log('  Status: ' + (level1Results.grossIncome.pass ? 'PASS' : 'FAIL'));

  // ===== LEVEL 5: CRITICAL TRANSACTION SPOT CHECKS =====
  console.log('\n=== LEVEL 5: CRITICAL TRANSACTION SPOT CHECKS ===');

  // 1. Rent Transaction
  const rentTx = transactions.find(t =>
    t.description === 'This Month\'s Rent' &&
    t.transaction_date === '2024-09-05'
  );
  console.log('1. Rent (Sep 5):');
  console.log('   Status: ' + (rentTx ? 'FOUND' : 'MISSING'));
  if (rentTx) {
    console.log('   Amount: ' + rentTx.amount + ' ' + rentTx.original_currency);
    console.log('   Type: ' + rentTx.transaction_type);
    console.log('   Currency correct: ' + (rentTx.original_currency === 'THB' ? 'YES' : 'NO'));
  }

  // 2. Florida House Transactions
  console.log('2. Florida House transactions:');
  console.log('   Database count: ' + floridaHouse.length);
  console.log('   Expected count: ' + EXPECTED.floridaHouse);
  console.log('   Status: ' + (floridaHouse.length === EXPECTED.floridaHouse ? 'MATCH' : 'MISMATCH'));
  if (floridaHouse.length > 0) {
    floridaHouse.slice(0, 3).forEach((t, i) => {
      console.log('   [' + (i+1) + '] ' + t.transaction_date + ' | ' + t.description.substring(0, 40) + ' | $' + t.amount);
    });
  }

  // 3. Refunds (stored as income, not negative amounts)
  const refunds = transactions.filter(t =>
    t.transaction_type === 'income' &&
    t.description &&
    t.description.toLowerCase().includes('refund')
  );
  console.log('3. Refunds:');
  console.log('   Found: ' + refunds.length);
  if (refunds.length > 0) {
    refunds.forEach((t, i) => {
      console.log('   [' + (i+1) + '] ' + t.transaction_date + ' | ' + t.description + ' | $' + t.amount);
    });
  }

  // 4. Reimbursement (September 6)
  const reimbTx = transactions.find(t =>
    t.description &&
    t.description.includes('Reimbursement') &&
    t.transaction_date === '2024-09-06'
  );
  console.log('4. Reimbursement (Sep 6):');
  console.log('   Status: ' + (reimbTx ? 'FOUND' : 'MISSING'));
  if (reimbTx) {
    console.log('   Description: ' + reimbTx.description);
    console.log('   Amount: ' + reimbTx.amount + ' ' + reimbTx.original_currency);
    console.log('   Type: ' + reimbTx.transaction_type);
    console.log('   Tags: ' + getTagNames(reimbTx).join(', '));
  }

  // 5. Comma-formatted amounts
  const largeTx1 = transactions.find(t =>
    t.description &&
    t.description.includes('Florida House') &&
    t.transaction_date === '2024-09-01' &&
    Math.abs(parseFloat(t.amount) - 1000) < 0.01
  );
  console.log('5. Large amounts ($1,000+):');
  console.log('   Looking for $1,000 Florida House (Sep 1): ' + (largeTx1 ? 'FOUND' : 'MISSING'));

  const largeTx2 = transactions.find(t =>
    t.description &&
    t.description.includes('moving costs') &&
    t.transaction_date === '2024-09-17'
  );
  console.log('   Looking for $1,259.41 moving costs (Sep 17): ' + (largeTx2 ? 'FOUND' : 'MISSING'));

  // 6. Currency exchange pair
  const exchange1 = transactions.find(t =>
    t.description &&
    t.description.includes('Exchange for Jakody') &&
    t.transaction_date === '2024-09-28'
  );
  const exchange2 = transactions.find(t =>
    t.description &&
    t.description.includes('Exchange from Jakody') &&
    t.transaction_date === '2024-09-28'
  );
  console.log('6. Exchange pair (Sep 28):');
  console.log('   Exchange for Jakody (THB 16,000): ' + (exchange1 ? 'FOUND' : 'MISSING'));
  if (exchange1) {
    console.log('      Amount: ' + exchange1.amount + ' ' + exchange1.original_currency);
  }
  console.log('   Exchange from Jakody ($520): ' + (exchange2 ? 'FOUND' : 'MISSING'));
  if (exchange2) {
    console.log('      Amount: ' + exchange2.amount + ' ' + exchange2.original_currency);
    console.log('      Type: ' + exchange2.transaction_type);
  }

  // Return comprehensive results
  return {
    transactions: transactions.map(t => ({
      ...t,
      tagNames: getTagNames(t)
    })),
    expenses,
    income,
    usd,
    thb,
    level1Results,
    level3Results,
    level4Results,
    level5: {
      rent: rentTx,
      floridaHouse,
      refunds,
      reimbursement: reimbTx,
      largeTx1,
      largeTx2,
      exchange1,
      exchange2
    },
    getTagNames
  };
}

async function main() {
  try {
    const result = await getAllData();

    // Save results for further processing
    const simplified = {
      metadata: {
        totalTransactions: result.transactions.length,
        validationDate: new Date().toISOString(),
        month: 'September 2024'
      },
      level1: result.level1Results,
      level3: result.level3Results,
      level4: result.level4Results,
      transactions: result.transactions.map(t => ({
        id: t.id,
        date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        currency: t.original_currency,
        type: t.transaction_type,
        tags: t.tagNames
      }))
    };

    fs.writeFileSync(
      '/Users/dennis/Code Projects/joot-app/scripts/september-2024-validation-data.json',
      JSON.stringify(simplified, null, 2)
    );

    console.log('\n=== VALIDATION SUMMARY ===');
    const level1Pass = Object.values(result.level1Results).every(r => r.pass);
    const level3Pass = Object.values(result.level3Results).every(r => r.match);
    const level4Pass = Object.values(result.level4Results).every(r => r.match);

    console.log('Level 1 (Section Totals): ' + (level1Pass ? 'PASS' : 'FAIL'));
    console.log('Level 3 (Transaction Counts): ' + (level3Pass ? 'PASS' : 'FAIL'));
    console.log('Level 4 (Tag Distribution): ' + (level4Pass ? 'PASS' : 'FAIL'));

    console.log('\nData saved to: scripts/september-2024-validation-data.json');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
