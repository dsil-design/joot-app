require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyze() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('JANUARY 2023 EXPENSE ANALYSIS');
  console.log('='.repeat(70));
  console.log('\nPDF GRAND TOTAL: $3,244.62\n');

  // Get all expenses
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount, original_currency, description')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .eq('transaction_type', 'expense');

  let usdExpenses = 0;
  let thbExpenses = 0;
  let usdCount = 0;
  let thbCount = 0;

  expenses.forEach(txn => {
    if (txn.original_currency === 'USD') {
      usdExpenses += txn.amount;
      usdCount++;
    } else if (txn.original_currency === 'THB') {
      thbExpenses += txn.amount;
      thbCount++;
    }
  });

  console.log('DATABASE BREAKDOWN:');
  console.log(`  USD expenses: $${usdExpenses.toFixed(2)} (${usdCount} transactions)`);
  console.log(`  THB expenses: ${thbExpenses.toFixed(2)} THB (${thbCount} transactions)`);
  console.log();

  // Check if USD-only matches PDF
  console.log('HYPOTHESIS 1: PDF only includes USD expenses (ignores THB)');
  console.log(`  Database USD total: $${usdExpenses.toFixed(2)}`);
  console.log(`  PDF total: $3,244.62`);
  console.log(`  Variance: $${(usdExpenses - 3244.62).toFixed(2)}`);
  console.log();

  // Check USD + refunds
  const refundAmount = 160.07;
  const adjustedUSD = usdExpenses - refundAmount;
  console.log('HYPOTHESIS 2: PDF = USD expenses - refunds (refunds were negative in PDF)');
  console.log(`  Database USD expenses: $${usdExpenses.toFixed(2)}`);
  console.log(`  Minus refunds: -$${refundAmount.toFixed(2)}`);
  console.log(`  Adjusted: $${adjustedUSD.toFixed(2)}`);
  console.log(`  PDF total: $3,244.62`);
  console.log(`  Variance: $${(adjustedUSD - 3244.62).toFixed(2)}`);
  console.log();

  // Check if THB is included with minimal conversion
  const thbConverted = thbExpenses * 0.03; // Using ~33 THB per USD
  console.log('HYPOTHESIS 3: PDF = USD + (THB with correct exchange rate)');
  console.log(`  USD: $${usdExpenses.toFixed(2)}`);
  console.log(`  THB converted at ~0.03 USD per THB: $${thbConverted.toFixed(2)}`);
  console.log(`  Total: $${(usdExpenses + thbConverted).toFixed(2)}`);
  console.log(`  Minus refunds: $${(usdExpenses + thbConverted - refundAmount).toFixed(2)}`);
  console.log(`  PDF total: $3,244.62`);
  console.log();

  // Try to work backwards from PDF
  console.log('WORKING BACKWARDS FROM PDF:');
  const pdfTotal = 3244.62;
  const possibleUSD = pdfTotal + refundAmount;
  console.log(`  If we add back refunds: $${pdfTotal} + $${refundAmount} = $${possibleUSD.toFixed(2)}`);
  console.log(`  Our USD expenses: $${usdExpenses.toFixed(2)}`);
  console.log(`  Difference: $${(usdExpenses - possibleUSD).toFixed(2)}`);
  console.log();

  const unaccountedFor = usdExpenses - possibleUSD;
  console.log(`  Unaccounted for: $${unaccountedFor.toFixed(2)}`);
  console.log(`  This is ${(unaccountedFor / possibleUSD * 100).toFixed(2)}% of expected`);
}

analyze().catch(console.error);
