require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      original_currency,
      transaction_date,
      transaction_type,
      vendors (name),
      transaction_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', '2024-07-01')
    .lte('transaction_date', '2024-07-31');

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  if (!transactions) {
    console.error('No transactions returned');
    return;
  }

  const tagCounts = {};
  transactions.forEach(t => {
    if (t.transaction_tags?.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags?.name || 'Unknown';
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('========================================');
  console.log('JULY 2024 TAG VERIFICATION');
  console.log('========================================');
  console.log('Tag Distribution:');
  Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
    console.log(`  ${tag}: ${count}`);
  });
  console.log('');
  console.log(`Total transactions: ${transactions.length}`);
  console.log(`Tagged transactions: ${transactions.filter(t => t.transaction_tags?.length > 0).length}`);

  // Check critical transactions
  console.log('\n========================================');
  console.log('CRITICAL TRANSACTION CHECKS');
  console.log('========================================');

  const rent = transactions.find(t => t.description && t.description.includes('Rent') && t.vendors?.name === 'Pol');
  console.log(`Rent: ${rent ? rent.amount + ' ' + rent.original_currency : 'NOT FOUND'}`);

  const reimbursements = transactions.filter(t =>
    t.transaction_tags?.some(tt => tt.tags?.name === 'Reimbursement')
  );
  console.log(`\nReimbursement transactions (${reimbursements.length}):`);
  reimbursements.forEach(r => {
    console.log(`  - ${r.description} (${r.vendors?.name}): $${r.amount}`);
  });

  const floridaHouse = transactions.filter(t =>
    t.transaction_tags?.some(tt => tt.tags?.name === 'Florida House')
  );
  console.log(`\nFlorida House transactions (${floridaHouse.length}):`);
  floridaHouse.forEach(f => {
    console.log(`  - ${f.description} (${f.vendors?.name}): $${f.amount} on ${f.transaction_date}`);
  });

  const savings = transactions.filter(t =>
    t.transaction_tags?.some(tt => tt.tags?.name === 'Savings/Investment')
  );
  console.log(`\nSavings/Investment transactions (${savings.length}):`);
  savings.forEach(s => {
    console.log(`  - ${s.description} (${s.vendors?.name}): $${s.amount}`);
  });

  console.log('\n========================================');
  console.log('VERIFICATION SUMMARY');
  console.log('========================================');
  console.log(`Expected tags: Reimbursement (2), Florida House (1), Savings/Investment (1)`);
  console.log(`Actual tags: Reimbursement (${tagCounts['Reimbursement'] || 0}), Florida House (${tagCounts['Florida House'] || 0}), Savings/Investment (${tagCounts['Savings/Investment'] || 0})`);
  console.log(`Status: ${tagCounts['Reimbursement'] === 2 && tagCounts['Florida House'] === 1 && tagCounts['Savings/Investment'] === 1 ? '✅ PASSED' : '⚠️ CHECK'}`);
})();
