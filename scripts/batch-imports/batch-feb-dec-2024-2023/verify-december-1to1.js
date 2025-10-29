require('dotenv').config({ path: '../../../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify1to1() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('DECEMBER 2023: 1:1 TRANSACTION VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: v2.0 - Transaction-level matching\n');

  // Load the parsed JSON (our source of truth from CSV)
  const parsedPath = path.join(__dirname, 'december-2023/december-2023-CORRECTED.json');
  const csvTransactions = JSON.parse(fs.readFileSync(parsedPath, 'utf-8'));

  console.log(`CSV Source: ${csvTransactions.length} transactions\n`);

  // Get all database transactions for December 2023
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-12-01')
    .lte('transaction_date', '2023-12-31')
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

  if (csvTransactions.length !== dbTransactions.length) {
    console.log(`⚠️  COUNT MISMATCH: CSV has ${csvTransactions.length}, DB has ${dbTransactions.length}\n`);
  }

  // Match each CSV transaction to a database transaction
  let matchedCount = 0;
  let unmatchedCSV = [];
  const matchedDBIds = new Set();

  csvTransactions.forEach((csvTxn, idx) => {
    // Find matching DB transaction
    const match = dbTransactions.find(dbTxn => {
      // Already matched
      if (matchedDBIds.has(dbTxn.id)) return false;

      // Date must match
      if (dbTxn.transaction_date !== csvTxn.transaction_date) return false;

      // Amount must match (within 0.01 for floating point)
      if (Math.abs(dbTxn.amount - csvTxn.amount) > 0.01) return false;

      // Currency must match
      if (dbTxn.original_currency !== csvTxn.currency) return false;

      // Transaction type must match
      if (dbTxn.transaction_type !== csvTxn.transaction_type) return false;

      // Description should match (allow some flexibility)
      const csvDesc = csvTxn.description.toLowerCase().trim();
      const dbDesc = dbTxn.description.toLowerCase().trim();
      if (csvDesc !== dbDesc) {
        // Check if one contains the other (partial match)
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

  // Find unmatched DB transactions
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

  // Detailed field verification for matched transactions
  console.log('FIELD VERIFICATION (sample of matched transactions):');
  console.log('-'.repeat(70));

  let sampleMatches = 0;
  for (const csvTxn of csvTransactions.slice(0, 5)) {
    const match = dbTransactions.find(dbTxn =>
      matchedDBIds.has(dbTxn.id) &&
      dbTxn.transaction_date === csvTxn.transaction_date &&
      Math.abs(dbTxn.amount - csvTxn.amount) < 0.01
    );

    if (match) {
      console.log(`\nTransaction: ${csvTxn.description}`);
      console.log(`  Date: ${csvTxn.transaction_date} ✅`);
      console.log(`  Amount: ${csvTxn.amount} ${csvTxn.currency} ✅`);
      console.log(`  Type: ${csvTxn.transaction_type} ✅`);
      console.log(`  Vendor: ${csvTxn.merchant || 'N/A'} → ${match.vendors?.name || 'N/A'}`);
      console.log(`  Payment: ${csvTxn.payment_method || 'N/A'} → ${match.payment_methods?.name || 'N/A'}`);
      sampleMatches++;
    }
  }

  console.log('\n' + '='.repeat(70));
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
    console.log('These may be manual additions or duplicate imports');
    console.log('\nSTATUS: ⚠️  NEEDS REVIEW');
  } else {
    console.log('\n❌ INCOMPLETE MATCH');
    console.log(`${unmatchedCSV.length} CSV transactions missing from database`);
    console.log(`${unmatchedDB.length} database transactions not in CSV`);
    console.log('\nSTATUS: ❌ FAILED - REQUIRES INVESTIGATION');
  }

  console.log('\nNOTE: Aggregate totals (GRAND TOTAL) are NOT verified.');
  console.log('      Transaction-level matching is the verification standard.');
}

verify1to1().catch(console.error);
