require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkFeb() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-02-01')
    .lte('transaction_date', '2023-02-28');

  console.log(`February 2023 transactions in database: ${count}`);
  console.log(`Expected after fix: 180`);
  console.log(`Need to delete and re-import: ${count > 0 ? 'YES' : 'NO'}`);
}

checkFeb().catch(console.error);
