const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('supabaseUrl and supabaseKey are required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SEPTEMBER 2022: EXPENSE TRACKER (52 transactions)
const pdfExpenseTransactions = [
  { date: '2022-09-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
  { date: '2022-09-01', desc: 'This Month\'s Rent, Storage, Internet, PECO (Conshy)', merchant: 'Jordan', amount: 887.00, currency: 'USD' },
  { date: '2022-09-01', desc: 'Additinal rent to Jordan', merchant: 'Jordan', amount: 60.00, currency: 'USD' },
  { date: '2022-09-02', desc: 'Lunch: Going Up Cafe', merchant: 'Foodpanda', amount: 4.97, currency: 'USD' },
  { date: '2022-09-03', desc: 'Dinner: The Duke\'s', merchant: 'Foodpanda', amount: 13.11, currency: 'USD' },
  { date: '2022-09-04', desc: 'Annual Subscription: Gymaholic', merchant: 'Apple', amount: 33.91, currency: 'USD' },
  { date: '2022-09-04', desc: 'Lunch: Subway', merchant: 'Foodpanda', amount: 10.44, currency: 'USD' },
  { date: '2022-09-04', desc: 'Dinner: Urban Pizza', merchant: 'Foodpanda', amount: 11.38, currency: 'USD' },
  { date: '2022-09-05', desc: 'Earplugs, Spoon holder', merchant: 'Lazada', amount: 13.24, currency: 'USD' },
  { date: '2022-09-05', desc: 'Breakfast: Going up Cafe', merchant: 'Foodpanda', amount: 4.96, currency: 'USD' },
  { date: '2022-09-06', desc: 'Lunch: Bella Goose', merchant: 'Foodpanda', amount: 6.00, currency: 'USD' },
  { date: '2022-09-07', desc: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 11.42, currency: 'USD' },
  { date: '2022-09-07', desc: 'Snack: El Diablo\'s', merchant: 'Foodpanda', amount: 9.32, currency: 'USD' },
  { date: '2022-09-08', desc: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD' },
  { date: '2022-09-08', desc: 'Breakfast: Going up Cafe', merchant: 'Foodpanda', amount: 0.98, currency: 'USD' },
  { date: '2022-09-08', desc: 'Egg pan, bedding set, pot', merchant: 'Baan Beyond', amount: 46.04, currency: 'USD' },
  { date: '2022-09-08', desc: 'Annual Subscription: Gymaholic', merchant: 'Apple', amount: 33.91, currency: 'USD' },
  { date: '2022-09-08', desc: 'Soundproofing foam, golf balls', merchant: 'Lazada', amount: 48.74, currency: 'USD' },
  { date: '2022-09-09', desc: 'Power adapters', merchant: 'Lazada', amount: 23.89, currency: 'USD' },
  { date: '2022-09-09', desc: 'Flights: CNX to Singapore', merchant: 'Airpaz', amount: 344.51, currency: 'USD' },
  { date: '2022-09-09', desc: 'Flights: Singapore to CNX', merchant: 'Airpaz', amount: 238.13, currency: 'USD' },
  { date: '2022-09-11', desc: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD' },
  { date: '2022-09-11', desc: 'Lunch: Bella Goose', merchant: 'Foodpanda', amount: 9.66, currency: 'USD' },
  { date: '2022-09-11', desc: 'Comcast Bill', merchant: 'Jordan', amount: 73.04, currency: 'USD' },
  { date: '2022-09-12', desc: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD' },
  { date: '2022-09-12', desc: 'Cell phone', merchant: 'AIS', amount: 11.78, currency: 'USD' },
  { date: '2022-09-12', desc: 'Groceries', merchant: 'Foodpanda', amount: 19.25, currency: 'USD' },
  { date: '2022-09-12', desc: 'Dinner: Grill of Punjab', merchant: 'Foodpanda', amount: 10.35, currency: 'USD' },
  { date: '2022-09-13', desc: 'Cell Phone', merchant: 'CNX', amount: 11.78, currency: 'USD' },
  { date: '2022-09-13', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 9.00, currency: 'USD' },
  { date: '2022-09-13', desc: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 6.59, currency: 'USD' },
  { date: '2022-09-14', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 9.02, currency: 'USD' },
  { date: '2022-09-14', desc: 'Dinner: Padthai Krapow by Eat Mai', merchant: 'Foodpanda', amount: 6.20, currency: 'USD' },
  { date: '2022-09-15', desc: 'Lunch: Going Up Cafe', merchant: 'Foodpanda', amount: 4.97, currency: 'USD' },
  { date: '2022-09-15', desc: 'Dinner: Samurai Kitchen', merchant: 'Foodpanda', amount: 6.34, currency: 'USD' },
  { date: '2022-09-15', desc: 'Snack: Burger King', merchant: 'Foodpanda', amount: 10.78, currency: 'USD' },
  { date: '2022-09-17', desc: 'Golf Reservation (SG)', merchant: 'Marina Bay', amount: 377.08, currency: 'USD' },
  { date: '2022-09-18', desc: 'Hospital visit', merchant: 'McCormick Hospital', amount: 66.51, currency: 'USD' },
  { date: '2022-09-23', desc: 'Tinder Gold', merchant: 'Apple', amount: 13.24, currency: 'USD' },
  { date: '2022-09-24', desc: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD' },
  { date: '2022-09-24', desc: 'Monthly Subscription: WSJ', merchant: 'WSJ', amount: 8.00, currency: 'USD' },
  { date: '2022-09-25', desc: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD' },
  { date: '2022-09-28', desc: 'Snscks on Plane', merchant: 'Scoot', amount: 9.78, currency: 'USD' },
  { date: '2022-09-28', desc: 'Cigs', merchant: '7-Eleven', amount: 7.57, currency: 'USD' },
  { date: '2022-09-29', desc: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD' },
  { date: '2022-09-29', desc: 'Greens Fee', merchant: 'Horizon Hills', amount: 49.90, currency: 'USD' },
  { date: '2022-09-29', desc: 'Dinner', merchant: 'Magregors', amount: 15.05, currency: 'USD' },
  { date: '2022-09-29', desc: 'Drinks', merchant: 'Pixie Entertainment', amount: 57.68, currency: 'USD' },
  { date: '2022-09-29', desc: 'Drinks', merchant: 'Pixie Entertainment', amount: 57.68, currency: 'USD' },
  { date: '2022-09-29', desc: 'Beers', merchant: 'Holiday Inn Express', amount: 9.86, currency: 'USD' },
  { date: '2022-09-30', desc: 'Drinks', merchant: 'Warren', amount: 12.33, currency: 'USD' }
];

// SEPTEMBER 2022: GROSS INCOME (2 transactions)
const pdfIncomeTransactions = [
  { date: '2022-09-15', desc: 'Paycheck', merchant: 'e2open', amount: 2978.94, currency: 'USD', type: 'income' },
  { date: '2022-09-30', desc: 'Paycheck', merchant: 'e2open', amount: 2972.43, currency: 'USD', type: 'income' }
];

// SEPTEMBER 2022: PERSONAL SAVINGS & INVESTMENTS (1 transaction)
const pdfSavingsTransactions = [
  { date: '2022-09-30', desc: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD' }
];

console.log(`Total PDF transactions extracted: ${pdfExpenseTransactions.length + pdfIncomeTransactions.length + pdfSavingsTransactions.length}`);
console.log(`  Expense Tracker: ${pdfExpenseTransactions.length}`);
console.log(`  Gross Income: ${pdfIncomeTransactions.length}`);
console.log(`  Personal Savings: ${pdfSavingsTransactions.length}`);

async function verifySeptember2022() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('\nSEPTEMBER 2022: PDF → DATABASE VERIFICATION');
  console.log('======================================================================');
  console.log('Protocol: v2.0 - Transaction-level matching (PDF as source)\n');

  // Combine all PDF transactions
  const allPdfTransactions = [
    ...pdfExpenseTransactions.map(t => ({ ...t, type: 'expense' })),
    ...pdfIncomeTransactions,
    ...pdfSavingsTransactions.map(t => ({ ...t, type: 'expense', tag: 'Savings/Investment' }))
  ];

  console.log(`PDF Source: ${allPdfTransactions.length} transactions\n`);

  // Get all database transactions for September 2022
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-09-01')
    .lte('transaction_date', '2022-09-30')
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`Database: ${dbTransactions.length} transactions\n`);

  if (allPdfTransactions.length !== dbTransactions.length) {
    console.log(`⚠️  COUNT MISMATCH: PDF has ${allPdfTransactions.length}, DB has ${dbTransactions.length}\n`);
  }

  // Match each PDF transaction to a database transaction
  let matchedCount = 0;
  let unmatchedPdf = [];
  const matchedDBIds = new Set();

  allPdfTransactions.forEach((pdfTxn, idx) => {
    // Find matching DB transaction
    const match = dbTransactions.find(dbTxn => {
      // Already matched
      if (matchedDBIds.has(dbTxn.id)) return false;

      // Date must match
      if (dbTxn.transaction_date !== pdfTxn.date) return false;

      // Amount must match (within 0.01 for floating point)
      if (Math.abs(dbTxn.amount - Math.abs(pdfTxn.amount)) > 0.01) return false;

      // Currency must match
      if (dbTxn.original_currency !== pdfTxn.currency) return false;

      // Transaction type (expense vs income) - handle negative amounts
      const expectedType = pdfTxn.type || (pdfTxn.amount < 0 ? 'income' : 'expense');
      if (dbTxn.transaction_type !== expectedType) return false;

      return true;
    });

    if (match) {
      matchedCount++;
      matchedDBIds.add(match.id);
    } else {
      unmatchedPdf.push({
        index: idx + 1,
        date: pdfTxn.date,
        description: pdfTxn.desc,
        merchant: pdfTxn.merchant,
        amount: pdfTxn.amount,
        currency: pdfTxn.currency
      });
    }
  });

  // Find unmatched DB transactions
  const unmatchedDB = dbTransactions.filter(dbTxn => !matchedDBIds.has(dbTxn.id));

  console.log('MATCHING RESULTS:');
  console.log('----------------------------------------------------------------------');
  console.log(`Matched: ${matchedCount}/${allPdfTransactions.length} (${(matchedCount / allPdfTransactions.length * 100).toFixed(1)}%)`);
  console.log(`Unmatched PDF transactions: ${unmatchedPdf.length}`);
  console.log(`Unmatched DB transactions: ${unmatchedDB.length}`);

  if (unmatchedPdf.length > 0) {
    console.log('\n⚠️  UNMATCHED PDF TRANSACTIONS:');
    console.log('----------------------------------------------------------------------');
    unmatchedPdf.forEach(tx => {
      console.log(`#${tx.index}: ${tx.date} | ${tx.merchant} | ${tx.amount} ${tx.currency} | ${tx.description}`);
    });
  }

  if (unmatchedDB.length > 0) {
    console.log('\n⚠️  UNMATCHED DATABASE TRANSACTIONS:');
    console.log('----------------------------------------------------------------------');
    unmatchedDB.forEach(tx => {
      console.log(`${tx.transaction_date} | ${tx.vendors?.name || 'N/A'} | ${tx.amount} ${tx.original_currency} | ${tx.description}`);
    });
  }

  console.log('\n======================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('======================================================================\n');

  if (matchedCount === allPdfTransactions.length && unmatchedDB.length === 0) {
    console.log('✅ PERFECT 1:1 MATCH (PDF → DATABASE)');
    console.log(`All ${allPdfTransactions.length} PDF transactions found in database`);
    console.log('No extra transactions in database');
  } else {
    console.log('❌ VERIFICATION FAILED');
    console.log(`Expected: ${allPdfTransactions.length} transactions`);
    console.log(`Matched: ${matchedCount} transactions`);
    console.log(`Unmatched PDF: ${unmatchedPdf.length}`);
    console.log(`Unmatched DB: ${unmatchedDB.length}`);
  }

  console.log('\nSTATUS:', matchedCount === allPdfTransactions.length && unmatchedDB.length === 0 ? '✅ VERIFIED' : '❌ FAILED');
  console.log('\nNOTE: PDF aggregate totals (GRAND TOTAL) were NOT verified.');
  console.log('      Transaction-level matching is the verification standard.');
}

verifySeptember2022()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
