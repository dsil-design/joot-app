require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('MARCH 2025 - FINAL VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // 1. Transaction Count
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  console.log('1. TRANSACTION COUNT');
  console.log(`   Database: ${count}`);
  console.log(`   Expected: 253`);
  console.log(`   Status: ${count === 253 ? '✅ PASS' : '❌ FAIL'}\n`);

  // 2. Rent Transaction
  const { data: rent } = await supabase
    .from('transactions')
    .select('description, amount, original_currency')
    .eq('user_id', user.id)
    .eq('description', 'This Month\'s Rent')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .maybeSingle();

  console.log('2. RENT TRANSACTION');
  if (rent) {
    console.log(`   Amount: ${rent.original_currency} ${rent.amount}`);
    console.log(`   Expected: THB 35000`);
    console.log(`   Status: ${rent.amount === 35000 && rent.original_currency === 'THB' ? '✅ PASS' : '❌ FAIL'}\n`);
  } else {
    console.log('   ❌ NOT FOUND\n');
  }

  // 3. Tag Counts
  const { data: taggedTxns } = await supabase
    .from('transactions')
    .select(`
      id,
      transaction_tags (
        tags (name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  const tagCounts = {};
  taggedTxns.forEach(t => {
    if (t.transaction_tags) {
      t.transaction_tags.forEach(tt => {
        const name = tt.tags.name;
        tagCounts[name] = (tagCounts[name] || 0) + 1;
      });
    }
  });

  console.log('3. TAG DISTRIBUTION');
  console.log(`   Reimbursement: ${tagCounts['Reimbursement'] || 0} / 28 ${tagCounts['Reimbursement'] === 28 ? '✅' : '❌'}`);
  console.log(`   Florida House: ${tagCounts['Florida House'] || 0} / 4 ${tagCounts['Florida House'] === 4 ? '✅' : '❌'}`);
  console.log(`   Business Expense: ${tagCounts['Business Expense'] || 0} / 2 ${tagCounts['Business Expense'] === 2 ? '✅' : '❌'}\n`);

  // 4. Pest Control
  const { data: pestControl } = await supabase
    .from('transactions')
    .select(`
      description,
      amount,
      transaction_tags (
        tags (name)
      )
    `)
    .eq('user_id', user.id)
    .eq('description', 'Pest Control')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .maybeSingle();

  console.log('4. PEST CONTROL (User Correction)');
  if (pestControl) {
    const tags = pestControl.transaction_tags.map(tt => tt.tags.name);
    console.log(`   Tags: ${tags.join(', ')}`);
    console.log(`   Expected: Florida House`);
    console.log(`   Status: ${tags.includes('Florida House') ? '✅ PASS' : '❌ FAIL'}\n`);
  } else {
    console.log('   ❌ NOT FOUND\n');
  }

  // 5. Tax Payment
  const { data: taxPayment } = await supabase
    .from('transactions')
    .select('description, amount')
    .eq('user_id', user.id)
    .ilike('description', '%Federal Tax Return%')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .maybeSingle();

  console.log('5. TAX PAYMENT (Comma-Formatted)');
  if (taxPayment) {
    console.log(`   Amount: $${taxPayment.amount}`);
    console.log(`   Expected: $3490.02`);
    console.log(`   Status: ${taxPayment.amount === 3490.02 ? '✅ PASS' : '❌ FAIL'}\n`);
  } else {
    console.log('   ❌ NOT FOUND\n');
  }

  // 6. Currency Distribution
  const { count: usdCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('original_currency', 'USD')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  const { count: thbCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('original_currency', 'THB')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31');

  console.log('6. CURRENCY DISTRIBUTION');
  console.log(`   USD: ${usdCount} / 144 ${usdCount === 144 ? '✅' : '❌'}`);
  console.log(`   THB: ${thbCount} / 109 ${thbCount === 109 ? '✅' : '❌'}\n`);

  // Final Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const allPass = count === 253 &&
                  rent && rent.amount === 35000 &&
                  tagCounts['Reimbursement'] === 28 &&
                  tagCounts['Florida House'] === 4 &&
                  tagCounts['Business Expense'] === 2 &&
                  pestControl && pestControl.transaction_tags.some(tt => tt.tags.name === 'Florida House') &&
                  taxPayment && taxPayment.amount === 3490.02 &&
                  usdCount === 144 && thbCount === 109;

  if (allPass) {
    console.log('✅ ALL VERIFICATIONS PASSED');
    console.log('\nMarch 2025 import is COMPLETE and VERIFIED against PDF!');
  } else {
    console.log('❌ SOME VERIFICATIONS FAILED');
    console.log('\nPlease review the failures above.');
  }
}

verify().catch(console.error);
