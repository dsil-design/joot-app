const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const USER_EMAIL = 'dennis@dsil.design';
const MONTH = '2025-04';
const EXCHANGE_RATE = 0.0294; // Derived from rent: THB 35000 = $1029

// PDF Expected Values
const PDF_TOTALS = {
  expenseTracker: 11035.98,
  grossIncome: 13094.69,
  savings: 341.67,
  floridaHouse: 1293.81
};

const EXPECTED_COUNTS = {
  total: 182,
  expenses: 155,
  income: 27,
  usd: 89,
  thb: 93,
  reimbursement: 22,
  floridaHouse: 5,
  savings: 1
};

async function getUserProfile() {
  const { data, error} = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (error) throw new Error(`Error fetching user: ${error.message}`);
  return data.id;
}

async function getAllAprilTransactions(userId) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_tags(
        tag:tags(name)
      ),
      vendor:vendors(name),
      payment_method:payment_methods(name)
    `)
    .eq('user_id', userId)
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30')
    .order('transaction_date', { ascending: true });

  if (error) throw new Error(`Error fetching transactions: ${error.message}`);

  // Transform to simpler structure with tags array
  return data.map(t => ({
    ...t,
    currency: t.original_currency,
    tags: t.transaction_tags?.map(tt => tt.tag?.name).filter(Boolean) || [],
    merchant: t.vendor?.name,
    payment_method: t.payment_method?.name
  }));
}

function convertToUSD(amount, currency) {
  if (!currency) {
    console.warn(`⚠️  Warning: Transaction with undefined currency (amount: ${amount})`);
    return amount; // Assume USD if currency is missing
  }
  if (currency === 'USD') return amount;
  if (currency === 'THB') return amount * EXCHANGE_RATE;
  throw new Error(`Unknown currency: ${currency}`);
}

function calculateExpenseTrackerTotal(transactions) {
  // Expense Tracker = expenses + income, but EXCLUDE:
  // - Florida House tagged items
  // - Savings/Investment tagged items
  // - Non-reimbursement income (income without Reimbursement tag)

  let total = 0;
  const included = [];
  const excluded = [];

  for (const t of transactions) {
    const tags = t.tags || [];
    const isFloridaHouse = tags.includes('Florida House');
    const isSavings = tags.includes('Savings/Investment');
    const isReimbursement = tags.includes('Reimbursement');
    const isIncome = t.transaction_type === 'income';

    // Skip Florida House and Savings
    if (isFloridaHouse || isSavings) {
      excluded.push({...t, reason: isFloridaHouse ? 'Florida House' : 'Savings'});
      continue;
    }

    // Skip non-reimbursement income (goes to Gross Income section)
    if (isIncome && !isReimbursement) {
      excluded.push({...t, reason: 'Non-reimbursement income'});
      continue;
    }

    // Include: all expenses + reimbursement income
    const usdAmount = convertToUSD(t.amount, t.currency);
    const signedAmount = t.transaction_type === 'expense' ? usdAmount : -usdAmount;
    total += signedAmount;
    included.push({...t, usdAmount, signedAmount});
  }

  return { total, included, excluded };
}

function calculateFloridaHouseTotal(transactions) {
  const floridaHouse = transactions.filter(t =>
    (t.tags || []).includes('Florida House')
  );

  const total = floridaHouse.reduce((sum, t) => {
    const usdAmount = convertToUSD(t.amount, t.currency);
    return sum + (t.transaction_type === 'expense' ? usdAmount : -usdAmount);
  }, 0);

  return { total, transactions: floridaHouse };
}

function calculateSavingsTotal(transactions) {
  const savings = transactions.filter(t =>
    (t.tags || []).includes('Savings/Investment')
  );

  const total = savings.reduce((sum, t) => {
    const usdAmount = convertToUSD(t.amount, t.currency);
    return sum + (t.transaction_type === 'expense' ? usdAmount : -usdAmount);
  }, 0);

  return { total, transactions: savings };
}

function calculateGrossIncomeTotal(transactions) {
  // Gross Income = income transactions WITHOUT Reimbursement tag
  const grossIncome = transactions.filter(t =>
    t.transaction_type === 'income' &&
    !(t.tags || []).includes('Reimbursement')
  );

  const total = grossIncome.reduce((sum, t) => {
    return sum + convertToUSD(t.amount, t.currency);
  }, 0);

  return { total, transactions: grossIncome };
}

function calculateDailyTotals(transactions) {
  const dailyTotals = {};

  for (const t of transactions) {
    const date = t.transaction_date;
    const tags = t.tags || [];

    // Skip if Florida House, Savings, or non-reimbursement income
    const isFloridaHouse = tags.includes('Florida House');
    const isSavings = tags.includes('Savings/Investment');
    const isReimbursement = tags.includes('Reimbursement');
    const isIncome = t.transaction_type === 'income';

    if (isFloridaHouse || isSavings || (isIncome && !isReimbursement)) {
      continue;
    }

    if (!dailyTotals[date]) {
      dailyTotals[date] = { total: 0, count: 0, transactions: [] };
    }

    const usdAmount = convertToUSD(t.amount, t.currency);
    const signedAmount = t.transaction_type === 'expense' ? usdAmount : -usdAmount;

    dailyTotals[date].total += signedAmount;
    dailyTotals[date].count++;
    dailyTotals[date].transactions.push(t);
  }

  return dailyTotals;
}

function verifyCriticalTransactions(transactions) {
  const results = [];

  // 1. Rent verification (April 5)
  const rent = transactions.find(t =>
    t.transaction_date === '2025-04-05' &&
    t.description.toLowerCase().includes('rent') &&
    t.merchant === 'Landlord'
  );

  results.push({
    name: 'Rent Transaction',
    found: !!rent,
    expected: { date: '2025-04-05', amount: 35000, currency: 'THB', merchant: 'Landlord' },
    actual: rent ? {
      date: rent.transaction_date,
      amount: rent.amount,
      currency: rent.currency,
      merchant: rent.merchant,
      description: rent.description
    } : null,
    match: rent && rent.amount === 35000 && rent.currency === 'THB'
  });

  // 2. Monthly Cleaning (April 7) - should be THB, not USD
  const cleaning = transactions.find(t =>
    t.transaction_date === '2025-04-07' &&
    t.description.toLowerCase().includes('cleaning') &&
    t.merchant === 'BLISS'
  );

  results.push({
    name: 'Monthly Cleaning (Currency Correction)',
    found: !!cleaning,
    expected: { date: '2025-04-07', amount: 2782, currency: 'THB', merchant: 'BLISS' },
    actual: cleaning ? {
      date: cleaning.transaction_date,
      amount: cleaning.amount,
      currency: cleaning.currency,
      merchant: cleaning.merchant,
      description: cleaning.description
    } : null,
    match: cleaning && cleaning.amount === 2782 && cleaning.currency === 'THB'
  });

  // 3. Madame Koh (April 22) - should be positive expense, not negative
  const madameKoh = transactions.find(t =>
    t.transaction_date === '2025-04-22' &&
    t.description.toLowerCase().includes('madame koh')
  );

  results.push({
    name: 'Madame Koh (Sign Correction)',
    found: !!madameKoh,
    expected: { date: '2025-04-22', amount: 1030, currency: 'THB', type: 'expense', sign: 'positive' },
    actual: madameKoh ? {
      date: madameKoh.transaction_date,
      amount: madameKoh.amount,
      currency: madameKoh.currency,
      type: madameKoh.transaction_type,
      sign: madameKoh.amount > 0 ? 'positive' : 'negative',
      description: madameKoh.description
    } : null,
    match: madameKoh && madameKoh.amount === 1030 && madameKoh.currency === 'THB' && madameKoh.transaction_type === 'expense'
  });

  // 4. Business Insurance Refund (April 18) - should be income
  const insurance = transactions.find(t =>
    t.transaction_date === '2025-04-18' &&
    t.description.toLowerCase().includes('business insurance')
  );

  results.push({
    name: 'Business Insurance Refund',
    found: !!insurance,
    expected: { date: '2025-04-18', amount: 30.76, currency: 'USD', type: 'income', merchant: 'The Hartford' },
    actual: insurance ? {
      date: insurance.transaction_date,
      amount: insurance.amount,
      currency: insurance.currency,
      type: insurance.transaction_type,
      merchant: insurance.merchant,
      description: insurance.description
    } : null,
    match: insurance && insurance.amount === 30.76 && insurance.currency === 'USD' && insurance.transaction_type === 'income'
  });

  return results;
}

function analyzeTransactionCounts(transactions) {
  const counts = {
    total: transactions.length,
    byType: {},
    byCurrency: {},
    byTag: {}
  };

  // Count by type
  transactions.forEach(t => {
    counts.byType[t.transaction_type] = (counts.byType[t.transaction_type] || 0) + 1;
  });

  // Count by currency
  transactions.forEach(t => {
    counts.byCurrency[t.currency] = (counts.byCurrency[t.currency] || 0) + 1;
  });

  // Count by tag
  transactions.forEach(t => {
    const tags = t.tags || [];
    tags.forEach(tag => {
      counts.byTag[tag] = (counts.byTag[tag] || 0) + 1;
    });
  });

  return counts;
}

async function main() {
  console.log('='.repeat(80));
  console.log('APRIL 2025 COMPREHENSIVE VALIDATION');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get user ID
    const userId = await getUserProfile();
    console.log(`User ID: ${userId}`);
    console.log('');

    // Fetch all April transactions
    const transactions = await getAllAprilTransactions(userId);
    console.log(`Total transactions found: ${transactions.length}`);
    console.log('');

    // LEVEL 1: Section Grand Totals
    console.log('='.repeat(80));
    console.log('LEVEL 1: SECTION GRAND TOTALS');
    console.log('='.repeat(80));
    console.log('');

    const expenseTracker = calculateExpenseTrackerTotal(transactions);
    const floridaHouse = calculateFloridaHouseTotal(transactions);
    const savings = calculateSavingsTotal(transactions);
    const grossIncome = calculateGrossIncomeTotal(transactions);

    console.log('Expense Tracker:');
    console.log(`  DB Total:  $${expenseTracker.total.toFixed(2)}`);
    console.log(`  PDF Total: $${PDF_TOTALS.expenseTracker.toFixed(2)}`);
    console.log(`  Variance:  $${(expenseTracker.total - PDF_TOTALS.expenseTracker).toFixed(2)} (${((expenseTracker.total - PDF_TOTALS.expenseTracker) / PDF_TOTALS.expenseTracker * 100).toFixed(2)}%)`);
    console.log(`  Status:    ${Math.abs(expenseTracker.total - PDF_TOTALS.expenseTracker) <= 150 || Math.abs((expenseTracker.total - PDF_TOTALS.expenseTracker) / PDF_TOTALS.expenseTracker) <= 0.02 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    console.log('Florida House:');
    console.log(`  DB Total:  $${floridaHouse.total.toFixed(2)}`);
    console.log(`  PDF Total: $${PDF_TOTALS.floridaHouse.toFixed(2)}`);
    console.log(`  Variance:  $${(floridaHouse.total - PDF_TOTALS.floridaHouse).toFixed(2)}`);
    console.log(`  Status:    ${Math.abs(floridaHouse.total - PDF_TOTALS.floridaHouse) <= 5 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    console.log('Savings/Investment:');
    console.log(`  DB Total:  $${savings.total.toFixed(2)}`);
    console.log(`  PDF Total: $${PDF_TOTALS.savings.toFixed(2)}`);
    console.log(`  Variance:  $${(savings.total - PDF_TOTALS.savings).toFixed(2)}`);
    console.log(`  Status:    ${savings.total === PDF_TOTALS.savings ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    console.log('Gross Income:');
    console.log(`  DB Total:  $${grossIncome.total.toFixed(2)}`);
    console.log(`  PDF Total: $${PDF_TOTALS.grossIncome.toFixed(2)}`);
    console.log(`  Variance:  $${(grossIncome.total - PDF_TOTALS.grossIncome).toFixed(2)}`);
    console.log(`  Status:    ${grossIncome.total === PDF_TOTALS.grossIncome ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    // LEVEL 2: Daily Subtotals
    console.log('='.repeat(80));
    console.log('LEVEL 2: DAILY SUBTOTALS');
    console.log('='.repeat(80));
    console.log('');

    const dailyTotals = calculateDailyTotals(transactions);
    console.log(`Days with transactions: ${Object.keys(dailyTotals).length}`);
    console.log('');

    // LEVEL 3: Transaction Counts
    console.log('='.repeat(80));
    console.log('LEVEL 3: TRANSACTION COUNT VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    const counts = analyzeTransactionCounts(transactions);
    console.log('Total Transactions:');
    console.log(`  DB:       ${counts.total}`);
    console.log(`  Expected: ${EXPECTED_COUNTS.total}`);
    console.log(`  Status:   ${counts.total === EXPECTED_COUNTS.total ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    console.log('By Type:');
    console.log(`  Expenses: ${counts.byType.expense || 0} (expected: ${EXPECTED_COUNTS.expenses})`);
    console.log(`  Income:   ${counts.byType.income || 0} (expected: ${EXPECTED_COUNTS.income})`);
    console.log('');

    console.log('By Currency:');
    console.log(`  USD: ${counts.byCurrency.USD || 0} (expected: ${EXPECTED_COUNTS.usd})`);
    console.log(`  THB: ${counts.byCurrency.THB || 0} (expected: ${EXPECTED_COUNTS.thb})`);
    console.log('');

    // LEVEL 4: Tag Distribution
    console.log('='.repeat(80));
    console.log('LEVEL 4: TAG DISTRIBUTION VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    console.log('Tag Counts:');
    console.log(`  Reimbursement:      ${counts.byTag['Reimbursement'] || 0} (expected: ${EXPECTED_COUNTS.reimbursement})`);
    console.log(`  Florida House:      ${counts.byTag['Florida House'] || 0} (expected: ${EXPECTED_COUNTS.floridaHouse})`);
    console.log(`  Savings/Investment: ${counts.byTag['Savings/Investment'] || 0} (expected: ${EXPECTED_COUNTS.savings})`);
    console.log('');

    // LEVEL 5: Critical Transactions
    console.log('='.repeat(80));
    console.log('LEVEL 5: CRITICAL TRANSACTION VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    const criticalResults = verifyCriticalTransactions(transactions);
    criticalResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.name}:`);
      console.log(`   Found:    ${result.found ? 'Yes' : 'No'}`);
      if (result.found) {
        console.log(`   Expected: ${JSON.stringify(result.expected)}`);
        console.log(`   Actual:   ${JSON.stringify(result.actual)}`);
        console.log(`   Status:   ${result.match ? '✅ PASS' : '❌ FAIL'}`);
      }
      console.log('');
    });

    // Output detailed data for Level 6 manual verification
    console.log('='.repeat(80));
    console.log('TRANSACTION EXPORT FOR LEVEL 6 VERIFICATION');
    console.log('='.repeat(80));
    console.log('');
    console.log('Writing detailed transaction data to JSON...');

    const fs = require('fs');
    fs.writeFileSync(
      '/Users/dennis/Code Projects/joot-app/scripts/april-2025-db-transactions.json',
      JSON.stringify({
        summary: {
          total: transactions.length,
          expenseTracker,
          floridaHouse,
          savings,
          grossIncome,
          counts,
          dailyTotals
        },
        transactions: transactions.map(t => ({
          ...t,
          usd_equivalent: convertToUSD(t.amount, t.currency)
        }))
      }, null, 2)
    );

    console.log('✅ Data exported successfully');
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
