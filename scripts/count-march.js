require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function count() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  console.log('March 2025 transactions in database:', count);

  if (count > 0) {
    const { data: sample } = await supabase
      .from('transactions')
      .select('description, amount, currency, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', '2025-03-01')
      .lte('transaction_date', '2025-03-31')
      .limit(5);

    console.log('\nSample transactions:', JSON.stringify(sample, null, 2));
  }
}

count();
