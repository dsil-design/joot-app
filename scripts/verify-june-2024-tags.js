#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const startDate = '2024-06-01';
  const endDate = '2024-06-30';

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_date,
      transaction_type,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('\n=== JUNE 2024 TAG VERIFICATION ===\n');

  const tagCounts = {};
  transactions.forEach(t => {
    if (t.transaction_tags?.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags?.name || 'Unknown';
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('Tag Distribution:');
  console.log(JSON.stringify(tagCounts, null, 2));
  console.log(`\nTotal transactions: ${transactions.length}`);
  console.log(`Tagged transactions: ${transactions.filter(t => t.transaction_tags?.length > 0).length}`);

  // Verify specific transactions
  console.log('\n=== CRITICAL TRANSACTION VERIFICATIONS ===\n');

  // 1. Verify Jordan reimbursement
  const jordan = transactions.find(t => t.description === 'Reimbursement for Dinner' && t.amount === 50);
  console.log('✓ Jordan Reimbursement ($50):',jordan ? `FOUND - type=${jordan.transaction_type}, tags=${jordan.transaction_tags?.map(t => t.tags.name).join(', ')}` : '❌ MISSING');

  // 2. Verify Kyle Martin reimbursement (typo)
  const kyle = transactions.find(t => t.description?.includes('Reimbusement: Lunch at Craig'));
  console.log('✓ Kyle Martin Reimbursement ($41):',kyle ? `FOUND - type=${kyle.transaction_type}, tags=${kyle.transaction_tags?.map(t => t.tags.name).join(', ')}` : '❌ MISSING');

  // 3. Verify rent is THB (should be ~25000, not ~740)
  const rent = transactions.find(t => t.description?.includes('This Month\'s Rent'));
  console.log('✓ Rent (should be THB 25,000):', rent ? `FOUND - amount=${rent.amount}` : '❌ MISSING');
  if (rent && rent.amount < 1000) {
    console.log('  ⚠️ WARNING: Rent amount is ${rent.amount} (too low - may be USD conversion error)');
  }

  // 4. Verify Planet Fitness
  const planet = transactions.find(t => t.description?.includes('Planet Fitness'));
  console.log('✓ Planet Fitness ($10):', planet ? `FOUND - amount=${planet.amount}` : '❌ MISSING');

  // Type distribution
  const expenses = transactions.filter(t => t.transaction_type === 'expense').length;
  const income = transactions.filter(t => t.transaction_type === 'income').length;
  console.log(`\n✓ Expenses: ${expenses}`);
  console.log(`✓ Income: ${income}`);

  console.log('\n=== VERIFICATION COMPLETE ===\n');
})();
