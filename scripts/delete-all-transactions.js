#!/usr/bin/env node

/**
 * Delete All Transactions Script
 * WARNING: This deletes ALL transactions for the specified user
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getUserId(email) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new Error(`User not found: ${email}`);
  }
  return user.id;
}

async function deleteAllTransactions(userId) {
  console.log('🗑️  Deleting all transactions...\n');

  // First, get count
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log(`   Found ${count} transactions to delete\n`);

  // Delete all at once (transaction_tags will cascade delete automatically)
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete transactions: ${error.message}`);
  }

  const deletedCount = count;

  console.log(`\n✅ Deleted ${deletedCount} transactions total\n`);
}

async function main() {
  console.log('⚠️  WARNING: DELETE ALL TRANSACTIONS');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log('This will permanently delete ALL transactions!');
  console.log('='.repeat(60));
  console.log('');

  try {
    const userId = await getUserId(USER_EMAIL);
    await deleteAllTransactions(userId);

    console.log('✅ Cleanup complete! Ready for re-import.\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
