#!/usr/bin/env node

/**
 * Gate 3: 100% Transaction-by-Transaction Verification
 *
 * Performs comprehensive 1:1 matching between parsed JSON and database
 * - Verifies every transaction field (date, description, amount, currency, type)
 * - Identifies missing transactions in either direction
 * - Reports all discrepancies with detailed information
 * - Generates comprehensive verification report
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USER_EMAIL = 'dennis@dsil.design';
const BATCH_DIR = 'scripts/batch-imports/batch-nov-sept-2023';

const MONTHS = [
  {
    key: 'november-2023',
    month: '2023-11',
    jsonFile: `${BATCH_DIR}/november-2023/november-2023-CORRECTED.json`,
    expectedCount: 75
  },
  {
    key: 'october-2023',
    month: '2023-10',
    jsonFile: `${BATCH_DIR}/october-2023/october-2023-CORRECTED.json`,
    expectedCount: 114
  },
  {
    key: 'september-2023',
    month: '2023-09',
    jsonFile: `${BATCH_DIR}/september-2023/september-2023-CORRECTED.json`,
    expectedCount: 178
  }
];

function normalizeAmount(amount) {
  return parseFloat(amount).toFixed(2);
}

function normalizeDescription(desc) {
  return desc.trim();
}

function createTransactionKey(txn) {
  // Create a unique key for matching transactions
  // Using date + description + amount + currency
  const date = txn.transaction_date || txn.date;
  const desc = normalizeDescription(txn.description);
  const amount = normalizeAmount(txn.amount);
  const currency = txn.original_currency || txn.currency || 'USD';

  return `${date}|${desc}|${amount}|${currency}`;
}

async function verifyMonth(monthConfig) {
  const [year, month] = monthConfig.month.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📄 GATE 3: ${monthConfig.key.toUpperCase()} - 100% VERIFICATION`);
  console.log(`${'='.repeat(70)}\n`);

  // Load parsed JSON
  console.log(`📂 Loading parsed JSON: ${monthConfig.jsonFile}`);
  const jsonData = JSON.parse(fs.readFileSync(monthConfig.jsonFile, 'utf8'));
  console.log(`   ✅ Loaded ${jsonData.length} transactions from JSON\n`);

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (!user) {
    throw new Error(`User ${USER_EMAIL} not found`);
  }

  // Get database transactions
  console.log(`🗄️  Loading database transactions for ${monthConfig.month}...`);
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      original_currency,
      transaction_type,
      transaction_date,
      vendors(name),
      payment_methods(name),
      transaction_tags(tags(name))
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', `${monthConfig.month}-01`)
    .lte('transaction_date', `${monthConfig.month}-${String(lastDay).padStart(2, '0')}`)
    .order('transaction_date', { ascending: true });

  if (error) {
    throw new Error(`Error fetching transactions: ${error.message}`);
  }

  console.log(`   ✅ Loaded ${dbTransactions.length} transactions from database\n`);

  // Create lookup maps
  const jsonMap = new Map();
  const dbMap = new Map();

  jsonData.forEach(txn => {
    const key = createTransactionKey(txn);
    if (!jsonMap.has(key)) {
      jsonMap.set(key, []);
    }
    jsonMap.get(key).push(txn);
  });

  dbTransactions.forEach(txn => {
    const key = createTransactionKey(txn);
    if (!dbMap.has(key)) {
      dbMap.set(key, []);
    }
    dbMap.get(key).push(txn);
  });

  // Verification results
  const results = {
    monthKey: monthConfig.key,
    month: monthConfig.month,
    jsonCount: jsonData.length,
    dbCount: dbTransactions.length,
    matched: 0,
    missingInDb: [],
    missingInJson: [],
    fieldMismatches: [],
    duplicates: []
  };

  // Find matches and missing transactions
  console.log(`🔍 Performing 1:1 transaction matching...\n`);

  // Check each JSON transaction
  for (const [key, jsonTxns] of jsonMap.entries()) {
    const dbTxns = dbMap.get(key);

    if (!dbTxns) {
      // Transaction in JSON but not in database
      jsonTxns.forEach(txn => {
        results.missingInDb.push({
          date: txn.transaction_date || txn.date,
          description: txn.description,
          amount: txn.amount,
          currency: txn.original_currency || txn.currency || 'USD',
          type: txn.transaction_type
        });
      });
    } else if (jsonTxns.length === dbTxns.length) {
      // Same count - transactions match
      results.matched += jsonTxns.length;

      // Verify field-level details for each match
      for (let i = 0; i < jsonTxns.length; i++) {
        const jsonTxn = jsonTxns[i];
        const dbTxn = dbTxns[i];

        const mismatches = [];

        // Check transaction type
        if (jsonTxn.transaction_type !== dbTxn.transaction_type) {
          mismatches.push(`type: ${jsonTxn.transaction_type} vs ${dbTxn.transaction_type}`);
        }

        // Check vendor
        const jsonVendor = jsonTxn.vendor || jsonTxn.merchant;
        const dbVendor = dbTxn.vendors?.name;
        if (jsonVendor && dbVendor && jsonVendor.toLowerCase() !== dbVendor.toLowerCase()) {
          mismatches.push(`vendor: "${jsonVendor}" vs "${dbVendor}"`);
        }

        // Check payment method
        const jsonPM = jsonTxn.payment_method;
        const dbPM = dbTxn.payment_methods?.name;
        if (jsonPM && dbPM && jsonPM.toLowerCase() !== dbPM.toLowerCase()) {
          mismatches.push(`payment_method: "${jsonPM}" vs "${dbPM}"`);
        }

        // Check tags
        const jsonTags = (jsonTxn.tags || []).sort();
        const dbTags = (dbTxn.transaction_tags?.map(tt => tt.tags.name) || []).sort();
        if (jsonTags.length !== dbTags.length || !jsonTags.every((tag, idx) => tag === dbTags[idx])) {
          mismatches.push(`tags: [${jsonTags.join(', ')}] vs [${dbTags.join(', ')}]`);
        }

        if (mismatches.length > 0) {
          results.fieldMismatches.push({
            date: jsonTxn.transaction_date || jsonTxn.date,
            description: jsonTxn.description,
            amount: jsonTxn.amount,
            mismatches: mismatches
          });
        }
      }
    } else {
      // Different counts - possible duplicate issue
      results.duplicates.push({
        key: key,
        jsonCount: jsonTxns.length,
        dbCount: dbTxns.length
      });
    }
  }

  // Check for transactions in DB but not in JSON
  for (const [key, dbTxns] of dbMap.entries()) {
    if (!jsonMap.has(key)) {
      dbTxns.forEach(txn => {
        results.missingInJson.push({
          date: txn.transaction_date,
          description: txn.description,
          amount: txn.amount,
          currency: txn.original_currency,
          type: txn.transaction_type
        });
      });
    }
  }

  // Print results
  console.log(`📊 VERIFICATION RESULTS:`);
  console.log(`   JSON Transactions: ${results.jsonCount}`);
  console.log(`   DB Transactions: ${results.dbCount}`);
  console.log(`   ✅ Matched: ${results.matched}`);
  console.log(`   ❌ Missing in DB: ${results.missingInDb.length}`);
  console.log(`   ⚠️  Missing in JSON: ${results.missingInJson.length}`);
  console.log(`   ⚠️  Field Mismatches: ${results.fieldMismatches.length}`);
  console.log(`   ⚠️  Duplicate Issues: ${results.duplicates.length}`);

  if (results.missingInDb.length > 0) {
    console.log(`\n❌ TRANSACTIONS MISSING IN DATABASE:`);
    results.missingInDb.forEach((txn, idx) => {
      console.log(`   ${idx + 1}. ${txn.date} | ${txn.description.substring(0, 40)} | ${txn.amount} ${txn.currency}`);
    });
  }

  if (results.missingInJson.length > 0) {
    console.log(`\n⚠️  TRANSACTIONS IN DB BUT NOT IN JSON:`);
    results.missingInJson.forEach((txn, idx) => {
      console.log(`   ${idx + 1}. ${txn.date} | ${txn.description.substring(0, 40)} | ${txn.amount} ${txn.currency}`);
    });
  }

  if (results.fieldMismatches.length > 0) {
    console.log(`\n⚠️  FIELD-LEVEL MISMATCHES:`);
    results.fieldMismatches.slice(0, 10).forEach((txn, idx) => {
      console.log(`   ${idx + 1}. ${txn.date} | ${txn.description.substring(0, 40)}`);
      txn.mismatches.forEach(m => console.log(`      - ${m}`));
    });
    if (results.fieldMismatches.length > 10) {
      console.log(`   ... and ${results.fieldMismatches.length - 10} more`);
    }
  }

  if (results.duplicates.length > 0) {
    console.log(`\n⚠️  DUPLICATE COUNT MISMATCHES:`);
    results.duplicates.forEach((dup, idx) => {
      console.log(`   ${idx + 1}. ${dup.key}`);
      console.log(`      JSON: ${dup.jsonCount}, DB: ${dup.dbCount}`);
    });
  }

  return results;
}

async function generateFinalReport(allResults) {
  console.log(`\n\n${'='.repeat(70)}`);
  console.log(`📋 GATE 3: COMPREHENSIVE VERIFICATION SUMMARY`);
  console.log(`${'='.repeat(70)}\n`);

  let totalMatched = 0;
  let totalMissingInDb = 0;
  let totalMissingInJson = 0;
  let totalFieldMismatches = 0;
  let totalDuplicates = 0;

  for (const result of allResults) {
    totalMatched += result.matched;
    totalMissingInDb += result.missingInDb.length;
    totalMissingInJson += result.missingInJson.length;
    totalFieldMismatches += result.fieldMismatches.length;
    totalDuplicates += result.duplicates.length;

    const status = (result.missingInDb.length === 0 &&
                    result.missingInJson.length === 0 &&
                    result.matched === result.jsonCount)
                   ? '✅' : '❌';

    console.log(`${status} ${result.monthKey.toUpperCase()}:`);
    console.log(`   Matched: ${result.matched}/${result.jsonCount}`);
    if (result.missingInDb.length > 0) {
      console.log(`   Missing in DB: ${result.missingInDb.length}`);
    }
    if (result.missingInJson.length > 0) {
      console.log(`   Extra in DB: ${result.missingInJson.length}`);
    }
    if (result.fieldMismatches.length > 0) {
      console.log(`   Field Mismatches: ${result.fieldMismatches.length}`);
    }
    console.log();
  }

  console.log(`${'='.repeat(70)}`);
  console.log(`OVERALL VERIFICATION RESULTS:`);
  console.log(`   ✅ Total Matched: ${totalMatched}/367`);
  console.log(`   ❌ Total Missing in DB: ${totalMissingInDb}`);
  console.log(`   ⚠️  Total Extra in DB: ${totalMissingInJson}`);
  console.log(`   ⚠️  Total Field Mismatches: ${totalFieldMismatches}`);
  console.log(`   ⚠️  Total Duplicate Issues: ${totalDuplicates}`);
  console.log(`${'='.repeat(70)}\n`);

  const perfectMatch = (totalMatched === 367 &&
                        totalMissingInDb === 0 &&
                        totalMissingInJson === 0 &&
                        totalFieldMismatches === 0 &&
                        totalDuplicates === 0);

  if (perfectMatch) {
    console.log(`✅ 100% PERFECT MATCH CONFIRMED!`);
    console.log(`   All 367 transactions verified 1:1 between JSON and database.`);
    console.log(`   No discrepancies found.\n`);
    return true;
  } else {
    console.log(`⚠️  DISCREPANCIES FOUND`);
    console.log(`   Review the detailed output above for specific issues.\n`);
    return false;
  }
}

async function main() {
  try {
    console.log(`\n🔍 Gate 3: 100% Transaction-by-Transaction Verification`);
    console.log(`   Verifying all 367 transactions across 3 months\n`);

    const results = [];

    for (const monthConfig of MONTHS) {
      const result = await verifyMonth(monthConfig);
      results.push(result);
    }

    const success = await generateFinalReport(results);

    // Save detailed results to file
    const reportPath = `${BATCH_DIR}/GATE3-VERIFICATION-REPORT.json`;
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Detailed verification report saved to: ${reportPath}\n`);

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
