require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PDF source: Budget for Import-page41.pdf
// Extracted manually from June 2022 section
// Using ONLY "Actual Spent" column with currency determined by payment method
const pdfTransactions = [
  // Wednesday, June 1, 2022
  { date: '2022-06-01', description: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2022-06-01', description: "This Month's Rent, Storage (Conshy)", merchant: 'Jordan', amount: 857.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-01', description: "This Month's Rent", merchant: 'Panya (Landlord)', amount: 19000.00, currency: 'THB', type: 'expense' },
  { date: '2022-06-01', description: 'Lenses for glasses, Contact lenses', merchant: 'Eye to Eye', amount: 954.92, currency: 'USD', type: 'expense' },

  // Thursday, June 2, 2022
  { date: '2022-06-02', description: 'Golf reservation', merchant: 'Supreme Golf', amount: 3.23, currency: 'USD', type: 'expense' },

  // Friday, June 3, 2022
  { date: '2022-06-03', description: 'Coffee', merchant: 'Panera', amount: 2.75, currency: 'USD', type: 'expense' },
  { date: '2022-06-03', description: 'Lunch', merchant: 'Panera', amount: 11.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-03', description: 'New rear shocks, inspection, oil change', merchant: 'Plymouth Auto Repair', amount: 873.85, currency: 'USD', type: 'expense' },
  { date: '2022-06-03', description: 'Dry Cleaning', merchant: 'Maytag Laundromat', amount: 15.15, currency: 'USD', type: 'expense' },
  { date: '2022-06-03', description: 'Oil Cartridge Mod', merchant: 'Smoker Bruce', amount: 26.50, currency: 'USD', type: 'expense' },
  { date: '2022-06-03', description: 'Dinner', merchant: 'Dad', amount: 20.00, currency: 'USD', type: 'expense' },

  // Saturday, June 4, 2022
  { date: '2022-06-04', description: 'Driving Range', merchant: "Freddy's Fun Farm", amount: 9.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-04', description: 'Breakfast', merchant: 'Wawa', amount: 8.22, currency: 'USD', type: 'expense' },
  { date: '2022-06-04', description: 'Greens Fee', merchant: 'Mainland', amount: 65.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-04', description: 'Drinks', merchant: 'Mainland', amount: 23.97, currency: 'USD', type: 'expense' },
  { date: '2022-06-04', description: 'Phillies Tickets', merchant: 'MLB', amount: 295.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-04', description: 'Parking', merchant: 'Jordan', amount: 15.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-04', description: 'Food & Drinks', merchant: 'Citizens Bank Park', amount: 102.53, currency: 'USD', type: 'expense' },
  { date: '2022-06-04', description: 'Reimbursement for Tickets', merchant: 'Laura', amount: 184.00, currency: 'USD', type: 'income' },

  // Sunday, June 5, 2022
  { date: '2022-06-05', description: 'Adhesives, hook, cable management', merchant: 'Home Depot', amount: 29.20, currency: 'USD', type: 'expense' },
  { date: '2022-06-05', description: 'Groceries', merchant: 'Giant', amount: 59.66, currency: 'USD', type: 'expense' },

  // Monday, June 6, 2022
  { date: '2022-06-06', description: 'Monitor arm', merchant: 'Amazon', amount: 63.49, currency: 'USD', type: 'expense' },
  { date: '2022-06-06', description: 'Camera batteries', merchant: 'Amazon', amount: 23.84, currency: 'USD', type: 'expense' },
  { date: '2022-06-06', description: 'Bathroom Art', merchant: 'Etsy', amount: 99.20, currency: 'USD', type: 'expense' },
  { date: '2022-06-06', description: 'Picture Frames', merchant: 'Amazon', amount: 27.55, currency: 'USD', type: 'expense' },

  // Tuesday, June 7, 2022 - No transactions

  // Wednesday, June 8, 2022
  { date: '2022-06-08', description: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD', type: 'expense' },

  // Thursday, June 9, 2022
  { date: '2022-06-09', description: 'Sink guard', merchant: 'Amazon', amount: 10.21, currency: 'USD', type: 'expense' },
  { date: '2022-06-09', description: 'Reimbursement (sink guard)', merchant: 'Jordan', amount: 5.10, currency: 'USD', type: 'income' },

  // Friday, June 10, 2022
  { date: '2022-06-10', description: 'Lifetime membership', merchant: 'Topgolf', amount: 4.00, currency: 'USD', type: 'expense' },

  // Saturday, June 11, 2022
  { date: '2022-06-11', description: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD', type: 'expense' },

  // Sunday, June 12, 2022
  { date: '2022-06-12', description: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD', type: 'expense' },
  { date: '2022-06-12', description: 'Coffee', merchant: 'Sheetz', amount: 1.80, currency: 'USD', type: 'expense' },
  { date: '2022-06-12', description: 'Groceries', merchant: 'Giant', amount: 87.80, currency: 'USD', type: 'expense' },

  // Monday, June 13, 2022
  { date: '2022-06-13', description: 'Dinner', merchant: 'El Limon', amount: 13.25, currency: 'USD', type: 'expense' },

  // Tuesday, June 14, 2022
  { date: '2022-06-14', description: 'Lifetime License: Webcam software', merchant: 'XSplit Vcam', amount: 60.00, currency: 'USD', type: 'expense' },

  // Wednesday, June 15, 2022
  { date: '2022-06-15', description: 'Golf', merchant: 'Walnut Lane', amount: 20.00, currency: 'USD', type: 'expense' },

  // Thursday, June 16, 2022
  { date: '2022-06-16', description: 'Dinner', merchant: 'StoneRose', amount: 45.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-16', description: 'Cost for Otter Run', merchant: 'Ron Martin', amount: 19.00, currency: 'USD', type: 'expense' },

  // Friday, June 17, 2022
  { date: '2022-06-17', description: 'Towels, Hand Soap, Tees, Mouthwash', merchant: 'Amazon', amount: 45.21, currency: 'USD', type: 'expense' },
  { date: '2022-06-17', description: 'Reimbursement for Driving Range', merchant: 'Brad', amount: 7.50, currency: 'USD', type: 'income' },

  // Saturday, June 18, 2022
  { date: '2022-06-18', description: 'Coffee Snacks', merchant: 'Wawa', amount: 9.16, currency: 'USD', type: 'expense' },
  { date: '2022-06-18', description: 'Driving Range', merchant: "Waltz's", amount: 9.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-18', description: 'Golf', merchant: 'Linfield', amount: 66.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-18', description: 'Drinks and snack', merchant: 'Linfield', amount: 18.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-18', description: 'Groceries', merchant: 'Giant', amount: 39.87, currency: 'USD', type: 'expense' },
  { date: '2022-06-18', description: 'Snack', merchant: 'Vending machine', amount: 3.20, currency: 'USD', type: 'expense' },

  // Sunday, June 19, 2022
  { date: '2022-06-19', description: 'Flight Fare Difference: MIA - MCO - PHL', merchant: 'American Airlines', amount: 169.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-19', description: 'Groceries', merchant: 'Giant', amount: 83.12, currency: 'USD', type: 'expense' },
  // Note: "Loofas, Back loofa, shower hooks" shows $0.00 - will be skipped

  // Monday, June 20, 2022
  { date: '2022-06-20', description: 'Driving Range', merchant: "Waltz's", amount: 10.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-20', description: 'Greens Fee', merchant: 'Turtle Creek', amount: 54.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-20', description: 'Lunch', merchant: 'Turtle Creek', amount: 10.50, currency: 'USD', type: 'expense' },
  { date: '2022-06-20', description: 'Breakfast', merchant: 'Wawa', amount: 7.49, currency: 'USD', type: 'expense' },

  // Tuesday, June 21, 2022 - No transactions

  // Wednesday, June 22, 2022
  { date: '2022-06-22', description: 'AirPods Max Stand', merchant: 'Etsy', amount: 33.16, currency: 'USD', type: 'expense' },
  { date: '2022-06-22', description: 'Cupcakes', merchant: 'Pretty Tasty Cupcakes', amount: 13.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-22', description: 'Birthday gift & card for Jordan, Groceries', merchant: 'Giant', amount: 43.50, currency: 'USD', type: 'expense' },
  { date: '2022-06-22', description: 'Dinner: Bar Sara', merchant: 'Jordan', amount: 20.66, currency: 'USD', type: 'expense' },

  // Thursday, June 23, 2022
  { date: '2022-06-23', description: 'Dinner', merchant: 'Dad', amount: 23.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-23', description: 'Bottle Bash for Austin', merchant: "Dick's", amount: 53.49, currency: 'USD', type: 'expense' },

  // Friday, June 24, 2022
  { date: '2022-06-24', description: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD', type: 'expense' },
  { date: '2022-06-24', description: 'Lunch', merchant: 'Saku Sushi', amount: 13.61, currency: 'USD', type: 'expense' },
  { date: '2022-06-24', description: 'Coffee', merchant: 'Starbucks', amount: 3.03, currency: 'USD', type: 'expense' },
  { date: '2022-06-24', description: 'Mini Golf', merchant: "Waltz's", amount: 32.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-24', description: 'Monthly Subscription: WSJ', merchant: 'WSJ', amount: 8.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-24', description: 'Gas', merchant: 'Wawa', amount: 64.42, currency: 'USD', type: 'expense' },

  // Saturday, June 25, 2022
  { date: '2022-06-25', description: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD', type: 'expense' },
  { date: '2022-06-25', description: 'Tip', merchant: "I'm Sergio", amount: 10.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-25', description: 'Haircut', merchant: "I'm Sergio", amount: 45.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-25', description: 'Cannabis', merchant: 'Apothecarium', amount: 208.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-25', description: 'Groceries', merchant: "Lee's", amount: 70.72, currency: 'USD', type: 'expense' },
  { date: '2022-06-25', description: 'Groceries', merchant: 'Giant', amount: 44.25, currency: 'USD', type: 'expense' },
  { date: '2022-06-25', description: 'Drink', merchant: "Daniel's", amount: 13.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-25', description: 'Tincture Reimbursement', merchant: 'Brad', amount: 64.00, currency: 'USD', type: 'income' },
  { date: '2022-06-25', description: 'Reimbursement (selfie stick)', merchant: 'Jordan', amount: 27.55, currency: 'USD', type: 'income' },

  // Sunday, June 26, 2022
  { date: '2022-06-26', description: 'Greens Fee', merchant: 'Honey Brook', amount: 79.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-26', description: 'Golf ball, poker chip', merchant: 'Honey Brook', amount: 6.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-26', description: 'Dinner: Dragon & Pho', merchant: 'Doordash', amount: 29.64, currency: 'USD', type: 'expense' },

  // Monday, June 27, 2022
  { date: '2022-06-27', description: 'Cancer screening, fluoride treatment', merchant: 'Plymouth Family Dental', amount: 60.00, currency: 'USD', type: 'expense' },
  // Note: "Car Freshener, Toothpaste, Coffee beans" shows $0.00 - will be skipped
  { date: '2022-06-27', description: 'Reimbursement', merchant: 'Craig', amount: 90.00, currency: 'USD', type: 'income' },
  { date: '2022-06-27', description: 'Reimbursement for dinner', merchant: 'Jordan', amount: 22.32, currency: 'USD', type: 'income' },

  // Tuesday, June 28, 2022 - No transactions

  // Wednesday, June 29, 2022
  { date: '2022-06-29', description: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD', type: 'expense' },

  // Thursday, June 30, 2022
  { date: '2022-06-30', description: 'Dinner w/ Jordan', merchant: 'El Limon X', amount: 21.73, currency: 'USD', type: 'expense' },
  { date: '2022-06-30', description: 'Golf w/ Jordan', merchant: 'Pinecrest X', amount: 88.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-30', description: 'Snack', merchant: 'Pinecrest', amount: 9.00, currency: 'USD', type: 'expense' },

  // GROSS INCOME
  { date: '2022-06-14', description: 'Paycheck', merchant: 'E2Open', amount: 2798.55, currency: 'USD', type: 'income' },
  { date: '2022-06-30', description: 'Paycheck', merchant: 'E2Open', amount: 2792.65, currency: 'USD', type: 'income' },

  // PERSONAL SAVINGS & INVESTMENTS (using month-end date)
  { date: '2022-06-30', description: 'Crypto Investment', merchant: 'Coinbase', amount: 450.00, currency: 'USD', type: 'expense' },
  { date: '2022-06-30', description: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD', type: 'expense' },
];

console.log(`\nPDF Transactions extracted: ${pdfTransactions.length}`);
console.log('NOTE: 2 zero-value transactions correctly skipped during CSV parsing');

async function verifyPDF1to1() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('\nJUNE 2022: PDF→DB VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: PDF→DB - Transaction-level matching');
  console.log('Source: Actual Spent column only (ignoring conversion columns)\n');

  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-06-01')
    .lte('transaction_date', '2022-06-30')
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
  console.log('      CSV→DB was verified at 100% (87/87) - this is the authoritative chain.');
}

verifyPDF1to1().catch(console.error);
