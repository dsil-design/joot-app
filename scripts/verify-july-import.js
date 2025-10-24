require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyImport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 JULY 2025 IMPORT VERIFICATION');
  console.log('='.repeat(80) + '\n');

  // Load parsed JSON
  const parsedData = JSON.parse(fs.readFileSync('scripts/july-2025-CORRECTED.json', 'utf8'));
  console.log(`📄 Parsed JSON contains: ${parsedData.length} transactions\n`);

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Get all July transactions from DB
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('id, transaction_date, description, amount, original_currency, transaction_type, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-07-01')
    .lte('transaction_date', '2025-07-31')
    .order('transaction_date')
    .order('description');

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  console.log(`💾 Database contains: ${dbTransactions.length} July transactions\n`);

  // === CHECK 1: Transaction Count ===
  console.log('✓ CHECK 1: Transaction Count');
  if (parsedData.length === dbTransactions.length) {
    console.log(`  ✅ PASS: Both have ${parsedData.length} transactions\n`);
  } else {
    console.log(`  ❌ FAIL: Parsed has ${parsedData.length}, DB has ${dbTransactions.length}\n`);
  }

  // === CHECK 2: Vendor Assignment Spot Check ===
  console.log('✓ CHECK 2: Vendor Assignment Spot Check\n');

  // Create a lookup map from parsed data
  const parsedMap = new Map();
  parsedData.forEach(t => {
    const key = `${t.date}|${t.description}|${t.amount}`;
    parsedMap.set(key, t);
  });

  // Sample transactions to verify
  const samplesToCheck = [
    { description: 'Work Email', date: '2025-07-01' },
    { description: 'Reimbursement: Rent', date: '2025-07-01' },
    { description: 'Wine', date: '2025-07-01' },
    { description: 'Rent', date: '2025-07-03' },
    { description: 'Flight: BKK-CNX', date: '2025-07-10' },
    { description: 'Groceries', date: '2025-07-02' },
    { description: 'Massage', date: '2025-07-01' },
    { description: 'Quarterly: HOA Fee', date: '2025-07-01' }
  ];

  let passCount = 0;
  let failCount = 0;

  samplesToCheck.forEach(sample => {
    const dbTxn = dbTransactions.find(t =>
      t.description === sample.description &&
      t.transaction_date === sample.date
    );

    if (!dbTxn) {
      console.log(`  ⚠️  Transaction not found in DB: ${sample.description} on ${sample.date}`);
      failCount++;
      return;
    }

    const key = `${sample.date}|${sample.description}|${dbTxn.amount}`;
    const parsedTxn = parsedMap.get(key);

    if (!parsedTxn) {
      console.log(`  ⚠️  Transaction not found in parsed JSON: ${sample.description} on ${sample.date}`);
      failCount++;
      return;
    }

    const dbVendor = dbTxn.vendors?.name || 'NULL';
    const parsedVendor = parsedTxn.vendor || 'NULL';

    if (dbVendor === parsedVendor) {
      const desc = sample.description.padEnd(30);
      console.log(`  ✅ ${desc} | Vendor: ${dbVendor}`);
      passCount++;
    } else {
      const desc = sample.description.padEnd(30);
      console.log(`  ❌ ${desc} | DB: ${dbVendor}, Parsed: ${parsedVendor}`);
      failCount++;
    }
  });

  console.log(`\n  Summary: ${passCount} passed, ${failCount} failed\n`);

  // === CHECK 3: Critical Transaction Values ===
  console.log('✓ CHECK 3: Critical Transaction Values\n');

  const rentTxn = dbTransactions.find(t => t.description === 'Rent' && t.transaction_date === '2025-07-03');
  const parsedRent = parsedData.find(t => t.description === 'Rent' && t.date === '2025-07-03');

  console.log(`  Rent Transaction (July 3):`);
  console.log(`    DB Amount: ${rentTxn?.amount} ${rentTxn?.original_currency}`);
  console.log(`    Parsed Amount: ${parsedRent?.amount} ${parsedRent?.currency}`);
  console.log(`    DB Vendor: ${rentTxn?.vendors?.name}`);
  console.log(`    Parsed Vendor: ${parsedRent?.vendor}`);

  if (rentTxn?.amount === parsedRent?.amount &&
      rentTxn?.original_currency === parsedRent?.currency &&
      rentTxn?.vendors?.name === parsedRent?.vendor) {
    console.log(`    ✅ MATCH\n`);
  } else {
    console.log(`    ❌ MISMATCH\n`);
  }

  // === CHECK 4: Vendor NULL Count ===
  console.log('✓ CHECK 4: Missing Vendors\n');

  const nullVendorCount = dbTransactions.filter(t => !t.vendors?.name).length;
  console.log(`  Transactions with NULL vendor: ${nullVendorCount}`);

  if (nullVendorCount === 0) {
    console.log(`  ✅ PASS: All transactions have vendors\n`);
  } else {
    console.log(`  ❌ FAIL: ${nullVendorCount} transactions missing vendors\n`);

    // Show examples
    const nullVendors = dbTransactions.filter(t => !t.vendors?.name).slice(0, 5);
    console.log(`  Examples:`);
    nullVendors.forEach(t => {
      console.log(`    - ${t.transaction_date} | ${t.description} | $${t.amount}`);
    });
    console.log();
  }

  // === CHECK 5: Amount and Currency Verification ===
  console.log('✓ CHECK 5: Amount and Currency Spot Check\n');

  let amountMatches = 0;
  let amountMismatches = 0;

  // Check first 10 transactions
  const sampleSize = 10;
  for (let i = 0; i < Math.min(sampleSize, dbTransactions.length); i++) {
    const dbTxn = dbTransactions[i];
    const key = `${dbTxn.transaction_date}|${dbTxn.description}|${dbTxn.amount}`;
    const parsedTxn = parsedMap.get(key);

    if (parsedTxn) {
      if (dbTxn.amount === parsedTxn.amount && dbTxn.original_currency === parsedTxn.currency) {
        amountMatches++;
      } else {
        console.log(`  ⚠️  Amount/Currency mismatch: ${dbTxn.description}`);
        console.log(`      DB: ${dbTxn.amount} ${dbTxn.original_currency}, Parsed: ${parsedTxn.amount} ${parsedTxn.currency}`);
        amountMismatches++;
      }
    }
  }

  console.log(`  Checked ${sampleSize} transactions:`);
  console.log(`    ✅ Matches: ${amountMatches}`);
  console.log(`    ❌ Mismatches: ${amountMismatches}\n`);

  // === CHECK 6: Transaction Type Distribution ===
  console.log('✓ CHECK 6: Transaction Type Distribution\n');

  const dbExpenseCount = dbTransactions.filter(t => t.transaction_type === 'expense').length;
  const dbIncomeCount = dbTransactions.filter(t => t.transaction_type === 'income').length;
  const parsedExpenseCount = parsedData.filter(t => t.transaction_type === 'expense').length;
  const parsedIncomeCount = parsedData.filter(t => t.transaction_type === 'income').length;

  console.log(`  Database: ${dbExpenseCount} expenses, ${dbIncomeCount} income`);
  console.log(`  Parsed: ${parsedExpenseCount} expenses, ${parsedIncomeCount} income`);

  if (dbExpenseCount === parsedExpenseCount && dbIncomeCount === parsedIncomeCount) {
    console.log(`  ✅ PASS: Transaction types match\n`);
  } else {
    console.log(`  ❌ FAIL: Transaction type counts don't match\n`);
  }

  // === FINAL SUMMARY ===
  console.log('='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total Transactions: ${dbTransactions.length} / ${parsedData.length} (DB / Parsed)`);
  console.log(`Transactions with Vendors: ${dbTransactions.length - nullVendorCount} / ${dbTransactions.length}`);
  console.log(`Vendor Spot Checks: ${passCount} / ${samplesToCheck.length} passed`);
  console.log(`Amount/Currency Checks: ${amountMatches} / ${sampleSize} matched`);
  console.log('');

  const allPassed =
    parsedData.length === dbTransactions.length &&
    nullVendorCount === 0 &&
    failCount === 0 &&
    amountMismatches === 0 &&
    dbExpenseCount === parsedExpenseCount &&
    dbIncomeCount === parsedIncomeCount;

  if (allPassed) {
    console.log('✅ OVERALL RESULT: PASS - Import verified successfully!');
  } else {
    console.log('⚠️  OVERALL RESULT: REVIEW NEEDED - Some checks failed');
  }
  console.log('='.repeat(80) + '\n');
}

verifyImport().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
