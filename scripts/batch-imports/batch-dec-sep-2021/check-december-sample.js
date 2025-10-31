const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSample() {
  console.log('Checking sample December 2021 transactions...\n');

  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_date, description, merchant, amount, currency, transaction_type')
    .gte('transaction_date', '2021-12-01')
    .lte('transaction_date', '2021-12-31')
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .order('transaction_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} sample transactions:\n`);
  data.forEach((t, i) => {
    console.log(`${i + 1}. ${t.transaction_date} | ${t.merchant} | ${t.description} | ${t.currency} ${t.amount} | ${t.transaction_type}`);
  });

  // Check for Jatu specifically
  console.log('\n\nChecking for Jatu transactions...');
  const { data: jatu, error: jError } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', '2021-12-01')
    .lte('transaction_date', '2021-12-31')
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .ilike('merchant', '%jatu%');

  if (jError) {
    console.error('Error:', jError);
    return;
  }

  console.log(`Found ${jatu.length} Jatu transactions:`);
  jatu.forEach(t => {
    console.log(`   ${t.transaction_date} | ${t.description} | ${t.currency} ${t.amount}`);
  });

  // Check for Jordan
  console.log('\n\nChecking for Jordan transactions...');
  const { data: jordan, error: jordanError } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', '2021-12-01')
    .lte('transaction_date', '2021-12-31')
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .ilike('merchant', '%jordan%');

  if (jordanError) {
    console.error('Error:', jordanError);
    return;
  }

  console.log(`Found ${jordan.length} Jordan transactions:`);
  jordan.forEach(t => {
    console.log(`   ${t.transaction_date} | ${t.description} | ${t.currency} ${t.amount}`);
  });
}

checkSample();
