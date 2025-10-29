require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyTags() {
  console.log('GATE 3: TAG VERIFICATION');
  console.log('========================================\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  const months = [
    { name: 'August 2023', start: '2023-08-01', end: '2023-08-31', expectedReimbursement: 1, expectedSavings: 1 },
    { name: 'July 2023', start: '2023-07-01', end: '2023-07-31', expectedReimbursement: 2, expectedSavings: 1 },
    { name: 'June 2023', start: '2023-06-01', end: '2023-06-30', expectedReimbursement: 4, expectedSavings: 1 },
    { name: 'May 2023', start: '2023-05-01', end: '2023-05-31', expectedReimbursement: 5, expectedSavings: 1 }
  ];

  let totalReimbursement = 0;
  let totalSavings = 0;
  let expectedReimbursementTotal = 0;
  let expectedSavingsTotal = 0;

  for (const month of months) {
    console.log(`${month.name}:`);
    console.log('----------------------------');

    // Query Reimbursement tags through transactions
    const { data: reimbursementTxns } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        transaction_tags!inner(
          tags!inner(name)
        )
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .eq('transaction_tags.tags.name', 'Reimbursement');

    const reimbursementCount = reimbursementTxns?.length || 0;

    // Query Savings/Investment tags through transactions
    const { data: savingsTxns } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        transaction_tags!inner(
          tags!inner(name)
        )
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .eq('transaction_tags.tags.name', 'Savings/Investment');

    const savingsCount = savingsTxns?.length || 0;

    console.log(`  Reimbursement: ${reimbursementCount} (expected ${month.expectedReimbursement})`);
    console.log(`  Savings: ${savingsCount} (expected ${month.expectedSavings})`);

    if (reimbursementCount === month.expectedReimbursement) {
      console.log('  ✅ Reimbursement tags match');
    } else {
      console.log('  ⚠️  Reimbursement tag mismatch');
    }

    if (savingsCount === month.expectedSavings) {
      console.log('  ✅ Savings tags match');
    } else {
      console.log('  ⚠️  Savings tag mismatch');
    }

    console.log();

    totalReimbursement += reimbursementCount;
    totalSavings += savingsCount;
    expectedReimbursementTotal += month.expectedReimbursement;
    expectedSavingsTotal += month.expectedSavings;
  }

  console.log('========================================');
  console.log('TAG VERIFICATION SUMMARY');
  console.log('========================================\n');
  console.log(`Total Reimbursement tags: ${totalReimbursement} (expected ${expectedReimbursementTotal})`);
  console.log(`Total Savings tags: ${totalSavings} (expected ${expectedSavingsTotal})`);
  console.log();

  if (totalReimbursement === expectedReimbursementTotal && totalSavings === expectedSavingsTotal) {
    console.log('✅ ALL TAG VERIFICATIONS PASSED\n');
    return true;
  } else {
    console.log('⚠️  TAG VERIFICATION ISSUES DETECTED\n');
    return false;
  }
}

verifyTags().catch(console.error);
