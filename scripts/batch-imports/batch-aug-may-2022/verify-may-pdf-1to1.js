require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PDF source: Budget for Import-page42.pdf
// Extracted manually from May 2022 section
// Using ONLY "Actual Spent" column with currency determined by payment method
const pdfTransactions = [
  // Sunday, May 1, 2022
  { date: '2022-05-01', description: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2022-05-01', description: "This Month's Rent, Storage, Internet, PECO (Conshy)", merchant: 'Jordan', amount: 887.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-01', description: 'Greens Fee, Driving Range', merchant: 'North Hill', amount: 1230.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-01', description: 'Drinks', merchant: 'North Hill', amount: 545.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-01', description: 'Taxi for Aom', merchant: 'Grab', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-01', description: 'Groceries', merchant: 'Market', amount: 40.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-01', description: 'Groceries', merchant: 'BigC', amount: 139.75, currency: 'THB', type: 'expense' },
  { date: '2022-05-01', description: 'Groceries', merchant: 'Foodpanda', amount: 4.58, currency: 'USD', type: 'expense' },

  // Monday, May 2, 2022
  { date: '2022-05-02', description: 'Keys', merchant: 'Street shop', amount: 540.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Coffee Beans', merchant: 'Hillkoff', amount: 780.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Haircut', merchant: 'The Cutler', amount: 500.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Electric bill', merchant: 'Galae Thong', amount: 723.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Taxi to Airport', merchant: 'Grab', amount: 299.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Snack w Aom', merchant: 'CNX Airport', amount: 205.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Taxi to Hotel', merchant: 'Grab', amount: 626.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Bellboy', merchant: 'Holiday Inn Express', amount: 40.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Cell phone Bill', merchant: 'AIS', amount: 21.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-02', description: 'Cell phone top up', merchant: 'AIS', amount: 80.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Dinner', merchant: 'Pizzeria Limoncello', amount: 1100.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-02', description: 'Refund from Foodpanda', merchant: 'Foodpanda', amount: 2.54, currency: 'USD', type: 'income' },

  // Tuesday, May 3, 2022
  { date: '2022-05-03', description: 'Taxi to Airport', merchant: 'Grab', amount: 701.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-03', description: 'COVID test', merchant: 'Samitivej', amount: 550.00, currency: 'THB', type: 'expense' },

  // Wednesday, May 4, 2022
  { date: '2022-05-04', description: 'Breakfast', merchant: 'Jersey Reserve Coffee Labs', amount: 9.81, currency: 'USD', type: 'expense' },
  { date: '2022-05-04', description: 'Taxi to Apartment', merchant: 'Lyft', amount: 47.96, currency: 'USD', type: 'expense' },
  { date: '2022-05-04', description: 'Apple Watch Series 7', merchant: 'Best Buy', amount: 380.54, currency: 'USD', type: 'expense' },
  { date: '2022-05-04', description: 'Golf Balls', merchant: 'PGA Superstore', amount: 24.37, currency: 'USD', type: 'expense' },
  { date: '2022-05-04', description: 'Groceries', merchant: 'Giant', amount: 118.23, currency: 'USD', type: 'expense' },

  // Thursday, May 5, 2022 - No transactions

  // Friday, May 6, 2022
  { date: '2022-05-06', description: 'Gift for Josh & Mallory : Airbnb card', merchant: 'Target', amount: 100.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-06', description: 'Snacks & Photos', merchant: 'Walgreens', amount: 10.07, currency: 'USD', type: 'expense' },
  { date: '2022-05-06', description: 'Lunch', merchant: 'Chick Fil A', amount: 9.52, currency: 'USD', type: 'expense' },
  { date: '2022-05-06', description: 'Cigs', merchant: 'Exxon', amount: 11.36, currency: 'USD', type: 'expense' },
  { date: '2022-05-06', description: 'Iced Tea', merchant: 'Hilton Garden Inn', amount: 3.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-06', description: 'Tip for bartenders', merchant: 'Cash', amount: 20.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-06', description: 'Drinks', merchant: 'Hilton Garden Inn', amount: 35.52, currency: 'USD', type: 'expense' },

  // Saturday, May 7, 2022
  { date: '2022-05-07', description: 'Rent for CNX', merchant: 'Panya (Landlord)', amount: 19000.00, currency: 'THB', type: 'expense' },
  { date: '2022-05-07', description: 'Transfer fees', merchant: 'Wise', amount: 4.34, currency: 'USD', type: 'expense' },
  { date: '2022-05-07', description: 'Hotel: Maryland', merchant: 'Hilton', amount: 102.80, currency: 'USD', type: 'expense' },
  { date: '2022-05-07', description: 'Gas', merchant: 'Sunoco', amount: 62.95, currency: 'USD', type: 'expense' },
  { date: '2022-05-07', description: 'Flowers', merchant: 'Giant', amount: 13.77, currency: 'USD', type: 'expense' },

  // Sunday, May 8, 2022
  { date: '2022-05-08', description: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD', type: 'expense' },
  { date: '2022-05-08', description: 'Breakfast', merchant: 'Wawa', amount: 8.97, currency: 'USD', type: 'expense' },
  { date: '2022-05-08', description: 'Greens Fee: Gilbertsville', merchant: 'Craig', amount: 55.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-08', description: 'Lunch w/ Mom & Austin', merchant: "Rocco's", amount: 43.41, currency: 'USD', type: 'expense' },
  { date: '2022-05-08', description: 'Cannabis', merchant: 'Apothecarium X', amount: 138.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-08', description: 'Money for stuff', merchant: 'Omi', amount: 90.00, currency: 'USD', type: 'income' },

  // Monday, May 9, 2022
  { date: '2022-05-09', description: 'Groceries', merchant: 'Giant', amount: 134.08, currency: 'USD', type: 'expense' },

  // Tuesday, May 10, 2022
  { date: '2022-05-10', description: 'EZPass Refill', merchant: 'EZPass', amount: 35.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-10', description: 'Aeropress filters', merchant: 'Amazon', amount: 15.85, currency: 'USD', type: 'expense' },

  // Wednesday, May 11, 2022
  { date: '2022-05-11', description: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD', type: 'expense' },
  { date: '2022-05-11', description: 'Driving Range Account', merchant: "Tee's", amount: 100.00, currency: 'USD', type: 'expense' },

  // Thursday, May 12, 2022
  { date: '2022-05-12', description: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD', type: 'expense' },
  { date: '2022-05-12', description: 'Cannabis', merchant: 'Apothecarium', amount: 135.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-12', description: 'Food for Cabin', merchant: 'Acme', amount: 15.97, currency: 'USD', type: 'expense' },
  { date: '2022-05-12', description: 'Dinner', merchant: "Dalessandro's", amount: 53.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-12', description: 'Beer', merchant: 'Docs World of Beer', amount: 25.38, currency: 'USD', type: 'expense' },
  { date: '2022-05-12', description: 'Beer', merchant: 'Docs World of Beer', amount: 38.86, currency: 'USD', type: 'expense' },

  // Friday, May 13, 2022
  { date: '2022-05-13', description: 'Dinner Reimbursement', merchant: 'Omi', amount: 14.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-13', description: 'Dinner Reimbursement', merchant: 'Jordan', amount: 13.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-13', description: 'Dinner Reimbursement', merchant: 'Kravetz', amount: 13.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-13', description: 'Breakfast', merchant: 'Wawa', amount: 8.22, currency: 'USD', type: 'expense' },
  { date: '2022-05-13', description: 'Ice & cigs', merchant: 'Sheetz', amount: 20.21, currency: 'USD', type: 'expense' },
  { date: '2022-05-13', description: 'Gas', merchant: 'Sheets', amount: 62.99, currency: 'USD', type: 'expense' },

  // Saturday, May 14, 2022 - No transactions

  // Sunday, May 15, 2022
  { date: '2022-05-15', description: 'Lunch', merchant: 'Sheetz', amount: 15.89, currency: 'USD', type: 'expense' },
  { date: '2022-05-15', description: 'Greens Fee, Bike Rental, Driving Range, Souvie ball', merchant: 'Jack Frost National', amount: 79.40, currency: 'USD', type: 'expense' },
  { date: '2022-05-15', description: 'Dinner', merchant: 'Jordan', amount: 12.45, currency: 'USD', type: 'expense' },
  { date: '2022-05-15', description: 'Cannabis Reimbursement', merchant: 'Jordan', amount: 38.25, currency: 'USD', type: 'income' },

  // Monday, May 16, 2022
  { date: '2022-05-16', description: 'Groceries', merchant: "Lee's Produce", amount: 50.91, currency: 'USD', type: 'expense' },
  { date: '2022-05-16', description: 'Groceries', merchant: 'Giant', amount: 52.45, currency: 'USD', type: 'expense' },

  // Tuesday, May 17, 2022 - No transactions
  // Wednesday, May 18, 2022 - No transactions

  // Thursday, May 19, 2022
  { date: '2022-05-19', description: 'Dinner', merchant: 'Bar Sera', amount: 50.62, currency: 'USD', type: 'expense' },

  // Friday, May 20, 2022
  { date: '2022-05-20', description: 'Greens Fee', merchant: 'Jeffersonville', amount: 25.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-20', description: 'Dinner', merchant: 'Wawa', amount: 14.35, currency: 'USD', type: 'expense' },

  // Saturday, May 21, 2022
  { date: '2022-05-21', description: 'Annual Vehicle Registration', merchant: 'PennDoT', amount: 44.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-21', description: 'Car Wash', merchant: 'Valley Forge Car Wash', amount: 17.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-21', description: 'Cannabis', merchant: 'The Apothecarium', amount: 72.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-21', description: 'Groceries', merchant: "Lee's Produce", amount: 18.61, currency: 'USD', type: 'expense' },
  { date: '2022-05-21', description: 'Groceries', merchant: 'Giant', amount: 40.05, currency: 'USD', type: 'expense' },
  { date: '2022-05-21', description: 'Dinner', merchant: 'Craig', amount: 25.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-21', description: 'Cigs', merchant: 'Gulf', amount: 10.44, currency: 'USD', type: 'expense' },

  // Sunday, May 22, 2022
  { date: '2022-05-22', description: 'Breakfast', merchant: 'Wawa', amount: 8.22, currency: 'USD', type: 'expense' },
  { date: '2022-05-22', description: 'Greens Fee', merchant: 'Hickory Valley', amount: 70.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-22', description: 'Dinner', merchant: 'Craig', amount: 21.00, currency: 'USD', type: 'expense' },

  // Monday, May 23, 2022 - No transactions

  // Tuesday, May 24, 2022
  { date: '2022-05-24', description: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD', type: 'expense' },

  // Wednesday, May 25, 2022
  { date: '2022-05-25', description: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD', type: 'expense' },

  // Thursday, May 26, 2022
  { date: '2022-05-26', description: 'Dinner with Family', merchant: 'Dad', amount: 20.00, currency: 'USD', type: 'expense' },

  // Friday, May 27, 2022
  { date: '2022-05-27', description: 'Dinner', merchant: 'Chiangmai', amount: 15.85, currency: 'USD', type: 'expense' },

  // Saturday, May 28, 2022
  { date: '2022-05-28', description: 'Haircut', merchant: 'Tough Nickel', amount: 50.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-28', description: 'Dinner', merchant: 'East Branch', amount: 35.85, currency: 'USD', type: 'expense' },
  { date: '2022-05-28', description: 'Golf and drinks', merchant: 'Charlie', amount: 130.00, currency: 'USD', type: 'expense' },

  // Sunday, May 29, 2022
  { date: '2022-05-29', description: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-29', description: 'Cookies & Lunch', merchant: 'Giant', amount: 17.76, currency: 'USD', type: 'expense' },
  { date: '2022-05-29', description: 'Greens Fee', merchant: 'Highlands of Donegal', amount: 46.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-29', description: 'Snack', merchant: 'Highlands of Donegal', amount: 4.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-29', description: 'Reimbursement', merchant: 'Jordan', amount: 14.00, currency: 'USD', type: 'income' },

  // Monday, May 30, 2022
  { date: '2022-05-30', description: 'Electric bill', merchant: 'Jordan', amount: 13.80, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Xfinity Bill', merchant: 'Jordan', amount: 73.04, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Golf Balls', merchant: 'Vice', amount: 108.06, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Clippers, straight razor kit', merchant: 'Amazon', amount: 56.16, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Transfer fees', merchant: 'Wise', amount: 4.40, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Gas', merchant: 'Wawa', amount: 68.28, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Wiper fluid', merchant: 'Wawa', amount: 4.66, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Groceries', merchant: 'Giant', amount: 75.57, currency: 'USD', type: 'expense' },

  // Tuesday, May 31, 2022
  { date: '2022-05-31', description: 'Shaving brush, bowl, stand, after shave', merchant: 'Amazon', amount: 53.41, currency: 'USD', type: 'expense' },
  { date: '2022-05-31', description: 'Auto reload', merchant: 'EZ Pass', amount: 35.00, currency: 'USD', type: 'expense' },

  // GROSS INCOME
  { date: '2022-05-06', description: 'Refund: TransferWise ApplePay fees', merchant: 'Wise', amount: 41.98, currency: 'USD', type: 'income' },
  { date: '2022-05-14', description: 'Paycheck', merchant: 'E2Open', amount: 2798.56, currency: 'USD', type: 'income' },
  { date: '2022-05-30', description: 'Freelance Income - May', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-05-31', description: 'Paycheck', merchant: 'E2Open', amount: 2792.65, currency: 'USD', type: 'income' },
  { date: '2022-05-31', description: 'Annual bonus', merchant: 'E2open', amount: 1978.86, currency: 'USD', type: 'income' },

  // PERSONAL SAVINGS & INVESTMENTS (PDF shows no date, using CSV date of May 30)
  { date: '2022-05-30', description: 'Crypto Investment', merchant: 'Coinbase', amount: 450.00, currency: 'USD', type: 'expense' },
  { date: '2022-05-30', description: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD', type: 'expense' },
];

console.log(`\nPDF Transactions extracted: ${pdfTransactions.length}`);

async function verifyPDF1to1() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('\nMAY 2022: PDF→DB VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: PDF→DB - Transaction-level matching');
  console.log('Source: Actual Spent column only (ignoring conversion columns)\n');

  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-05-01')
    .lte('transaction_date', '2022-05-31')
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  if (!dbTransactions) {
    console.error('No transactions returned from database');
    return;
  }

  console.log(`Database: ${dbTransactions.length} transactions\n`);

  let matchedCount = 0;
  let unmatchedPDF = [];
  const matchedDBIds = new Set();

  pdfTransactions.forEach((pdfTxn, idx) => {
    const match = dbTransactions.find(dbTxn => {
      if (matchedDBIds.has(dbTxn.id)) return false;
      if (dbTxn.transaction_date !== pdfTxn.date) return false;
      if (Math.abs(dbTxn.amount - pdfTxn.amount) > 0.01) return false;
      if (dbTxn.original_currency !== pdfTxn.currency) return false;
      if (dbTxn.transaction_type !== pdfTxn.type) return false;

      const normalizeQuotes = (str) => str.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      const pdfDesc = normalizeQuotes(pdfTxn.description.toLowerCase().trim());
      const dbDesc = normalizeQuotes(dbTxn.description.toLowerCase().trim());
      if (pdfDesc !== dbDesc) {
        if (!pdfDesc.includes(dbDesc) && !dbDesc.includes(pdfDesc)) {
          return false;
        }
      }

      return true;
    });

    if (match) {
      matchedCount++;
      matchedDBIds.add(match.id);
    } else {
      unmatchedPDF.push({
        index: idx + 1,
        date: pdfTxn.date,
        description: pdfTxn.description,
        merchant: pdfTxn.merchant,
        amount: pdfTxn.amount,
        currency: pdfTxn.currency,
        type: pdfTxn.type
      });
    }
  });

  const unmatchedDB = dbTransactions.filter(dbTxn => !matchedDBIds.has(dbTxn.id));

  console.log('MATCHING RESULTS:');
  console.log('-'.repeat(70));
  console.log(`Matched: ${matchedCount}/${pdfTransactions.length} (${(matchedCount/pdfTransactions.length*100).toFixed(1)}%)`);
  console.log(`Unmatched PDF transactions: ${unmatchedPDF.length}`);
  console.log(`Unmatched DB transactions: ${unmatchedDB.length}`);
  console.log();

  if (unmatchedPDF.length > 0) {
    console.log('❌ UNMATCHED PDF TRANSACTIONS (not in DB):');
    unmatchedPDF.slice(0, 20).forEach(txn => {
      console.log(`  #${txn.index}: ${txn.date} | ${txn.description} | ${txn.merchant} | ${txn.amount} ${txn.currency} | ${txn.type}`);
    });
    if (unmatchedPDF.length > 20) {
      console.log(`  ... and ${unmatchedPDF.length - 20} more`);
    }
    console.log();
  }

  if (unmatchedDB.length > 0) {
    console.log('❌ UNMATCHED DATABASE TRANSACTIONS (not in PDF):');
    unmatchedDB.slice(0, 20).forEach(txn => {
      console.log(`  ${txn.transaction_date} | ${txn.description} | ${txn.amount} ${txn.original_currency} | ${txn.transaction_type}`);
    });
    if (unmatchedDB.length > 20) {
      console.log(`  ... and ${unmatchedDB.length - 20} more`);
    }
    console.log();
  }

  console.log('FIELD VERIFICATION (sample of matched transactions):');
  console.log('-'.repeat(70));

  for (const pdfTxn of pdfTransactions.slice(0, 5)) {
    const match = dbTransactions.find(dbTxn =>
      matchedDBIds.has(dbTxn.id) &&
      dbTxn.transaction_date === pdfTxn.date &&
      Math.abs(dbTxn.amount - pdfTxn.amount) < 0.01
    );

    if (match) {
      console.log(`\nTransaction: ${pdfTxn.description}`);
      console.log(`  Date: ${pdfTxn.date} ✅`);
      console.log(`  Amount: ${pdfTxn.amount} ${pdfTxn.currency} ✅`);
      console.log(`  Type: ${pdfTxn.type} ✅`);
      console.log(`  Merchant: ${pdfTxn.merchant} → ${match.vendors?.name || 'N/A'}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  if (matchedCount === pdfTransactions.length && unmatchedDB.length === 0) {
    console.log('\n✅ PERFECT 1:1 MATCH (PDF→DB)');
    console.log(`All ${matchedCount} PDF transactions found in database`);
    console.log('No extra transactions in database');
    console.log('\nSTATUS: ✅ VERIFIED');
  } else if (matchedCount === pdfTransactions.length && unmatchedDB.length > 0) {
    console.log('\n⚠️  ALL PDF TRANSACTIONS MATCHED');
    console.log(`But ${unmatchedDB.length} extra transactions found in database`);
    console.log('These may be from CSV data that differs from PDF');
    console.log('\nSTATUS: ⚠️  NEEDS REVIEW');
  } else {
    console.log('\n❌ INCOMPLETE MATCH');
    console.log(`${unmatchedPDF.length} PDF transactions not found in database`);
    console.log(`${unmatchedDB.length} database transactions not in PDF`);
    console.log('\nSTATUS: ❌ REQUIRES INVESTIGATION');
  }

  console.log('\nNOTE: This verifies PDF→DB using only "Actual Spent" amounts.');
  console.log('      Conversion columns in PDF are ignored per protocol.');
  console.log('      CSV→DB was verified at 100% (110/110) - this is the authoritative chain.');
}

verifyPDF1to1().catch(console.error);
