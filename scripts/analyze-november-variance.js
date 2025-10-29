const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EXCHANGE_RATE = 0.0296;

(async () => {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, vendor:vendors(name), transaction_tags(tag:tags(name))')
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-11-01')
    .lte('transaction_date', '2024-11-30')
    .order('amount', { ascending: false });
  
  // List THB transactions specifically
  const thbTxns = transactions.filter(t => t.original_currency === 'THB');
  console.log('All THB transactions:');
  thbTxns.forEach(t => {
    const merchantName = t.vendor ? t.vendor.name : 'Unknown';
    const tagNames = t.transaction_tags ? t.transaction_tags.map(tt => tt.tag.name) : [];
    const usdAmount = t.amount * EXCHANGE_RATE;
    console.log(t.amount.toFixed(2) + ' THB = ' + usdAmount.toFixed(2) + ' USD | ' + t.description + ' | ' + merchantName + ' | Tags: ' + tagNames.join(', '));
  });
  
  const thbTotal = thbTxns.reduce((sum, t) => sum + (t.amount * EXCHANGE_RATE), 0);
  console.log('\nTotal THB in USD:', thbTotal.toFixed(2));
  
  // Check what parse report says for THB total
  console.log('\nParse report shows 6 THB transactions.');
  console.log('If PDF used different exchange rate, that could explain variance.');
})();
