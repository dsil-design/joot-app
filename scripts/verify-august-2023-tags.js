require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyTags() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (!user) {
    console.log('User not found');
    return;
  }

  // Count transactions in August 2023
  const { count: txnCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-08-01')
    .lte('transaction_date', '2023-08-31');

  console.log(`\n✅ August 2023 transactions in database: ${txnCount}`);

  // Count tags applied in database
  const { count: tagCount } = await supabase
    .from('transaction_tags')
    .select('transaction_id, transactions!inner(transaction_date)', { count: 'exact', head: true })
    .gte('transactions.transaction_date', '2023-08-01')
    .lte('transactions.transaction_date', '2023-08-31');

  console.log(`✅ Tags applied to August 2023 transactions: ${tagCount}`);

  // Expected from JSON
  const expectedTags = 1; // 1 Reimbursement from parser output

  if (tagCount === 0 && expectedTags > 0) {
    console.log('\n❌ CRITICAL: Tag application FAILED');
    console.log(`   Expected: ${expectedTags} tags`);
    console.log(`   Actual: 0 tags`);
    console.log('   ACTION REQUIRED: Investigate import script');
  } else if (tagCount < expectedTags) {
    console.log(`\n⚠️  PARTIAL: Expected ${expectedTags}, got ${tagCount}`);
  } else {
    console.log(`\n✅ SUCCESS: All tags applied correctly!`);
  }
}

verifyTags().catch(console.error);
