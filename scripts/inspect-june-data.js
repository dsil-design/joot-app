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

  // Get a few sample transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01')
    .limit(5);

  console.log('Sample transactions:');
  console.log(JSON.stringify(transactions, null, 2));
}

inspect().catch(console.error);
