require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyTotals() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('JANUARY 2023 PDF VERIFICATION');
  console.log('========================================\n');

  // Get expense tracker transactions (expenses only, not income from expense tracker)
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount, original_currency, transaction_type, metadata')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .eq('transaction_type', 'expense');

  // Calculate expense total (need to convert THB to USD, but we don't have exchange rates)
  let usdExpenses = 0;
  let thbExpenses = 0;
  let expenseCount = 0;

  if (expenses) {
    expenses.forEach(txn => {
      if (txn.metadata && txn.metadata.source === 'Expense Tracker') {
        expenseCount++;
        if (txn.original_currency === 'USD') {
          usdExpenses += txn.amount;
        } else if (txn.original_currency === 'THB') {
          thbExpenses += txn.amount;
        }
      }
    });
  }

  console.log('Expense Tracker:');
  console.log(`  Transaction count: ${expenseCount}`);
  console.log(`  USD expenses: $${usdExpenses.toFixed(2)}`);
  console.log(`  THB expenses: ${thbExpenses.toFixed(2)} THB`);
  console.log(`  NOTE: Cannot calculate total without exchange rates`);
  console.log(`  Expected from PDF: $3,244.62`);
  console.log();

  // Get income transactions
  const { data: income } = await supabase
    .from('transactions')
    .select('amount, original_currency')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .eq('transaction_type', 'income')
    .eq('original_currency', 'USD');

  let incomeTotal = 0;
  if (income) {
    income.forEach(txn => {
      incomeTotal += txn.amount;
    });
  }

  console.log('Gross Income:');
  console.log(`  Database total: $${incomeTotal.toFixed(2)}`);
  console.log(`  Expected from PDF: $7,219.97`);
  console.log(`  Variance: $${(incomeTotal - 7219.97).toFixed(2)}`);
  console.log();

  // Get all transactions count
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31');

  console.log('Total Transactions:');
  console.log(`  Database: ${totalCount}`);
  console.log(`  Expected: 155`);
  console.log(`  Match: ${totalCount === 155 ? '✅ YES' : '❌ NO'}`);
}

verifyTotals().catch(console.error);
