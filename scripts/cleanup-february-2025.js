require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('\n🧹 CLEANUP: Deleting February 2025 partial import...\n');

  // Get user ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (userError) {
    console.error('❌ Error finding user:', userError);
    return;
  }

  console.log(`👤 User ID: ${user.id}`);

  // Count transactions to delete
  const { data: toDelete, error: countError } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-02-01')
    .lte('transaction_date', '2025-02-28');

  if (countError) {
    console.error('❌ Error counting transactions:', countError);
    return;
  }

  console.log(`📊 Found ${toDelete.length} transactions to delete\n`);

  if (toDelete.length === 0) {
    console.log('✅ No transactions to delete');
    return;
  }

  // Delete transaction_tags first (foreign key constraint)
  console.log('🗑️  Deleting transaction_tags...');
  const { error: tagError } = await supabase
    .from('transaction_tags')
    .delete()
    .in('transaction_id', toDelete.map(t => t.id));

  if (tagError) {
    console.error('❌ Error deleting transaction_tags:', tagError);
    return;
  }

  console.log('✅ Transaction_tags deleted');

  // Delete transactions
  console.log('🗑️  Deleting transactions...');
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-02-01')
    .lte('transaction_date', '2025-02-28');

  if (deleteError) {
    console.error('❌ Error deleting transactions:', deleteError);
    return;
  }

  console.log(`✅ Deleted ${toDelete.length} transactions\n`);
  console.log('✅ Cleanup complete! Ready to re-import.\n');
}

cleanup().catch(console.error);
