#!/usr/bin/env node

/**
 * May 2024 Remaining Import - Just the 4 income transactions with Direct Deposit
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

const FAILED_DATES = ['2024-05-15', '2024-05-17', '2024-05-30', '2024-05-31'];

async function main() {
  console.log('🔧 Importing 4 remaining May 2024 transactions...\n');

  const transactions = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  const remaining = transactions.filter(t =>
    FAILED_DATES.includes(t.transaction_date) && t.transaction_type === 'income'
  );

  console.log(`Found ${remaining.length} transactions to import`);

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  for (const txn of remaining) {
    // Create vendor if needed
    let vendorId = null;
    if (txn.merchant) {
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
    }

    // Get or create payment method
    let paymentMethodId = null;
    const { data: pm } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('name', 'Direct Deposit')
      .eq('user_id', user.id)
      .single();

    if (pm) {
      paymentMethodId = pm.id;
    } else {
      const { data: maxSort } = await supabase
        .from('payment_methods')
        .select('sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const { data: newPM, error: pmError } = await supabase
        .from('payment_methods')
        .insert({
          name: 'Direct Deposit',
          user_id: user.id,
          sort_order: maxSort ? maxSort.sort_order + 1 : 0
        })
        .select('id')
        .single();

      if (pmError) {
        console.error('Payment method error:', pmError);
        continue;
      }
      paymentMethodId = newPM.id;
    }

    // Insert transaction
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description: txn.description,
        vendor_id: vendorId,
        payment_method_id: paymentMethodId,
        amount: txn.amount,
        original_currency: txn.currency,
        transaction_type: txn.transaction_type,
        transaction_date: txn.transaction_date
      });

    if (error) {
      console.error(`❌ ${txn.description}: ${error.message}`);
    } else {
      console.log(`✅ ${txn.description} (${txn.transaction_date})`);
    }
  }

  console.log('\n✅ Done!');
}

main();
