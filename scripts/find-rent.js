require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findRent() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('description, amount, currency, transaction_date')
    .eq('user_id', user.id)
    .eq('currency', 'THB')
    .eq('amount', 35000)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  console.log('Found rent transactions:', JSON.stringify(transactions, null, 2));
}

findRent();
