const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Check tables
  const tables = ['transaction_tags', 'tags'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (data && data[0]) {
      console.log(`${table}:`, Object.keys(data[0]));
    } else {
      console.log(`${table}: error or no data`);
    }
  }

  // Check for reimbursement tag
  const { data: tag } = await supabase.from('tags').select('*').ilike('name', '%reimbursement%');
  console.log('\nReimbursement tags:', tag);

  // Check a transaction with tags
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();
  const { data: txnWithTags } = await supabase
    .from('transactions')
    .select('*, transaction_tags(tag_id, tags(name))')
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-02-01')
    .lte('transaction_date', '2025-02-28')
    .limit(5);

  console.log('\nSample transaction with tags:', JSON.stringify(txnWithTags?.slice(0, 2), null, 2));
})();
