require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAugustReimbursements() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('AUGUST 2023 REIMBURSEMENT CHECK');
  console.log('========================================\n');

  // Query transactions with Reimbursement tag
  const { data: taggedTxns } = await supabase
    .from('transactions')
    .select(`
      id,
      transaction_date,
      description,
      amount,
      transaction_tags!inner(
        tags!inner(name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-08-01')
    .lte('transaction_date', '2023-08-31')
    .eq('transaction_tags.tags.name', 'Reimbursement');

  console.log(`Tagged transactions found: ${taggedTxns ? taggedTxns.length : 0}`);
  console.log();

  if (taggedTxns) {
    taggedTxns.forEach(txn => {
      console.log(`✅ ${txn.transaction_date}: ${txn.description} ($${txn.amount})`);
    });
  }

  console.log();
  console.log('Expected 2 reimbursements based on parsing metadata');
}

checkAugustReimbursements().catch(console.error);
