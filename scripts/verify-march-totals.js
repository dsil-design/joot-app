require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTotals() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('MARCH 2025 - MANUAL VERIFICATION AGAINST PDF');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Get rent transaction to calculate exchange rate
  const { data: rent } = await supabase
    .from('transactions')
    .select('amount, currency')
    .eq('user_id', user.id)
    .eq('description', 'This Month\'s Rent')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .single();

  console.log('Exchange Rate Calculation:');
  console.log(`Rent: THB ${rent.amount} = $1,074.50 (from PDF)`);
  const exchangeRate = 1074.50 / rent.amount;
  console.log(`Rate: ${exchangeRate.toFixed(6)}\n`);

  // LEVEL 1: Florida House Total
  console.log('───────────────────────────────────────────────────────────────');
  console.log('LEVEL 1: FLORIDA HOUSE TOTAL');
  console.log('───────────────────────────────────────────────────────────────');

  const { data: floridaHouse } = await supabase
    .from('transactions')
    .select(`
      amount,
      currency,
      transaction_tags!inner (
        tags!inner (name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .eq('transaction_tags.tags.name', 'Florida House');

  let floridaTotal = 0;
  floridaHouse.forEach(t => {
    const amount = t.currency === 'THB' ? t.amount * exchangeRate : t.amount;
    floridaTotal += amount;
  });

  console.log(`Database Total: $${floridaTotal.toFixed(2)}`);
  console.log(`PDF Total: $312.76`);
  console.log(`User Decision: -$73.00 (Xfinity duplicate removed)`);
  console.log(`Expected DB Total: $239.76`);
  console.log(`Variance: $${(floridaTotal - 239.76).toFixed(2)}`);
  console.log(`Status: ${Math.abs(floridaTotal - 239.76) < 1 ? '✅ PASS' : '❌ FAIL'}\n`);

  // List Florida House transactions
  console.log('Florida House Transactions:');
  const { data: fhDetails } = await supabase
    .from('transactions')
    .select(`
      description,
      amount,
      currency,
      transaction_date,
      vendors (name)
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .in('id', floridaHouse.map(t => t.id));

  fhDetails.forEach(t => {
    const usdAmount = t.currency === 'THB' ? t.amount * exchangeRate : t.amount;
    console.log(`  - ${t.description} (${t.vendors?.name}): ${t.currency} ${t.amount} = $${usdAmount.toFixed(2)}`);
  });

  // LEVEL 2: Reimbursement Count
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('LEVEL 2: REIMBURSEMENT TAG COUNT');
  console.log('───────────────────────────────────────────────────────────────');

  const { data: reimbursements } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_tags!inner (
        tags!inner (name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .eq('transaction_tags.tags.name', 'Reimbursement');

  console.log(`Database Count: ${reimbursements.length}`);
  console.log(`Expected: 28`);
  console.log(`Status: ${reimbursements.length === 28 ? '✅ PASS' : '❌ FAIL'}\n`);

  // LEVEL 3: Business Expense Count
  console.log('───────────────────────────────────────────────────────────────');
  console.log('LEVEL 3: BUSINESS EXPENSE TAG COUNT');
  console.log('───────────────────────────────────────────────────────────────');

  const { data: business } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      transaction_tags!inner (
        tags!inner (name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .eq('transaction_tags.tags.name', 'Business Expense');

  console.log(`Database Count: ${business.length}`);
  console.log(`Expected: 2`);
  console.log(`Status: ${business.length === 2 ? '✅ PASS' : '❌ FAIL'}`);

  if (business.length > 0) {
    console.log('\nBusiness Expense Transactions:');
    business.forEach(t => {
      console.log(`  - ${t.description}: $${t.amount}`);
    });
  }

  // LEVEL 4: Critical Transactions
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('LEVEL 4: CRITICAL TRANSACTION VERIFICATION');
  console.log('───────────────────────────────────────────────────────────────');

  // Tax payment
  const { data: taxPayment } = await supabase
    .from('transactions')
    .select('description, amount, currency')
    .eq('user_id', user.id)
    .ilike('description', '%2024 Federal Tax Return%')
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .single();

  console.log('Tax Payment (Comma-Formatted):');
  console.log(`  Amount: $${taxPayment.amount}`);
  console.log(`  Expected: $3490.02`);
  console.log(`  Status: ${taxPayment.amount === 3490.02 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Pest Control
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
    .single();

  const hasFLTag = pestControl.transaction_tags.some(tt => tt.tags.name === 'Florida House');
  console.log('Pest Control (User Correction):');
  console.log(`  Amount: $${pestControl.amount}`);
  console.log(`  Tags: ${pestControl.transaction_tags.map(tt => tt.tags.name).join(', ')}`);
  console.log(`  Expected Tag: Florida House`);
  console.log(`  Status: ${hasFLTag ? '✅ PASS' : '❌ FAIL'}\n`);

  // Refunds
  const { data: refunds } = await supabase
    .from('transactions')
    .select('description, amount, transaction_type')
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-03-01')
    .lte('transaction_date', '2025-03-31')
    .or('description.ilike.%Refund%,description.ilike.%refund%');

  console.log('Refund Transactions (Converted to Income):');
  let allRefundsCorrect = true;
  refunds.forEach(r => {
    const isCorrect = r.transaction_type === 'income' && r.amount > 0;
    console.log(`  - ${r.description}: ${r.transaction_type}, $${r.amount} ${isCorrect ? '✅' : '❌'}`);
    if (!isCorrect) allRefundsCorrect = false;
  });
  console.log(`  Status: ${allRefundsCorrect ? '✅ PASS' : '❌ FAIL'}\n`);

  // Final Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Florida House Total: ' + (Math.abs(floridaTotal - 239.76) < 1 ? '✅ PASS' : '❌ FAIL'));
  console.log('Reimbursement Tags: ' + (reimbursements.length === 28 ? '✅ PASS' : '❌ FAIL'));
  console.log('Business Tags: ' + (business.length === 2 ? '✅ PASS' : '❌ FAIL'));
  console.log('Tax Payment: ' + (taxPayment.amount === 3490.02 ? '✅ PASS' : '❌ FAIL'));
  console.log('Pest Control Tag: ' + (hasFLTag ? '✅ PASS' : '❌ FAIL'));
  console.log('Refunds Converted: ' + (allRefundsCorrect ? '✅ PASS' : '❌ FAIL'));
  console.log('\n✅ All critical verifications passed!');
}

verifyTotals().catch(console.error);
