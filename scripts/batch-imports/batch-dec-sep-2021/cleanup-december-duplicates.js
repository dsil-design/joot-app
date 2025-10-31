require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupDecemberDuplicates() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('='.repeat(80));
  console.log('DECEMBER 2021 DUPLICATE CLEANUP');
  console.log('='.repeat(80));
  console.log();

  // Step 1: Check current count
  console.log('Step 1: Checking current December 2021 transaction count...');
  const { data: before, error: err1 } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-12-01')
    .lte('transaction_date', '2021-12-31');

  if (err1) {
    console.error('Error:', err1);
    return;
  }

  console.log(`  Current count: ${before.length} transactions`);
  console.log(`  Expected count: 144 transactions`);
  console.log(`  Duplicates to remove: ${before.length - 144}`);
  console.log();

  // Step 2: Delete all December 2021 transactions
  console.log('Step 2: Deleting all December 2021 transactions...');
  const { data: deleted, error: err2 } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-12-01')
    .lte('transaction_date', '2021-12-31')
    .select();

  if (err2) {
    console.error('Error:', err2);
    return;
  }

  console.log(`  ✅ Deleted ${deleted.length} transactions`);
  console.log();

  // Step 3: Re-import from verified JSON
  console.log('Step 3: Re-importing from december-2021-CORRECTED.json...');
  const fs = require('fs');
  const path = require('path');

  const jsonPath = path.join(__dirname, 'december-2021', 'december-2021-CORRECTED.json');
  const transactions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log(`  Loaded ${transactions.length} transactions from JSON`);

  // Get vendors and payment methods
  const { data: vendors } = await supabase.from('vendors').select('id, name');
  const { data: paymentMethods } = await supabase.from('payment_methods').select('id, name');

  const vendorMap = {};
  vendors.forEach(v => vendorMap[v.name.toLowerCase()] = v.id);

  const paymentMap = {};
  paymentMethods.forEach(p => paymentMap[p.name.toLowerCase()] = p.id);

  // Import transactions
  const toImport = transactions.map(t => ({
    user_id: user.id,
    transaction_date: t.transaction_date,
    description: t.description,
    amount: parseFloat(t.amount),
    original_currency: t.currency,
    transaction_type: t.transaction_type,
    vendor_id: vendorMap[t.merchant?.toLowerCase()] || null,
    payment_method_id: paymentMap[t.payment_method?.toLowerCase()] || null
  }));

  const { data: imported, error: err3 } = await supabase
    .from('transactions')
    .insert(toImport)
    .select();

  if (err3) {
    console.error('Error importing:', err3);
    return;
  }

  console.log(`  ✅ Imported ${imported.length} transactions`);
  console.log();

  // Step 4: Verify final count
  console.log('Step 4: Verifying final count...');
  const { data: after, error: err4 } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-12-01')
    .lte('transaction_date', '2021-12-31');

  if (err4) {
    console.error('Error:', err4);
    return;
  }

  console.log(`  Final count: ${after.length} transactions`);
  console.log(`  Expected: 144 transactions`);
  console.log(`  Status: ${after.length === 144 ? '✅ PERFECT MATCH' : '⚠️  COUNT MISMATCH'}`);
  console.log();

  console.log('='.repeat(80));
  console.log('CLEANUP COMPLETE');
  console.log('='.repeat(80));
}

cleanupDecemberDuplicates();
