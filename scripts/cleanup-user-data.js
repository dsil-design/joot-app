#!/usr/bin/env node

/**
 * Cleanup script - Deletes all transaction data for a specific user
 * CAUTION: This is irreversible!
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
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

async function cleanupUserData(userId) {
  console.log(`🧹 Cleaning up data for user: ${USER_EMAIL}\n`);

  // Get current counts
  const { count: transactionCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: paymentMethodCount } = await supabase
    .from('payment_methods')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log(`📊 Current data:`);
  console.log(`   Transactions: ${transactionCount}`);
  console.log(`   Vendors: ${vendorCount}`);
  console.log(`   Payment Methods: ${paymentMethodCount}\n`);

  if (transactionCount === 0 && vendorCount === 0 && paymentMethodCount === 0) {
    console.log('✅ No data to clean up!');
    return;
  }

  // Delete transactions (cascade will delete transaction_tags)
  console.log('🗑️  Deleting transactions...');
  const { error: transactionError } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId);

  if (transactionError) {
    throw new Error(`Failed to delete transactions: ${transactionError.message}`);
  }
  console.log(`   ✅ Deleted ${transactionCount} transactions`);

  // Delete vendors
  console.log('🗑️  Deleting vendors...');
  const { error: vendorError } = await supabase
    .from('vendors')
    .delete()
    .eq('user_id', userId);

  if (vendorError) {
    throw new Error(`Failed to delete vendors: ${vendorError.message}`);
  }
  console.log(`   ✅ Deleted ${vendorCount} vendors`);

  // Delete payment methods
  console.log('🗑️  Deleting payment methods...');
  const { error: paymentError } = await supabase
    .from('payment_methods')
    .delete()
    .eq('user_id', userId);

  if (paymentError) {
    throw new Error(`Failed to delete payment methods: ${paymentError.message}`);
  }
  console.log(`   ✅ Deleted ${paymentMethodCount} payment methods`);

  console.log('\n🎉 Cleanup completed! Database is ready for fresh import.');
}

async function main() {
  try {
    const userId = await getUserId(USER_EMAIL);
    await cleanupUserData(userId);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

main();
