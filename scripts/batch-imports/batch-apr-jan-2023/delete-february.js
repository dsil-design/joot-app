require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function deleteFeb() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('Deleting February 2023 transactions...');

  const { error, count } = await supabase
    .from('transactions')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-02-01')
    .lte('transaction_date', '2023-02-28');

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Deleted ${count} transactions`);
  }
}

deleteFeb().catch(console.error);
