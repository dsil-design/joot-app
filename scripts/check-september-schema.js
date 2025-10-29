const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Get one transaction to see structure
  const { data: sample, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', '2024-09-01')
    .lte('transaction_date', '2024-09-30')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample transactions with full schema:\n');
  sample.forEach((t, idx) => {
    console.log('Transaction ' + (idx + 1) + ':');
    console.log(JSON.stringify(t, null, 2));
    console.log('\n---\n');
  });
}

checkSchema();
