require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const startDate = '2024-08-01';
  const endDate = '2024-08-31';

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      currency,
      transaction_type,
      transaction_date,
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

  const tagCounts = {};
  transactions.forEach(t => {
    if (t.transaction_tags && t.transaction_tags.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags ? tt.tags.name : 'Unknown';
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('========================================');
  console.log('AUGUST 2024 TAG VERIFICATION');
  console.log('========================================');
  console.log('Total transactions:', transactions.length);
  console.log('Tagged transactions:', transactions.filter(t => t.transaction_tags && t.transaction_tags.length > 0).length);
  console.log('');
  console.log('Tag Distribution:');
  Object.entries(tagCounts).forEach(([tag, count]) => {
    console.log('  ' + tag + ': ' + count);
  });
  console.log('');

  const vndTransactions = transactions.filter(t => t.currency === 'VND');
  console.log('VND Transactions:', vndTransactions.length);
  if (vndTransactions.length > 0) {
    vndTransactions.forEach(t => {
      console.log('  ✅ ' + t.description + ' | ' + t.amount + ' ' + t.currency + ' | ' + t.transaction_date);
    });
  }
  console.log('');

  const rent = transactions.find(t => t.description.includes('Rent'));
  const pool = transactions.find(t => t.description === 'Pool');
  const floridaHouse = transactions.find(t => t.description === 'Florida House');
  const coffee = transactions.find(t => t.description === 'Coffee' && t.currency === 'VND');

  console.log('Critical Transactions:');
  console.log('  Rent:', rent ? 'Found (' + rent.amount + ' ' + rent.currency + ')' : 'NOT FOUND');
  console.log('  Pool:', pool ? 'Found (' + pool.amount + ' ' + pool.currency + ' ' + pool.transaction_type + ')' : 'NOT FOUND');
  console.log('  Florida House:', floridaHouse ? 'Found ($' + floridaHouse.amount + ')' : 'NOT FOUND');
  console.log('  VND Coffee:', coffee ? 'Found (VND ' + coffee.amount + ') ✅✅✅ FIRST VND EVER!' : 'NOT FOUND');

  console.log('');
  console.log('Currency Breakdown:');
  const currencyCount = {};
  transactions.forEach(t => {
    currencyCount[t.currency] = (currencyCount[t.currency] || 0) + 1;
  });
  Object.entries(currencyCount).forEach(([curr, count]) => {
    console.log('  ' + curr + ': ' + count + ' (' + ((count / transactions.length) * 100).toFixed(1) + '%)');
  });
  console.log('========================================');
})();
