require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTags() {
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Count tags by type
  const { data: tags } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_tags (
        tags (name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  const tagCounts = {};
  let totalWithTags = 0;

  tags.forEach(t => {
    if (t.transaction_tags && t.transaction_tags.length > 0) {
      totalWithTags++;
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags.name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('✅ Tag Distribution:');
  console.log(JSON.stringify(tagCounts, null, 2));
  console.log(`\n📊 Total transactions with tags: ${totalWithTags}/253`);
  console.log(`📊 Expected: 34 (28 Reimbursement + 4 Florida House + 2 Business Expense)`);

  // Check Pest Control specifically
  const pestControl = tags.find(t => t.description === 'Pest Control');
  if (pestControl) {
    console.log('\n🏠 Pest Control tags:', pestControl.transaction_tags.map(tt => tt.tags.name));
  }

  if (totalWithTags === 34) {
    console.log('\n✅ SUCCESS: All tags applied correctly!');
  } else {
    console.log(`\n❌ WARNING: Expected 34 tagged transactions, found ${totalWithTags}`);
  }
}

checkTags().catch(console.error);
