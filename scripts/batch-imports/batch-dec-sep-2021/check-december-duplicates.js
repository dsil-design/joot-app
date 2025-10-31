require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDecember() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('Checking December transactions in database...\n');

  // Get all December transactions (any year) - using a broader date range
  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, created_at')
    .eq('user_id', user.id)
    .gte('transaction_date', '2020-12-01')
    .lte('transaction_date', '2021-12-31')
    .order('transaction_date');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by year
  const byYear = {};
  data.forEach(t => {
    const year = t.transaction_date.substring(0, 4);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(t);
  });

  console.log('December transactions by year:');
  Object.keys(byYear).sort().forEach(year => {
    console.log(`  ${year}: ${byYear[year].length} transactions`);
  });

  console.log('\nDecember 2021 sample (first 10):');
  const dec2021 = data.filter(t => t.transaction_date.startsWith('2021-12')).slice(0, 10);
  dec2021.forEach(t => {
    console.log(`  ${t.transaction_date} | ${t.description} | ${t.amount} ${t.original_currency}`);
  });
}

checkDecember();
