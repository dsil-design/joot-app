const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', '2025-01-01')
    .lte('transaction_date', '2025-01-31')
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Search for "Rent" in description
  const rents = data.filter(t => t.description.toLowerCase().includes('rent'));

  console.log('All transactions with "Rent" in description:');
  rents.forEach(t => {
    console.log(`${t.transaction_date}: "${t.description}" - ${t.amount} ${t.original_currency}`);
  });

  console.log('\n\nAll January transactions:');
  console.log('Total: ' + data.length);

  console.log('\n\nLargest transactions:');
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  sorted.slice(0, 10).forEach(t => {
    console.log(`${t.transaction_date}: "${t.description}" - ${t.amount} ${t.original_currency}`);
  });
}

main();
