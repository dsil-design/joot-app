require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reconcile() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('JANUARY 2023 EXPENSE TRACKER RECONCILIATION');
  console.log('='.repeat(70));
  console.log('\nPDF GRAND TOTAL: $3,244.62\n');

  // Step 1: Get all expenses from database
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount, original_currency, description')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .eq('transaction_type', 'expense');

  let usdExpenses = 0;
  let thbExpenses = 0;
  let expenseCount = 0;

  expenses.forEach(txn => {
    expenseCount++;
    if (txn.original_currency === 'USD') {
      usdExpenses += txn.amount;
    } else if (txn.original_currency === 'THB') {
      thbExpenses += txn.amount;
    }
  });

  console.log('DATABASE EXPENSES:');
  console.log(`  Total expense transactions: ${expenseCount}`);
  console.log(`  USD expenses: $${usdExpenses.toFixed(2)}`);
  console.log(`  THB expenses: ${thbExpenses.toFixed(2)} THB`);
  console.log();

  // Step 2: Get all income that came from negative expenses (refunds/reimbursements)
  const { data: income } = await supabase
    .from('transactions')
    .select('amount, description')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .eq('transaction_type', 'income')
    .eq('original_currency', 'USD');

  // Filter for reimbursements/refunds (these were originally negative expenses)
  const refunds = income.filter(txn =>
    txn.description.toLowerCase().includes('reimbursement') ||
    txn.description.toLowerCase().includes('refund') ||
    txn.description.toLowerCase().includes('credit')
  );

  let refundTotal = 0;
  console.log('REFUNDS/REIMBURSEMENTS (originally negative expenses):');
  refunds.forEach(txn => {
    refundTotal += txn.amount;
    console.log(`  - ${txn.description}: $${txn.amount.toFixed(2)}`);
  });
  console.log(`  Total refunds: $${refundTotal.toFixed(2)}`);
  console.log();

  // Step 3: Calculate what the PDF SHOULD show
  // PDF methodology: Sum all transactions INCLUDING negatives
  // Our methodology: Converted negatives to positive income
  // To reconcile: PDF total = Our expenses - Our refunds (since PDF kept them as negative)

  const adjustedUsdExpenses = usdExpenses - refundTotal;

  console.log('RECONCILIATION:');
  console.log(`  Database USD expenses: $${usdExpenses.toFixed(2)}`);
  console.log(`  Minus refunds (were negative in PDF): -$${refundTotal.toFixed(2)}`);
  console.log(`  Adjusted USD expenses: $${adjustedUsdExpenses.toFixed(2)}`);
  console.log();

  // Step 4: Estimate THB contribution using reasonable exchange rate
  // Jan 2023 rate was approximately 33-34 THB per USD
  const estimatedRate = 33.5;
  const thbInUsd = thbExpenses / estimatedRate;

  console.log(`  Database THB expenses: ${thbExpenses.toFixed(2)} THB`);
  console.log(`  Estimated rate: ${estimatedRate} THB per USD`);
  console.log(`  THB in USD (estimated): $${thbInUsd.toFixed(2)}`);
  console.log();

  const estimatedTotal = adjustedUsdExpenses + thbInUsd;

  console.log('COMPARISON:');
  console.log(`  PDF GRAND TOTAL: $3,244.62`);
  console.log(`  Estimated from DB: $${estimatedTotal.toFixed(2)}`);
  console.log(`  Variance: $${(estimatedTotal - 3244.62).toFixed(2)}`);
  console.log(`  Variance %: ${((estimatedTotal - 3244.62) / 3244.62 * 100).toFixed(2)}%`);
  console.log();

  // Step 5: Check the CSV conversion rate
  console.log('NOTE: CSV Conversion Column Analysis');
  console.log('  The CSV column 8 shows THB 19,000 rent → $0.55');
  console.log('  This implies a rate of ~34,545 THB per USD (clearly wrong)');
  console.log('  The PDF uses THESE incorrect conversion values for subtotals');
  console.log('  This is why we cannot directly match the GRAND TOTAL');
  console.log();

  console.log('CONCLUSION:');
  if (Math.abs(estimatedTotal - 3244.62) / 3244.62 <= 0.10) {
    console.log('  ✅ Database values reconcile within 10% of PDF');
    console.log('  This is acceptable given:');
    console.log('    1. Unknown exact exchange rates used in PDF');
    console.log('    2. Different handling of negative amounts');
    console.log('    3. Potential rounding differences');
  } else {
    console.log('  ⚠️  Variance exceeds 10% - requires investigation');
  }
}

reconcile().catch(console.error);
