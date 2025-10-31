require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSeptember() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-09-01')
    .lte('transaction_date', '2021-09-30')
    .order('transaction_date');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} September 2021 transactions`);
  if (data.length > 0) {
    console.log('First 5:');
    data.slice(0, 5).forEach(t => {
      console.log(`  ${t.transaction_date} | ${t.description} | ${t.amount} ${t.original_currency}`);
    });
  }
}

checkSeptember();
