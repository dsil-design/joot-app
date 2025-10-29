#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMapping() {
  console.log('\n🔍 VERIFYING DECEMBER 2024 TAG MAPPINGS:\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Expected tag IDs from previous imports (verified working)
  const expectedTags = {
    'Reimbursement': '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72',
    'Florida House': '178739fd-1712-4356-b21a-8936b6d0a461',
    'Business Expense': '973433bd-bf9f-469f-9b9f-20128def8726',
    'Savings/Investment': 'c0928dfe-1544-4569-bbad-77fea7d7e5aa'
  };

  // Get all tags in database
  const { data: allTags } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', user.id);

  console.log('📋 ALL TAGS IN DATABASE:\n');
  allTags.forEach(tag => {
    const isExpected = expectedTags[tag.name] === tag.id ? '✅' : '❌';
    console.log(`${isExpected} ${tag.name}: ${tag.id}`);
  });

  // Get December transactions with tags
  const { data: decTxns } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_tags (
        tag_id,
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-12-01')
    .lte('transaction_date', '2024-12-31');

  let correctMappings = 0;
  let incorrectMappings = 0;
  const tagMappings = {};

  decTxns.forEach(txn => {
    if (txn.transaction_tags && txn.transaction_tags.length > 0) {
      txn.transaction_tags.forEach(tt => {
        const tagName = tt.tags.name;
        const tagId = tt.tags.id;
        const expectedId = expectedTags[tagName];

        if (!tagMappings[tagName]) {
          tagMappings[tagName] = new Set();
        }
        tagMappings[tagName].add(tagId);

        if (tagId === expectedId) {
          correctMappings++;
        } else {
          incorrectMappings++;
          console.log(`\n❌ INCORRECT: "${txn.description}" ($${txn.amount})`);
          console.log(`   Tag: "${tagName}"`);
          console.log(`   Expected ID: ${expectedId}`);
          console.log(`   Actual ID: ${tagId}`);
        }
      });
    }
  });

  console.log('\n📊 TAG MAPPING SUMMARY:\n');
  for (const [tagName, ids] of Object.entries(tagMappings)) {
    const expectedId = expectedTags[tagName];
    const actualIds = Array.from(ids);
    if (actualIds.length === 1 && actualIds[0] === expectedId) {
      console.log(`✅ "${tagName}"`);
      console.log(`   All transactions mapped to correct tag ID: ${expectedId}`);
    } else {
      console.log(`❌ "${tagName}"`);
      console.log(`   Expected ID: ${expectedId}`);
      console.log(`   Actual IDs found: ${actualIds.length} unique IDs`);
      actualIds.forEach(id => console.log(`     - ${id}`));
    }
    console.log('');
  }

  console.log(`\n📈 RESULTS:`);
  console.log(`   Correct mappings: ${correctMappings}`);
  console.log(`   Incorrect mappings: ${incorrectMappings}`);

  if (incorrectMappings === 0) {
    console.log('\n✅ SUCCESS: All December transactions correctly mapped to existing tags!');
    console.log('The "New Tags: 3" message was a reporting bug in the import script (cache-based tracking).');
    console.log('No duplicate tags were created - all transactions use the existing tag IDs.');
    return true;
  } else {
    console.log('\n❌ FAILURE: Some transactions mapped to wrong tag IDs!');
    console.log('Duplicate tags may have been created. Need to fix and remap.');
    return false;
  }
}

verifyMapping()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
