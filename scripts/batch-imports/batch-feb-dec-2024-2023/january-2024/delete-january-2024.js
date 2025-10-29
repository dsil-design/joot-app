#!/usr/bin/env node

/**
 * Delete January 2024 Transactions
 * Removes all January 2024 transactions to allow re-import after parser fix
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
  console.log('🗑️  Deleting January 2024 Transactions\n');

  try {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', USER_EMAIL)
      .single();

    if (!user) {
      throw new Error(`User not found: ${USER_EMAIL}`);
    }

    console.log(`👤 User: ${USER_EMAIL}\n`);

    // Count transactions to delete
    const { data: transactions, error: countError } = await supabase
      .from('transactions')
      .select('id, description, transaction_date, amount, original_currency')
      .eq('user_id', user.id)
      .gte('transaction_date', '2024-01-01')
      .lte('transaction_date', '2024-01-31');

    if (countError) {
      throw new Error(`Failed to count transactions: ${countError.message}`);
    }

    console.log(`📊 Found ${transactions.length} transactions to delete\n`);

    if (transactions.length === 0) {
      console.log('✅ No transactions to delete\n');
      return;
    }

    // Show sample of what will be deleted
    console.log('Sample transactions (first 5):');
    transactions.slice(0, 5).forEach(t => {
      console.log(`  - ${t.transaction_date}: ${t.description} (${t.amount} ${t.original_currency})`);
    });
    console.log();

    // Delete transaction_tags first (foreign key constraint)
    console.log('🗑️  Deleting transaction tags...');
    const transactionIds = transactions.map(t => t.id);

    const { error: tagDeleteError } = await supabase
      .from('transaction_tags')
      .delete()
      .in('transaction_id', transactionIds);

    if (tagDeleteError) {
      console.warn(`⚠️  Warning deleting tags: ${tagDeleteError.message}`);
    } else {
      console.log('✅ Transaction tags deleted\n');
    }

    // Delete transactions
    console.log('🗑️  Deleting transactions...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
      .gte('transaction_date', '2024-01-01')
      .lte('transaction_date', '2024-01-31');

    if (deleteError) {
      throw new Error(`Failed to delete transactions: ${deleteError.message}`);
    }

    console.log('✅ Transactions deleted\n');

    // Verify deletion
    const { data: remaining } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .gte('transaction_date', '2024-01-01')
      .lte('transaction_date', '2024-01-31');

    console.log('='.repeat(60));
    if (remaining.length === 0) {
      console.log('✅ January 2024 Deletion Complete');
      console.log('='.repeat(60));
      console.log(`\n✅ Successfully deleted ${transactions.length} transactions`);
      console.log('✅ Verified: 0 transactions remaining\n');
      console.log('Ready to re-parse and re-import with fixed parser.\n');
    } else {
      console.log('⚠️  Warning: Some transactions remain');
      console.log('='.repeat(60));
      console.log(`\n⚠️  ${remaining.length} transactions still in database\n`);
    }

  } catch (error) {
    console.error('\n❌ Deletion failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
