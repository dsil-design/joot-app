const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('supabaseUrl and supabaseKey are required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// OCTOBER 2022: EXPENSE TRACKER (63 transactions)
const pdfExpenseTransactions = [
  { date: '2022-10-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
  { date: '2022-10-01', desc: 'This Month\'s Rent, Storage, Internet, PECO (Conshy)', merchant: 'Jordan', amount: 887.00, currency: 'USD' },
  { date: '2022-10-01', desc: 'Additional Greens Fee Cost', merchant: 'Marina Bay', amount: 32.94, currency: 'USD' },
  { date: '2022-10-01', desc: 'Transfer Fee', merchant: 'Wise', amount: 5.64, currency: 'USD' },
  { date: '2022-10-01', desc: 'Lunch', merchant: 'canopy Cafe', amount: 12.68, currency: 'USD' },
  { date: '2022-10-01', desc: 'Hotel: Singapore', merchant: 'Agoda', amount: 361.34, currency: 'USD' },
  { date: '2022-10-01', desc: 'taxi to hotel', merchant: 'GoJek', amount: 15.60, currency: 'USD' },
  { date: '2022-10-01', desc: 'Dinner', merchant: 'CALI, Citadines', amount: 37.78, currency: 'USD' },
  { date: '2022-10-01', desc: 'Taxi: Bar to Checkpoint', merchant: 'GoJek', amount: 33.60, currency: 'USD' },
  { date: '2022-10-01', desc: 'Taxi to Hotel (JB)', merchant: 'Grab', amount: 1.08, currency: 'USD' },
  { date: '2022-10-01', desc: 'Taxi to Warren', merchant: 'Grab', amount: 10.28, currency: 'USD' },
  { date: '2022-10-02', desc: 'Hotel: Johor Bahru', merchant: 'Holiday Inn Express', amount: 220.08, currency: 'USD' },
  { date: '2022-10-02', desc: 'Taxi: Hotel to Exchange to Checkpoint', merchant: 'Grab', amount: 5.19, currency: 'USD' },
  { date: '2022-10-02', desc: 'Taxi: Checkpoint to Hotel', merchant: 'Grab', amount: 13.15, currency: 'USD' },
  { date: '2022-10-02', desc: 'Drinks', merchant: 'Formula 1', amount: 20.99, currency: 'USD' },
  { date: '2022-10-02', desc: 'Dinner', merchant: 'Sands', amount: 24.00, currency: 'USD' },
  { date: '2022-10-03', desc: 'Hotel', merchant: 'Duangtawan', amount: 37.46, currency: 'USD' },
  { date: '2022-10-04', desc: 'Hotel', merchant: 'Duangtawan', amount: 37.46, currency: 'USD' },
  { date: '2022-10-04', desc: 'Clothes', merchant: 'Lotus\'', amount: 14.46, currency: 'USD' },
  { date: '2022-10-05', desc: 'Grab to golf', merchant: 'Unknown', amount: 2.31, currency: 'USD' },
  { date: '2022-10-05', desc: 'Taxi to Hotel', merchant: 'Grab', amount: 2.43, currency: 'USD' },
  { date: '2022-10-06', desc: 'Hotel', merchant: 'Duangtawan', amount: 77.10, currency: 'USD' },
  { date: '2022-10-06', desc: 'Taxi to Hotel', merchant: 'Grab', amount: 3.66, currency: 'USD' },
  { date: '2022-10-06', desc: 'Flight: CNX - BKK', merchant: 'AirAsia', amount: 84.21, currency: 'USD' },
  { date: '2022-10-06', desc: 'Flight: BKK - CNX', merchant: 'AirAsia', amount: 88.44, currency: 'USD' },
  { date: '2022-10-06', desc: 'Hotel: BKK', merchant: 'Ibis Styles', amount: 118.38, currency: 'USD' },
  { date: '2022-10-06', desc: 'Taxi to Bar', merchant: 'Grab', amount: 2.02, currency: 'USD' },
  { date: '2022-10-06', desc: 'Taxi to Lollipop', merchant: 'Grab', amount: 2.05, currency: 'USD' },
  { date: '2022-10-07', desc: 'Taxi to airport', merchant: 'Grab', amount: 8.14, currency: 'USD' },
  { date: '2022-10-07', desc: 'Taxi to Hotel', merchant: 'Grab', amount: 15.80, currency: 'USD' },
  { date: '2022-10-07', desc: 'Topgolf', merchant: 'TopGolf', amount: 95.62, currency: 'USD' },
  { date: '2022-10-08', desc: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD' },
  { date: '2022-10-08', desc: 'LIV Golf Merchandise', merchant: 'LIV', amount: 85.76, currency: 'USD' },
  { date: '2022-10-08', desc: 'Drinks', merchant: 'Nana', amount: 83.21, currency: 'USD' },
  { date: '2022-10-09', desc: 'New Flight: BKK to CNX', merchant: 'AirAsia', amount: 85.32, currency: 'USD' },
  { date: '2022-10-09', desc: 'Taxi to Condo', merchant: 'Grab', amount: 7.72, currency: 'USD' },
  { date: '2022-10-09', desc: 'CNX Internet Bill', merchant: '3BB', amount: 20.07, currency: 'USD' },
  { date: '2022-10-10', desc: 'Taxi to Cafe', merchant: 'Grab', amount: 3.62, currency: 'USD' },
  { date: '2022-10-10', desc: 'Gecko Spray, Lightning Cables', merchant: 'Lazada', amount: 44.59, currency: 'USD' },
  { date: '2022-10-10', desc: 'Taxi to Condo', merchant: 'Grab', amount: 2.73, currency: 'USD' },
  { date: '2022-10-11', desc: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD' },
  { date: '2022-10-12', desc: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD' },
  { date: '2022-10-12', desc: 'Taxi to Bike Shop', merchant: 'Grab', amount: 1.92, currency: 'USD' },
  { date: '2022-10-13', desc: 'Fee', merchant: 'Wise', amount: 4.53, currency: 'USD' },
  { date: '2022-10-13', desc: 'Phone', merchant: 'AIS', amount: 11.28, currency: 'USD' },
  { date: '2022-10-13', desc: 'Golf Balls, Micro USB cable', merchant: 'Lazada', amount: 75.40, currency: 'USD' },
  { date: '2022-10-14', desc: 'Drinks', merchant: 'Small World', amount: 94.46, currency: 'USD' },
  { date: '2022-10-19', desc: 'Car Insurance', merchant: 'Travelers', amount: 183.00, currency: 'USD' },
  { date: '2022-10-19', desc: 'Brunch: Gravity Cafe', merchant: 'Grab', amount: 6.72, currency: 'USD' },
  { date: '2022-10-19', desc: 'Passport Renewal', merchant: 'pay.gov', amount: 130.00, currency: 'USD' },
  { date: '2022-10-22', desc: 'Drinks', merchant: 'Small world', amount: 155.87, currency: 'USD' },
  { date: '2022-10-22', desc: 'Monthly Subscription: Tinder', merchant: 'Apple', amount: 26.49, currency: 'USD' },
  { date: '2022-10-24', desc: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD' },
  { date: '2022-10-24', desc: 'Monthly Subscription: WSJ', merchant: 'WSJ', amount: 8.00, currency: 'USD' },
  { date: '2022-10-24', desc: 'Car Insurance', merchant: 'Travelers', amount: 183.00, currency: 'USD' },
  { date: '2022-10-25', desc: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD' },
  { date: '2022-10-27', desc: 'Aftershave, cleaning supplies', merchant: 'Lazada', amount: 48.54, currency: 'USD' },
  { date: '2022-10-29', desc: 'Cell Phone', merchant: 'T-Mobile', amount: 71.04, currency: 'USD' },
  { date: '2022-10-29', desc: 'Shaving Soap', merchant: 'Lazada', amount: 12.41, currency: 'USD' },
  { date: '2022-10-31', desc: 'Hotel: BKK', merchant: 'hotels.com', amount: 128.19, currency: 'USD' },
  { date: '2022-10-31', desc: 'Flight: CNX - BKK', merchant: 'AirAsia', amount: 63.69, currency: 'USD' },
  { date: '2022-10-31', desc: 'Flight: BKK - CNX', merchant: 'AirAsia', amount: 55.26, currency: 'USD' }
];

// OCTOBER 2022: GROSS INCOME (2 transactions)
const pdfIncomeTransactions = [
  { date: '2022-10-14', desc: 'Paycheck', merchant: 'e2open', amount: 2972.43, currency: 'USD', type: 'income' },
  { date: '2022-10-31', desc: 'Paycheck', merchant: 'e2open', amount: 2972.43, currency: 'USD', type: 'income' }
];

// OCTOBER 2022: PERSONAL SAVINGS & INVESTMENTS (1 transaction)
const pdfSavingsTransactions = [
  { date: '2022-10-31', desc: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD' }
];

console.log(`Total PDF transactions extracted: ${pdfExpenseTransactions.length + pdfIncomeTransactions.length + pdfSavingsTransactions.length}`);
console.log(`  Expense Tracker: ${pdfExpenseTransactions.length}`);
console.log(`  Gross Income: ${pdfIncomeTransactions.length}`);
console.log(`  Personal Savings: ${pdfSavingsTransactions.length}`);

async function verifyOctober2022() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('\nOCTOBER 2022: PDF → DATABASE VERIFICATION');
  console.log('======================================================================');
  console.log('Protocol: v2.0 - Transaction-level matching (PDF as source)\n');

  // Combine all PDF transactions
  const allPdfTransactions = [
    ...pdfExpenseTransactions.map(t => ({ ...t, type: 'expense' })),
    ...pdfIncomeTransactions,
    ...pdfSavingsTransactions.map(t => ({ ...t, type: 'expense', tag: 'Savings/Investment' }))
  ];

  console.log(`PDF Source: ${allPdfTransactions.length} transactions\n`);

  // Get all database transactions for October 2022
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-10-01')
    .lte('transaction_date', '2022-10-31')
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

verifyOctober2022()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
