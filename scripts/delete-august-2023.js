require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false }}
);

async function deleteAugust2023() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('Deleting August 2023 transactions...');

  const { error, count } = await supabase
    .from('transactions')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-08-01')
    .lte('transaction_date', '2023-08-31');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✅ Deleted ${count} transactions`);
  }
}

deleteAugust2023().catch(console.error);
