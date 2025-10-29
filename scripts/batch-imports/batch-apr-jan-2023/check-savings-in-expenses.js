require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('CHECKING SAVINGS IN JANUARY 2023 EXPENSES');
  console.log('='.repeat(70));

  // Get all expenses
  const { data: allExpenses } = await supabase
    .from('transactions')
    .select('amount, original_currency, description')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .eq('transaction_type', 'expense');

  // Separate savings from other expenses
  const savings = allExpenses.filter(txn =>
    txn.description.toLowerCase().includes('savings') ||
    txn.description.toLowerCase().includes('save')
  );

  const nonSavingsExpenses = allExpenses.filter(txn =>
    !txn.description.toLowerCase().includes('savings') &&
    !txn.description.toLowerCase().includes('save')
  );

  console.log('\nSAVINGS TRANSACTIONS:');
  let savingsUSD = 0;
  let savingsTHB = 0;
  savings.forEach(txn => {
    console.log(`  ${txn.description}: ${txn.original_currency} ${txn.amount}`);
    if (txn.original_currency === 'USD') savingsUSD += txn.amount;
    else if (txn.original_currency === 'THB') savingsTHB += txn.amount;
  });
  console.log(`  Total USD savings: $${savingsUSD.toFixed(2)}`);
  console.log(`  Total THB savings: ${savingsTHB.toFixed(2)} THB`);

  console.log('\nNON-SAVINGS EXPENSES:');
  let expenseUSD = 0;
  let expenseTHB = 0;
  nonSavingsExpenses.forEach(txn => {
    if (txn.original_currency === 'USD') expenseUSD += txn.amount;
    else if (txn.original_currency === 'THB') expenseTHB += txn.amount;
  });
  console.log(`  USD expenses (excluding savings): $${expenseUSD.toFixed(2)} (${nonSavingsExpenses.filter(t => t.original_currency === 'USD').length} transactions)`);
  console.log(`  THB expenses (excluding savings): ${expenseTHB.toFixed(2)} THB (${nonSavingsExpenses.filter(t => t.original_currency === 'THB').length} transactions)`);

  console.log('\nCOMPARISON TO PDF:');
  console.log(`  PDF Expense Tracker GRAND TOTAL: $3,244.62`);
  console.log(`  PDF Personal Savings: $341.67`);
  console.log(`  PDF Combined (Expense + Savings): $${(3244.62 + 341.67).toFixed(2)}`);
  console.log();
  console.log(`  Database expenses (excl. savings): $${expenseUSD.toFixed(2)}`);
  console.log(`  Database savings: $${savingsUSD.toFixed(2)}`);
  console.log(`  Database combined: $${(expenseUSD + savingsUSD).toFixed(2)}`);
  console.log();

  // Account for refunds
  const refunds = 160.07;
  console.log('ADJUSTED FOR REFUNDS:');
  console.log(`  Database expenses (excl. savings): $${expenseUSD.toFixed(2)}`);
  console.log(`  Minus refunds (were negative in PDF): -$${refunds.toFixed(2)}`);
  console.log(`  Adjusted expenses: $${(expenseUSD - refunds).toFixed(2)}`);
  console.log(`  PDF Expense Tracker: $3,244.62`);
  console.log(`  Variance: $${(expenseUSD - refunds - 3244.62).toFixed(2)}`);
  console.log(`  Variance %: ${((expenseUSD - refunds - 3244.62) / 3244.62 * 100).toFixed(2)}%`);
}

check().catch(console.error);
