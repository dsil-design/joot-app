require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTags() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (!user) {
    console.log('User not found');
    return;
  }

  // Count transactions in April 2025
  const { data: txns, count: txnCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-04-01')
    .lte('transaction_date', '2025-04-30');

  console.log(`April 2025 transactions in database: ${txnCount}`);

  // Count tags from JSON
  const fs = require('fs');
  const json = JSON.parse(fs.readFileSync('scripts/archive/monthly-imports/april-2025/april-2025-CORRECTED.json', 'utf8'));
  const jsonTagCount = json.filter(t => t.tags && t.tags.length > 0).length;
  console.log(`April 2025 JSON has transactions with tags: ${jsonTagCount}`);

  // Count tags applied in database
  const { data: tags, count: tagCount } = await supabase
    .from('transaction_tags')
    .select('transaction_id, transactions!inner(transaction_date)', { count: 'exact' })
    .gte('transactions.transaction_date', '2025-04-01')
    .lte('transactions.transaction_date', '2025-04-30');

  console.log(`Tags applied to April 2025 transactions: ${tagCount}`);

  if (tagCount === 0 && txnCount > 0) {
    console.log('\n❌ CONFIRMED: Tag application FAILED for April 2025');
  } else if (tagCount < jsonTagCount) {
    console.log(`\n⚠️  PARTIAL FAILURE: Expected ${jsonTagCount}, got ${tagCount} (${jsonTagCount - tagCount} missing)`);
  } else {
    console.log(`\n✅ Tags were applied correctly`);
  }
}

checkTags().catch(console.error);
