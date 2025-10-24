require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMapping() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('\n🔍 VERIFYING FEBRUARY 2025 TAG MAPPINGS:\n');

  // Get the expected tag IDs (created before February import)
  const expectedTags = {
    'Reimbursement': '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72',
    'Florida House': '178739fd-1712-4356-b21a-8936b6d0a461',
    'Business Expense': '973433bd-bf9f-469f-9b9f-20128def8726'
  };

  // Get February transactions with tags
  const { data: febTxns } = await supabase
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
    .gte('transaction_date', '2025-02-01')
    .lte('transaction_date', '2025-02-28');

  let correctMappings = 0;
  let incorrectMappings = 0;
  const tagMappings = {};

  febTxns.forEach(txn => {
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
          console.log(`❌ INCORRECT: "${txn.description}" (${txn.amount})`);
          console.log(`   Tag: "${tagName}"`);
          console.log(`   Expected ID: ${expectedId}`);
          console.log(`   Actual ID: ${tagId}`);
          console.log('');
        }
      });
    }
  });

  console.log('📊 TAG MAPPING SUMMARY:\n');
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
    }
    console.log('');
  }

  console.log(`\n📈 RESULTS:`);
  console.log(`   Correct mappings: ${correctMappings}`);
  console.log(`   Incorrect mappings: ${incorrectMappings}`);

  if (incorrectMappings === 0) {
    console.log('\n✅ SUCCESS: All February transactions correctly mapped to existing tags!');
    console.log('The "New Tags: 3" message was a reporting bug in the import script.');
  } else {
    console.log('\n❌ FAILURE: Some transactions mapped to wrong tag IDs!');
    console.log('Need to fix and remap.');
  }
}

verifyMapping().catch(console.error);
