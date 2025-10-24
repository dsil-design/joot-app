require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
  // Get user ID
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const userId = userData.id;

  // Get all June transactions
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('original_currency, amount')
    .eq('user_id', userId)
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01');

  const currencies = {};
  allTxs.forEach(tx => {
    const curr = tx.original_currency || 'NULL';
    if (!currencies[curr]) currencies[curr] = 0;
    currencies[curr]++;
  });

  console.log('Currency distribution:');
  console.log(currencies);

  // Check if original_amount column exists
  const { data: sample } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01')
    .limit(1);

  console.log('\nSample transaction columns:');
  if (sample && sample[0]) {
    console.log(Object.keys(sample[0]));
  }
}

inspect().catch(console.error);
