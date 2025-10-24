#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTags() {
  console.log('\n🔍 VERIFYING JANUARY 2025 TAG APPLICATION:\n');

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Get all January 2025 transactions with tags
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_type,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-01-01')
    .lte('transaction_date', '2025-01-31')
    .order('transaction_date', { ascending: true });

  console.log(`📊 Total January 2025 transactions: ${transactions.length}\n`);

  // Count tags
  const tagCounts = {};
  let totalWithTags = 0;
  let totalWithoutTags = 0;

  transactions.forEach(txn => {
    if (txn.transaction_tags && txn.transaction_tags.length > 0) {
      totalWithTags++;
      txn.transaction_tags.forEach(tt => {
        const tagName = tt.tags.name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    } else {
      totalWithoutTags++;
    }
  });

  console.log('✅ TAG DISTRIBUTION:');
  console.log(JSON.stringify(tagCounts, null, 2));
  console.log(`\n📊 Transactions with tags: ${totalWithTags}`);
  console.log(`📊 Transactions without tags: ${totalWithoutTags}`);

  // Expected from parse report
  const expected = {
    'Reimbursement': 15,
    'Business Expense': 3,
    'Florida House': 3
  };

  console.log('\n📋 EXPECTED vs ACTUAL:\n');
  let allMatch = true;
  for (const [tagName, expectedCount] of Object.entries(expected)) {
    const actualCount = tagCounts[tagName] || 0;
    const match = actualCount === expectedCount ? '✅' : '❌';
    console.log(`${match} ${tagName}: Expected ${expectedCount}, Got ${actualCount}`);
    if (actualCount !== expectedCount) allMatch = false;
  }

  if (allMatch && totalWithTags > 0) {
    console.log('\n✅ SUCCESS: All tags applied correctly!');
    return true;
  } else if (totalWithTags === 0) {
    console.log('\n❌ CRITICAL FAILURE: NO TAGS APPLIED!');
    console.log('This means the import script did not create transaction_tags relationships.');
    console.log('Need to investigate and re-import.');
    return false;
  } else {
    console.log('\n⚠️  WARNING: Tag counts do not match expected values!');
    console.log('Need to investigate discrepancies.');
    return false;
  }
}

checkTags()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
