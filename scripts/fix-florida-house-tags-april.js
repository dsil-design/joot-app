#!/usr/bin/env node

/**
 * Fix Florida House Tag Issues - April 2025
 * 1. Remove Florida House tag from CNX Water Bill (Chiang Mai, not Florida)
 * 2. Find and tag missing FPL Electricity Bill
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixFloridaHouseTags() {
  console.log('🔧 FIXING FLORIDA HOUSE TAGS - APRIL 2025');
  console.log('==================================================\n');

  const floridaHouseTagId = '178739fd-1712-4356-b21a-8936b6d0a461';
  const cnxWaterBillId = '1fafdc85-2c7f-4e28-9a10-b412998e4d67';

  // Step 1: Remove Florida House tag from CNX Water Bill
  console.log('Step 1: Removing Florida House tag from CNX Water Bill...\n');
  console.log('Transaction: CNX Water Bill (2025-04-14, THB 592.99)');
  console.log('Issue: This is Chiang Mai water, NOT Florida\n');

  const { error: removeError } = await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', cnxWaterBillId)
    .eq('tag_id', floridaHouseTagId);

  if (removeError) {
    console.error('❌ Error removing tag:', removeError.message);
  } else {
    console.log('✅ Removed Florida House tag from CNX Water Bill\n');
  }

  // Step 2: Find FPL Electricity Bill
  console.log('Step 2: Searching for missing FPL Electricity Bill...\n');

  // Get user ID
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const userId = users.id;

  // Search for FPL transactions in April 2025
  const { data: fplTransactions, error: searchError } = await supabase
    .from('transactions')
    .select('id, transaction_date, description, amount, original_currency')
    .eq('user_id', userId)
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30')
    .ilike('description', '%FPL%');

  if (searchError) {
    console.error('❌ Error searching for FPL:', searchError);
    return;
  }

  console.log(`Found ${fplTransactions.length} FPL transactions:\n`);

  for (const txn of fplTransactions) {
    // Check if it has Florida House tag
    const { data: tags } = await supabase
      .from('transaction_tags')
      .select('tag_id')
      .eq('transaction_id', txn.id)
      .eq('tag_id', floridaHouseTagId);

    const hasTag = tags && tags.length > 0;

    console.log(`${hasTag ? '✅' : '❌'} ${txn.transaction_date} - ${txn.description} - ${txn.original_currency} ${txn.amount}`);
    console.log(`   ID: ${txn.id}`);
    console.log(`   Florida Tag: ${hasTag ? 'YES' : 'NO'}\n`);

    // If this is the second FPL and doesn't have tag, add it
    if (!hasTag && txn.description.includes('Electricity')) {
      console.log(`   🔧 Adding Florida House tag to this transaction...\n`);

      const { error: addError } = await supabase
        .from('transaction_tags')
        .insert({
          transaction_id: txn.id,
          tag_id: floridaHouseTagId
        });

      if (addError) {
        console.error(`   ❌ Error adding tag: ${addError.message}\n`);
      } else {
        console.log(`   ✅ Added Florida House tag\n`);
      }
    }
  }

  console.log('==================================================');
  console.log('✅ FLORIDA HOUSE TAG FIX COMPLETE');
  console.log('==================================================\n');
  console.log('Changes made:');
  console.log('- Removed: CNX Water Bill tag (Chiang Mai, not Florida)');
  console.log('- Added: Missing FPL Electricity Bill tag (if found)');
  console.log('\nNext: Re-validate Florida House total');
}

fixFloridaHouseTags().catch(console.error);
