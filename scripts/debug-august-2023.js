require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false }}
);

async function debug() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('User ID:', user.id);

  // Check transactions
  const { data: txns, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-08-01')
    .lte('transaction_date', '2023-08-31')
    .order('transaction_date', { ascending: true })
    .limit(10);

  console.log('\nFirst 10 transactions:');
  console.log('Error:', error);
  console.log('Count:', txns?.length);
  if (txns && txns.length > 0) {
    console.log('\nSample transaction:');
    console.log(JSON.stringify(txns[0], null, 2));

    // Check for rent
    const { data: allTxns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', '2023-08-01')
      .lte('transaction_date', '2023-08-31');

    const rents = allTxns.filter(t => t.description && t.description.toLowerCase().includes('rent'));
    console.log('\nRent transactions found:', rents.length);
    rents.forEach(r => {
      console.log(`- ${r.description}: ${r.amount} ${r.original_currency || r.currency}`);
    });

    // Check currency distribution
    const thb = allTxns.filter(t => (t.original_currency || t.currency) === 'THB').length;
    const usd = allTxns.filter(t => (t.original_currency || t.currency) === 'USD').length;
    console.log(`\nCurrency distribution: ${thb} THB, ${usd} USD`);
  }
}

debug().catch(console.error);
