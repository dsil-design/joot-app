require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function querySamples() {
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const userId = userData.id;

  // Get 5 USD samples
  const { data: usdSamples } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, original_amount, vendors(name)')
    .eq('user_id', userId)
    .eq('original_currency', 'USD')
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01')
    .order('transaction_date')
    .limit(5);

  // Get 5 THB samples
  const { data: thbSamples } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, original_amount, vendors(name)')
    .eq('user_id', userId)
    .eq('original_currency', 'THB')
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01')
    .order('transaction_date')
    .limit(5);

  console.log('\n=== USD TRANSACTION SAMPLES ===\n');
  if (usdSamples && usdSamples.length > 0) {
    usdSamples.forEach(tx => {
      console.log(`Date: ${tx.transaction_date}`);
      console.log(`Vendor: ${tx.vendors ? tx.vendors.name : 'N/A'}`);
      console.log(`Description: ${tx.description || 'N/A'}`);
      console.log(`Original: ${tx.original_amount} ${tx.original_currency}`);
      console.log(`Amount (USD): ${tx.amount}`);
      console.log('---');
    });
  } else {
    console.log('No USD transactions found');
  }

  console.log('\n=== THB TRANSACTION SAMPLES ===\n');
  if (thbSamples && thbSamples.length > 0) {
    thbSamples.forEach(tx => {
      console.log(`Date: ${tx.transaction_date}`);
      console.log(`Vendor: ${tx.vendors ? tx.vendors.name : 'N/A'}`);
      console.log(`Description: ${tx.description || 'N/A'}`);
      console.log(`Original: ${tx.original_amount} ${tx.original_currency}`);
      console.log(`Amount (USD): ${tx.amount}`);
      console.log(`Conversion: ${tx.original_amount} THB / ${(tx.original_amount / tx.amount).toFixed(4)} = $${tx.amount}`);
      console.log('---');
    });
  } else {
    console.log('No THB transactions found');
  }
}

querySamples().catch(console.error);
