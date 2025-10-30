require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify1to1() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('NOVEMBER 2022: 1:1 TRANSACTION VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: v2.0 - Transaction-level matching\n');

  const parsedPath = path.join(__dirname, 'november-2022/november-2022-CORRECTED.json');
  const csvTransactions = JSON.parse(fs.readFileSync(parsedPath, 'utf-8'));

  console.log(`CSV Source: ${csvTransactions.length} transactions\n`);

  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-11-01')
    .lte('transaction_date', '2022-11-30')
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`Database: ${dbTransactions.length} transactions\n`);

  if (csvTransactions.length !== dbTransactions.length) {
    console.log(`⚠️  COUNT MISMATCH: CSV has ${csvTransactions.length}, DB has ${dbTransactions.length}\n`);
  }

  let matchedCount = 0;
  let unmatchedCSV = [];
  const matchedDBIds = new Set();

  csvTransactions.forEach((csvTxn, idx) => {
    const match = dbTransactions.find(dbTxn => {
      if (matchedDBIds.has(dbTxn.id)) return false;
      if (dbTxn.transaction_date !== csvTxn.transaction_date) return false;
      if (Math.abs(dbTxn.amount - csvTxn.amount) > 0.01) return false;
      if (dbTxn.original_currency !== csvTxn.currency) return false;
      if (dbTxn.transaction_type !== csvTxn.transaction_type) return false;

      const csvDesc = csvTxn.description.toLowerCase().trim();
      const dbDesc = dbTxn.description.toLowerCase().trim();
      if (csvDesc !== dbDesc) {
        if (!csvDesc.includes(dbDesc) && !dbDesc.includes(csvDesc)) {
          return false;
        }
      }

      return true;
    });

    if (match) {
      matchedCount++;
      matchedDBIds.add(match.id);
    } else {
      unmatchedCSV.push({
        index: idx + 1,
        date: csvTxn.transaction_date,
        description: csvTxn.description,
        amount: csvTxn.amount,
        currency: csvTxn.currency,
        type: csvTxn.transaction_type
      });
    }
  });

  const unmatchedDB = dbTransactions.filter(dbTxn => !matchedDBIds.has(dbTxn.id));

  console.log('MATCHING RESULTS:');
  console.log('-'.repeat(70));
  console.log(`Matched: ${matchedCount}/${csvTransactions.length} (${(matchedCount/csvTransactions.length*100).toFixed(1)}%)`);
  console.log(`Unmatched CSV transactions: ${unmatchedCSV.length}`);
  console.log(`Unmatched DB transactions: ${unmatchedDB.length}`);
  console.log();

  if (unmatchedCSV.length > 0) {
    console.log('❌ UNMATCHED CSV TRANSACTIONS (missing from DB):');
    unmatchedCSV.slice(0, 10).forEach(txn => {
      console.log(`  #${txn.index}: ${txn.date} | ${txn.description} | ${txn.amount} ${txn.currency}`);
    });
    if (unmatchedCSV.length > 10) {
      console.log(`  ... and ${unmatchedCSV.length - 10} more`);
    }
    console.log();
  }

  if (unmatchedDB.length > 0) {
    console.log('❌ UNMATCHED DATABASE TRANSACTIONS (not in CSV):');
    unmatchedDB.slice(0, 10).forEach(txn => {
      console.log(`  ${txn.transaction_date} | ${txn.description} | ${txn.amount} ${txn.original_currency}`);
    });
    if (unmatchedDB.length > 10) {
      console.log(`  ... and ${unmatchedDB.length - 10} more`);
    }
    console.log();
  }

  console.log('='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  if (matchedCount === csvTransactions.length && unmatchedDB.length === 0) {
    console.log('\n✅ PERFECT 1:1 MATCH');
    console.log(`All ${matchedCount} CSV transactions found in database`);
    console.log('No extra transactions in database');
    console.log('\nSTATUS: ✅ VERIFIED');
  } else if (matchedCount === csvTransactions.length && unmatchedDB.length > 0) {
    console.log('\n⚠️  ALL CSV TRANSACTIONS MATCHED');
    console.log(`But ${unmatchedDB.length} extra transactions found in database`);
    console.log('\nSTATUS: ⚠️  NEEDS REVIEW');
  } else {
    console.log('\n❌ INCOMPLETE MATCH');
    console.log(`${unmatchedCSV.length} CSV transactions missing from database`);
    console.log(`${unmatchedDB.length} database transactions not in CSV`);
    console.log('\nSTATUS: ❌ FAILED - REQUIRES INVESTIGATION');
  }
}

verify1to1().catch(console.error);
