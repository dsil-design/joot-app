require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTags() {
  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (!user) {
    console.log('User not found');
    return;
  }

  // Count transactions in March 2025
  const { data: txns, count: txnCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  console.log(`March 2025 transactions in database: ${txnCount}`);

  // Count tags applied to March 2025 transactions
  const { data: tags, count: tagCount } = await supabase
    .from('transaction_tags')
    .select('transaction_id, transactions!inner(transaction_date)', { count: 'exact' })
    .gte('transactions.transaction_date', '2025-03-01')
    .lte('transactions.transaction_date', '2025-03-31');

  console.log(`Tags applied to March 2025 transactions: ${tagCount}`);
  
  if (tagCount === 0 && txnCount > 0) {
    console.log('\n❌ CONFIRMED: Tag application FAILED for March 2025');
    console.log('   JSON had 34 tags, but database shows 0');
  } else {
    console.log(`\n✅ Tags were applied (${tagCount} tag relationships)`);
  }
}

checkTags().catch(console.error);
