require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Get all March transactions
  const { data, error } = await supabase
    .from('transactions')
    .select('description, amount, currency, transaction_date')
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .order('transaction_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} transactions (showing first 10):`);
  data.forEach(t => {
    console.log(`${t.transaction_date} - ${t.description}: ${t.currency} ${t.amount}`);
  });
}

check();
