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

  // Get THB transactions
  const { data: thbTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01')
    .eq('original_currency', 'THB')
    .limit(3);

  console.log('Sample THB transactions:');
  console.log(JSON.stringify(thbTxs, null, 2));

  // Get count
  const { data: allThb, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01')
    .eq('original_currency', 'THB');

  console.log(`\nTotal THB transactions: ${count || allThb.length}`);
}

inspect().catch(console.error);
