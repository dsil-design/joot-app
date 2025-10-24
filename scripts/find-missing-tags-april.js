#!/usr/bin/env node

/**
 * Find Missing Tags for April 2025
 * Identifies transactions that should have tags but don't
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

async function findMissingTags() {
  console.log('🔍 FINDING MISSING TAGS - APRIL 2025');
  console.log('==================================================\n');

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

  // Get Reimbursement tag ID
  const { data: reimbTag, error: reimbTagError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', 'Reimbursement')
    .eq('user_id', userId)
    .single();

  if (reimbTagError || !reimbTag) {
    console.error('❌ Error finding Reimbursement tag:', reimbTagError);
    process.exit(1);
  }

  const reimbursementTagId = reimbTag.id;
  console.log(`✓ Reimbursement Tag ID: ${reimbursementTagId}\n`);

  // Get Florida House tag ID
  const { data: floridaTag, error: floridaTagError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', 'Florida House')
    .eq('user_id', userId)
    .single();

  if (floridaTagError || !floridaTag) {
    console.error('❌ Error finding Florida House tag:', floridaTagError);
    process.exit(1);
  }

  const floridaHouseTagId = floridaTag.id;
  console.log(`✓ Florida House Tag ID: ${floridaHouseTagId}\n`);

  console.log('==================================================');
  console.log('PART 1: MISSING REIMBURSEMENT TAGS');
  console.log('==================================================\n');

  // Find all income transactions in April 2025 that start with "Reimbursement:"
  const { data: reimbTransactions, error: reimbError } = await supabase
    .from('transactions')
    .select('id, transaction_date, description, amount, original_currency, transaction_type')
    .eq('user_id', userId)
    .eq('transaction_type', 'income')
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30')
    .ilike('description', 'Reimbursement:%');

  if (reimbError) {
    console.error('❌ Error querying reimbursement transactions:', reimbError);
    process.exit(1);
  }

  console.log(`Found ${reimbTransactions.length} transactions with "Reimbursement:" in description\n`);

  // For each, check if it has the Reimbursement tag
  let missingReimbTags = [];

  for (const txn of reimbTransactions) {
    const { data: tags, error: tagError } = await supabase
      .from('transaction_tags')
      .select('tag_id')
      .eq('transaction_id', txn.id)
      .eq('tag_id', reimbursementTagId);

    if (tagError) {
      console.error('❌ Error checking tags:', tagError);
      continue;
    }

    if (!tags || tags.length === 0) {
      missingReimbTags.push(txn);
      console.log(`❌ MISSING TAG: ${txn.transaction_date} - ${txn.description} - ${txn.original_currency} ${txn.amount}`);
      console.log(`   Transaction ID: ${txn.id}\n`);
    } else {
      console.log(`✓ HAS TAG: ${txn.transaction_date} - ${txn.description}`);
    }
  }

  console.log(`\n📊 Summary: ${missingReimbTags.length} transactions missing Reimbursement tag\n`);

  console.log('==================================================');
  console.log('PART 2: MISSING FLORIDA HOUSE TAGS');
  console.log('==================================================\n');

  // According to parsing rules, Florida House transactions should come from the Florida House section
  // But we need to identify which ones are missing the tag
  // Let's look at the PDF to see what transactions should be tagged

  // Query all April expenses to see which might be Florida House
  const { data: allExpenses, error: expenseError } = await supabase
    .from('transactions')
    .select('id, transaction_date, description, amount, original_currency, vendor_id, payment_method_id')
    .eq('user_id', userId)
    .eq('transaction_type', 'expense')
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30');

  if (expenseError) {
    console.error('❌ Error querying expenses:', expenseError);
    process.exit(1);
  }

  // Get vendor and payment method info for better context
  let floridaHouseExpenses = [];

  for (const txn of allExpenses) {
    const { data: tags, error: tagError } = await supabase
      .from('transaction_tags')
      .select('tag_id')
      .eq('transaction_id', txn.id)
      .eq('tag_id', floridaHouseTagId);

    if (tagError) {
      console.error('❌ Error checking tags:', tagError);
      continue;
    }

    if (tags && tags.length > 0) {
      floridaHouseExpenses.push(txn);
      console.log(`✓ HAS FLORIDA TAG: ${txn.transaction_date} - ${txn.description} - ${txn.original_currency} ${txn.amount}`);
    }
  }

  console.log(`\n📊 Summary: ${floridaHouseExpenses.length} transactions have Florida House tag (expected: 5)\n`);

  // Known Florida House transactions from pre-flight (after duplicate removal):
  const expectedFloridaHouse = [
    'Electric',
    'Trash',
    'Water',
    'Xfinity Internet',
    'Lawncare'
  ];

  console.log('Expected Florida House transactions (from pre-flight):');
  expectedFloridaHouse.forEach(desc => console.log(`  - ${desc}`));
  console.log('');

  // Search for these in all expenses
  console.log('Searching for expected Florida House transactions...\n');

  for (const expectedDesc of expectedFloridaHouse) {
    const match = allExpenses.find(e => e.description.toLowerCase().includes(expectedDesc.toLowerCase()));

    if (match) {
      // Check if it has the tag
      const { data: tags } = await supabase
        .from('transaction_tags')
        .select('tag_id')
        .eq('transaction_id', match.id)
        .eq('tag_id', floridaHouseTagId);

      if (!tags || tags.length === 0) {
        console.log(`❌ MISSING FLORIDA TAG: ${match.transaction_date} - ${match.description} - ${match.original_currency} ${match.amount}`);
        console.log(`   Transaction ID: ${match.id}\n`);
      } else {
        console.log(`✓ Has tag: ${match.description}`);
      }
    } else {
      console.log(`⚠️ NOT FOUND: ${expectedDesc}`);
    }
  }

  console.log('\n==================================================');
  console.log('SUMMARY');
  console.log('==================================================\n');
  console.log(`Missing Reimbursement tags: ${missingReimbTags.length}`);
  console.log(`Florida House tags found: ${floridaHouseExpenses.length} (expected: 5)\n`);

  if (missingReimbTags.length > 0) {
    console.log('🔧 FIX COMMANDS FOR MISSING REIMBURSEMENT TAGS:\n');
    for (const txn of missingReimbTags) {
      console.log(`INSERT INTO transaction_tags (transaction_id, tag_id) VALUES ('${txn.id}', '${reimbursementTagId}');`);
    }
    console.log('');
  }
}

findMissingTags().catch(console.error);
