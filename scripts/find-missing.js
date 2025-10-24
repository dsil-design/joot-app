require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function find() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Find transactions with "rent" in description
  const { data: rentResults } = await supabase
    .from('transactions')
    .select('description, amount, original_currency, transaction_date')
    .eq('user_id', user.id)
    .ilike('description', '%rent%')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  console.log('Transactions with "rent":', JSON.stringify(rentResults, null, 2));

  // Find transactions with "tax" in description
  const { data: taxResults } = await supabase
    .from('transactions')
    .select('description, amount, original_currency, transaction_date')
    .eq('user_id', user.id)
    .ilike('description', '%tax%')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  console.log('\nTransactions with "tax":', JSON.stringify(taxResults, null, 2));
}

find();
