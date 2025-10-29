require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigate() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('APRIL 2023 DETAILED INVESTIGATION');
  console.log('='.repeat(70));
  console.log('\nPDF Expense Tracker GRAND TOTAL: $6,408.20');
  console.log('Database adjusted total: $4,455.12');
  console.log('Missing: $1,953.08\n');

  // Get all USD expenses
  const { data: allExpenses } = await supabase
    .from('transactions')
    .select('transaction_date, amount, description')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-04-01')
    .lte('transaction_date', '2023-04-30')
    .eq('transaction_type', 'expense')
    .eq('original_currency', 'USD')
    .order('transaction_date');

  console.log('ALL USD EXPENSES IN DATABASE:');
  let total = 0;
  let savingsTotal = 0;
  allExpenses.forEach(txn => {
    const isSavings = txn.description.toLowerCase().includes('savings') ||
                     txn.description.toLowerCase().includes('save');
    if (isSavings) {
      console.log(`  ${txn.transaction_date}: [SAVINGS] ${txn.description} - $${txn.amount.toFixed(2)}`);
      savingsTotal += txn.amount;
    } else {
      console.log(`  ${txn.transaction_date}: ${txn.description} - $${txn.amount.toFixed(2)}`);
      total += txn.amount;
    }
  });

  console.log(`\nTotal USD expenses (excl. savings): $${total.toFixed(2)}`);
  console.log(`Savings: $${savingsTotal.toFixed(2)}`);
  console.log(`Combined: $${(total + savingsTotal).toFixed(2)}`);

  // Check if there might be THB transactions that should have been USD
  const { data: thbExpenses } = await supabase
    .from('transactions')
    .select('transaction_date, amount, description')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-04-01')
    .lte('transaction_date', '2023-04-30')
    .eq('transaction_type', 'expense')
    .eq('original_currency', 'THB')
    .order('amount', { ascending: false })
    .limit(10);

  console.log('\nLARGEST THB EXPENSES (top 10):');
  thbExpenses.forEach(txn => {
    const estimatedUSD = txn.amount / 33;
    console.log(`  ${txn.transaction_date}: ${txn.description} - ${txn.amount.toFixed(2)} THB (~$${estimatedUSD.toFixed(2)})`);
  });

  // Check the refunds
  const { data: income } = await supabase
    .from('transactions')
    .select('transaction_date, amount, description')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-04-01')
    .lte('transaction_date', '2023-04-30')
    .eq('transaction_type', 'income')
    .eq('original_currency', 'USD')
    .order('transaction_date');

  console.log('\nALL USD INCOME (including refunds):');
  income.forEach(txn => {
    console.log(`  ${txn.transaction_date}: ${txn.description} - $${txn.amount.toFixed(2)}`);
  });
}

investigate().catch(console.error);
