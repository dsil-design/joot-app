require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteOctober() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('Deleting October 2021 transactions (including typo date 2001-10-01)...');

  // Delete October 2021 transactions
  const { data: oct2021, error: err1 } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-10-01')
    .lte('transaction_date', '2021-10-31')
    .select();

  if (err1) console.error('Error deleting 2021-10:', err1);
  else console.log(`✓ Deleted ${oct2021.length} October 2021 transactions`);

  // Delete the typo transaction (2001-10-01)
  const { data: oct2001, error: err2 } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .eq('transaction_date', '2001-10-01')
    .select();

  if (err2) console.error('Error deleting 2001-10-01:', err2);
  else console.log(`✓ Deleted ${oct2001.length} typo date transactions (2001-10-01)`);

  console.log(`\nTotal deleted: ${(oct2021?.length || 0) + (oct2001?.length || 0)}`);
}

deleteOctober();
