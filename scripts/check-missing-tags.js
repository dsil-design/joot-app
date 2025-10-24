require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingTags() {
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

  console.log('Reimbursement transactions WITHOUT the Reimbursement tag:');
  const reimbursementDesc = transactions.filter(tx =>
    tx.description && tx.description.toLowerCase().includes('reimbursement')
  );

  const missingReimbursementTag = reimbursementDesc.filter(tx => {
    const hasTag = tx.transaction_tags && tx.transaction_tags.some(tr =>
      tr.tags && tr.tags.name === 'Reimbursement'
    );
    return !hasTag;
  });

  console.log(`Found ${missingReimbursementTag.length} transactions with "Reimbursement" in description but no tag:`);
  missingReimbursementTag.forEach(tx => {
    const tagNames = tx.transaction_tags
      ? tx.transaction_tags.map(tr => tr.tags ? tr.tags.name : 'null').join(', ')
      : 'none';
    console.log(`  - ${tx.transaction_date}: ${tx.description} ($${tx.amount}) [Tags: ${tagNames}]`);
  });

  console.log('\n---\n');
  console.log('Transactions with Florida-related descriptions:');
  const floridaLikeDesc = transactions.filter(tx => {
    const desc = (tx.description || '').toLowerCase();
    return desc.includes('florida') || desc.includes('fl ') ||
           (desc.includes('electricity') && !desc.includes('cnx')) ||
           (desc.includes('water') && !desc.includes('cnx')) ||
           (desc.includes('gas') && !desc.includes('station'));
  });

  console.log(`Found ${floridaLikeDesc.length} potential Florida House transactions:`);
  floridaLikeDesc.forEach(tx => {
    const hasTag = tx.transaction_tags && tx.transaction_tags.some(tr =>
      tr.tags && tr.tags.name === 'Florida House'
    );
    const tagNames = tx.transaction_tags
      ? tx.transaction_tags.map(tr => tr.tags ? tr.tags.name : 'null').join(', ')
      : 'none';
    console.log(`  - ${tx.transaction_date}: ${tx.description} ($${tx.amount}) [Has tag: ${hasTag ? 'YES' : 'NO'}] [Tags: ${tagNames}]`);
  });
}

checkMissingTags().catch(console.error);
