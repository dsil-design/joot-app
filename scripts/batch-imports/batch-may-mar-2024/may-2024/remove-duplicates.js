#!/usr/bin/env node

/**
 * Remove duplicate May 2024 transactions
 * Keeps the most recent copy, deletes the older one(s)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🧹 Removing duplicate May 2024 transactions...\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, description, transaction_date, amount, original_currency, created_at')
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-05-01')
    .lte('transaction_date', '2024-05-31')
    .order('transaction_date');

  // Group by description + date + amount
  const groups = {};
  transactions.forEach(t => {
    const key = `${t.description}|${t.transaction_date}|${t.amount}|${t.original_currency}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(t);
  });

  // Find and remove duplicates
  const duplicates = Object.entries(groups).filter(([key, txns]) => txns.length > 1);
  let deletedCount = 0;
  const idsToDelete = [];

  duplicates.forEach(([key, txns]) => {
    // Sort by created_at desc, keep the first (newest), delete the rest
    txns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const toDelete = txns.slice(1); // All except the first (newest)

    console.log(`${txns[0].description} (${txns[0].transaction_date})`);
    console.log(`  Keeping: ${txns[0].id} (created ${txns[0].created_at})`);
    toDelete.forEach(t => {
      console.log(`  Deleting: ${t.id} (created ${t.created_at})`);
      idsToDelete.push(t.id);
      deletedCount++;
    });
    console.log();
  });

  if (idsToDelete.length === 0) {
    console.log('✅ No duplicates to remove');
    return;
  }

  console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate transactions...\n`);

  // Delete in batches of 10
  for (let i = 0; i < idsToDelete.length; i += 10) {
    const batch = idsToDelete.slice(i, i + 10);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`Error deleting batch ${i / 10 + 1}:`, error);
    } else {
      console.log(`✅ Deleted batch ${i / 10 + 1} (${batch.length} transactions)`);
    }
  }

  console.log(`\n✅ Removed ${deletedCount} duplicate transactions`);
  console.log(`📊 Expected final count: ${transactions.length - deletedCount} (should be 89)\n`);
}

main();
