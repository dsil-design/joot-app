require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTags() {
  // Get user ID
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const userId = userData.id;

  // Get all June transactions with tags
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01');

  console.log('Tag distribution:');
  const tagCounts = {};
  transactions.forEach(tx => {
    if (tx.transaction_tags && tx.transaction_tags.length > 0) {
      tx.transaction_tags.forEach(tagRelation => {
        const tag = tagRelation.tags;
        if (tag && tag.name) {
          if (!tagCounts[tag.name]) tagCounts[tag.name] = 0;
          tagCounts[tag.name]++;
        }
      });
    }
  });

  Object.keys(tagCounts).sort().forEach(tag => {
    console.log(`  ${tag}: ${tagCounts[tag]}`);
  });

  console.log('\nReimbursement transactions:');
  const reimbursementTxs = transactions.filter(tx =>
    tx.transaction_tags && tx.transaction_tags.some(tr => tr.tags && tr.tags.name === 'Reimbursement')
  );
  console.log(`Found ${reimbursementTxs.length} reimbursement transactions`);
  reimbursementTxs.forEach(tx => {
    console.log(`  - ${tx.transaction_date}: ${tx.description} ($${tx.amount})`);
  });

  console.log('\nFlorida House transactions:');
  const floridaTxs = transactions.filter(tx =>
    tx.transaction_tags && tx.transaction_tags.some(tr => tr.tags && tr.tags.name === 'Florida House')
  );
  console.log(`Found ${floridaTxs.length} Florida House transactions`);
  floridaTxs.forEach(tx => {
    console.log(`  - ${tx.transaction_date}: ${tx.description} ($${tx.amount})`);
  });

  // Check for partial matches
  console.log('\nTransactions containing "Reimbursement" in description:');
  const reimbursementDesc = transactions.filter(tx =>
    tx.description && tx.description.toLowerCase().includes('reimbursement')
  );
  console.log(`Found ${reimbursementDesc.length} transactions`);

  console.log('\nTransactions containing "Florida" in description:');
  const floridaDesc = transactions.filter(tx =>
    tx.description && tx.description.toLowerCase().includes('florida')
  );
  console.log(`Found ${floridaDesc.length} transactions`);
}

checkTags().catch(console.error);
