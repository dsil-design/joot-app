#!/usr/bin/env node

/**
 * Restore the 2 deleted reimbursement transactions
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';
const JSON_FILE = path.join(__dirname, 'may-2024-CORRECTED.json');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔧 Restoring 2 missing reimbursement transactions...\n');

  const transactions = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

  // Find the 3 reimbursement transactions
  const reimbursements = transactions.filter(t =>
    t.description === 'Reimbursement: Dinner' &&
    t.transaction_date === '2024-05-23' &&
    ['Craig', 'Liz', 'Ryan'].includes(t.merchant)
  );

  console.log(`Found ${reimbursements.length} reimbursement transactions in JSON\n`);

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  // Check which ones exist in DB
  const { data: existing } = await supabase
    .from('transactions')
    .select('id, vendor:vendors(name)')
    .eq('user_id', user.id)
    .eq('description', 'Reimbursement: Dinner')
    .eq('transaction_date', '2024-05-23');

  console.log(`Currently in database: ${existing.length}`);
  existing.forEach(e => console.log(`  - to ${e.vendor.name}`));

  const existingVendors = existing.map(e => e.vendor.name);
  const missing = reimbursements.filter(r => !existingVendors.includes(r.merchant));

  console.log(`\nMissing: ${missing.length}`);
  missing.forEach(m => console.log(`  - to ${m.merchant}`));

  if (missing.length === 0) {
    console.log('\n✅ All reimbursements already exist');
    return;
  }

  console.log('\n📥 Importing missing transactions...\n');

  for (const txn of missing) {
    // Get or create vendor
    let vendorId = null;
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('name', txn.merchant)
      .eq('user_id', user.id)
      .single();

    if (vendor) {
      vendorId = vendor.id;
    } else {
      const { data: newVendor } = await supabase
        .from('vendors')
        .insert({ name: txn.merchant, user_id: user.id })
        .select('id')
        .single();
      vendorId = newVendor.id;
    }

    // Get payment method
    const { data: pm } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('name', txn.payment_method)
      .eq('user_id', user.id)
      .single();

    // Insert transaction
    const { data: newTxn, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description: txn.description,
        vendor_id: vendorId,
        payment_method_id: pm.id,
        amount: txn.amount,
        original_currency: txn.currency,
        transaction_type: txn.transaction_type,
        transaction_date: txn.transaction_date
      })
      .select('id')
      .single();

    if (error) {
      console.error(`❌ ${txn.merchant}: ${error.message}`);
      continue;
    }

    // Add Reimbursement tag
    const { data: tag } = await supabase
      .from('tags')
      .select('id')
      .eq('name', 'Reimbursement')
      .eq('user_id', user.id)
      .single();

    if (tag) {
      await supabase
        .from('transaction_tags')
        .insert({
          transaction_id: newTxn.id,
          tag_id: tag.id
        });
    }

    console.log(`✅ ${txn.merchant}`);
  }

  console.log('\n✅ Done! May 2024 should now have 89 transactions.\n');
}

main();
