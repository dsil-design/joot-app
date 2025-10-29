require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  const { data, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .eq('transaction_type', 'income');

  console.log(`January Income Count: ${count}`);
  console.log(`Data length: ${data ? data.length : 0}`);

  if (data) {
    let total = 0;
    data.forEach(t => {
      console.log(`${t.transaction_date}: ${t.description} - $${t.amount} ${t.original_currency}`);
      if (t.original_currency === 'USD') total += t.amount;
    });
    console.log(`Total USD Income: $${total.toFixed(2)}`);
  }
}

check().catch(console.error);
