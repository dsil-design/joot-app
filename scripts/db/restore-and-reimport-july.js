#!/usr/bin/env node

/**
 * Restore from backup and re-import July 2025 with fixed vendor mapping
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const USER_EMAIL = 'dennis@dsil.design';
const BACKUP_FILE = 'backups/pre-clean-slate/backup-1761298172175.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function restoreBackup() {
  console.log('📥 Restoring from backup...\n');

  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  console.log(`Backup contains:`);
  console.log(`  - ${backup.transaction_count} transactions`);
  console.log(`  - ${backup.vendor_count} vendors`);
  console.log(`  - ${backup.payment_method_count} payment methods\n`);

  // Step 1: Delete current data
  console.log('🧹 Clearing current data...');

  await supabase
    .from('transaction_tags')
    .delete()
    .in('transaction_id', (await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
    ).data?.map(t => t.id) || []);

  await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id);

  await supabase
    .from('vendors')
    .delete()
    .eq('user_id', user.id);

  await supabase
    .from('payment_methods')
    .delete()
    .eq('user_id', user.id);

  console.log('✅ Current data cleared\n');

  // Step 2: Restore payment methods
  console.log('💳 Restoring payment methods...');
  const { data: restoredPMs, error: pmError } = await supabase
    .from('payment_methods')
    .insert(backup.payment_methods)
    .select();

  if (pmError) {
    console.error('Error:', pmError);
    throw pmError;
  }
  console.log(`✅ Restored ${restoredPMs.length} payment methods\n`);

  // Step 3: Restore vendors
  console.log('🏪 Restoring vendors...');
  const { data: restoredVendors, error: vendorError } = await supabase
    .from('vendors')
    .insert(backup.vendors)
    .select();

  if (vendorError) {
    console.error('Error:', vendorError);
    throw vendorError;
  }
  console.log(`✅ Restored ${restoredVendors.length} vendors\n`);

  // Step 4: Restore transactions
  console.log('📝 Restoring transactions...');
  const BATCH_SIZE = 500;
  const txnBatches = [];
  for (let i = 0; i < backup.transactions.length; i += BATCH_SIZE) {
    txnBatches.push(backup.transactions.slice(i, i + BATCH_SIZE));
  }

  let totalRestored = 0;
  for (let i = 0; i < txnBatches.length; i++) {
    const batch = txnBatches[i];
    const { data, error } = await supabase
      .from('transactions')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Batch ${i + 1} error:`, error);
      throw error;
    }

    totalRestored += data.length;
    console.log(`  Batch ${i + 1}/${txnBatches.length}: ${data.length} transactions`);
  }

  console.log(`✅ Restored ${totalRestored} transactions\n`);

  return user.id;
}

async function deleteJulyTransactions(userId) {
  console.log('🗑️  Deleting July 2025 transactions...\n');

  // Get July transactions
  const { data: julyTxns } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .gte('transaction_date', '2025-07-01')
    .lte('transaction_date', '2025-07-31');

  console.log(`Found ${julyTxns?.length || 0} July transactions to delete`);

  if (julyTxns && julyTxns.length > 0) {
    // Delete transaction_tags first
    await supabase
      .from('transaction_tags')
      .delete()
      .in('transaction_id', julyTxns.map(t => t.id));

    // Delete transactions
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .gte('transaction_date', '2025-07-01')
      .lte('transaction_date', '2025-07-31');

    if (error) {
      throw error;
    }

    console.log(`✅ Deleted ${julyTxns.length} July transactions\n`);
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔄 RESTORE AND RE-IMPORT JULY 2025');
  console.log('═'.repeat(60));
  console.log();

  const userId = await restoreBackup();
  await deleteJulyTransactions(userId);

  console.log('📥 Re-importing July 2025 with fixed vendor mapping...\n');
  console.log('Run: node scripts/db/import-month.js --file=scripts/july-2025-CORRECTED.json --month=2025-07');
  console.log();
  console.log('═'.repeat(60));
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
