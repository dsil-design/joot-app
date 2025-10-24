#!/usr/bin/env node

/**
 * Cleanup Script for April 2025
 * Deletes all April 2025 transactions to allow clean re-import
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('🗑️  APRIL 2025 CLEANUP');
  console.log('==================================================');

  // Get user ID
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (userError || !users) {
    console.error('❌ Error finding user:', userError);
    process.exit(1);
  }

  const userId = users.id;
  console.log('👤 User ID:', userId);

  // Count existing April 2025 transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30');

  if (countError) {
    console.error('❌ Error counting transactions:', countError);
    process.exit(1);
  }

  console.log(`📊 Found ${count} transactions to delete`);

  if (count === 0) {
    console.log('✅ No transactions to delete - already clean');
    return;
  }

  // Get transaction IDs to delete
  const { data: transactionsToDelete, error: fetchError } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30');

  if (fetchError) {
    console.error('❌ Error fetching transaction IDs:', fetchError);
    process.exit(1);
  }

  const transactionIds = transactionsToDelete.map(t => t.id);

  // Delete transaction_tags first (foreign key constraint)
  if (transactionIds.length > 0) {
    const { error: tagsError } = await supabase
      .from('transaction_tags')
      .delete()
      .in('transaction_id', transactionIds);

    if (tagsError) {
      console.log('⚠️  Warning deleting tags:', tagsError.message);
    } else {
      console.log('✅ Deleted transaction tags');
    }
  }

  // Delete transactions
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30');

  if (deleteError) {
    console.error('❌ Error deleting transactions:', deleteError);
    process.exit(1);
  }

  console.log('✅ Successfully deleted all April 2025 transactions');
  console.log('==================================================');
  console.log('Ready for clean import!');
}

cleanup().catch(console.error);
