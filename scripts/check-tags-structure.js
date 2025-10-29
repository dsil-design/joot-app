const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTags() {
  console.log('Checking for tags table...\n');

  // Try to query transaction_tags table
  const { data: transactionTags, error: tagsError } = await supabase
    .from('transaction_tags')
    .select('*')
    .limit(10);

  if (tagsError) {
    console.log('transaction_tags table error:', tagsError.message);
  } else {
    console.log('Found transaction_tags table with ' + (transactionTags ? transactionTags.length : 0) + ' sample records:\n');
    if (transactionTags && transactionTags.length > 0) {
      transactionTags.forEach((t, idx) => {
        console.log('Record ' + (idx + 1) + ':', JSON.stringify(t, null, 2));
      });
    }
  }

  console.log('\n---\n');

  // Check for tags table
  const { data: tags, error: tagListError } = await supabase
    .from('tags')
    .select('*')
    .limit(10);

  if (tagListError) {
    console.log('tags table error:', tagListError.message);
  } else {
    console.log('Found tags table with ' + (tags ? tags.length : 0) + ' records:\n');
    if (tags && tags.length > 0) {
      tags.forEach((t, idx) => {
        console.log('Tag ' + (idx + 1) + ':', JSON.stringify(t, null, 2));
      });
    }
  }

  console.log('\n---\n');

  // Try transactions with relationships
  const { data: txWithRelations, error: relError } = await supabase
    .from('transactions')
    .select('*, transaction_tags(tag_id, tags(name))')
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', '2024-09-01')
    .lte('transaction_date', '2024-09-30')
    .limit(10);

  if (relError) {
    console.log('Relationship query error:', relError.message);
  } else {
    console.log('Transactions with related tags:\n');
    if (txWithRelations && txWithRelations.length > 0) {
      txWithRelations.slice(0, 3).forEach((t, idx) => {
        console.log('Transaction ' + (idx + 1) + ':');
        console.log('  Description: ' + t.description);
        console.log('  Tags: ' + (t.transaction_tags && t.transaction_tags.length > 0 ? JSON.stringify(t.transaction_tags) : 'none'));
      });
    }
  }
}

checkTags();
