require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTags() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

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
    .gte('transaction_date', '2025-02-01')
    .lte('transaction_date', '2025-02-28');

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

  console.log('\n✅ Tag Distribution:', JSON.stringify(tagCounts, null, 2));
  console.log(`\n📊 Total transactions with tags: ${totalWithTags}`);
  console.log(`📊 Expected: 22 (19 Reimbursement + 2 Florida House + 1 Business Expense)`);

  if (totalWithTags > 0) {
    console.log('\n✅ SUCCESS: Tags were applied!');
    
    // Verify expected counts
    const expectedTags = {
      'Reimbursement': 19,
      'Florida House': 2,
      'Business Expense': 1
    };
    
    let allCorrect = true;
    for (const [tag, expected] of Object.entries(expectedTags)) {
      const actual = tagCounts[tag] || 0;
      if (actual === expected) {
        console.log(`  ✅ ${tag}: ${actual} (expected ${expected})`);
      } else {
        console.log(`  ❌ ${tag}: ${actual} (expected ${expected})`);
        allCorrect = false;
      }
    }
    
    if (allCorrect) {
      console.log('\n✅ ALL TAG COUNTS MATCH EXPECTED VALUES!');
    } else {
      console.log('\n⚠️  Some tag counts do not match expectations');
    }
  } else {
    console.log('\n❌ FAILURE: NO TAGS APPLIED - Import script issue detected!');
    console.log('Need to delete February data and re-import with fixed script.');
  }
}

checkTags().catch(console.error);
