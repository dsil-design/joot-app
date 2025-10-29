require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function investigateVariance() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('INVESTIGATING INCOME VARIANCE');
  console.log('========================================\n');

  const months = [
    { name: 'January 2023', start: '2023-01-01', end: '2023-01-31', pdfIncome: 7219.97, dbIncome: 7380.04 },
    { name: 'February 2023', start: '2023-02-01', end: '2023-02-28', pdfIncome: 5949.48, dbIncome: 6022.48 }
  ];

  for (const month of months) {
    console.log(`\n${month.name}`);
    console.log('-'.repeat(50));
    console.log(`Expected (PDF): $${month.pdfIncome}`);
    console.log(`Actual (DB): $${month.dbIncome}`);
    console.log(`Variance: $${(month.dbIncome - month.pdfIncome).toFixed(2)}\n`);

    // Get ALL income transactions
    const { data: income } = await supabase
      .from('transactions')
      .select('transaction_date, description, amount, metadata')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .eq('transaction_type', 'income')
      .eq('original_currency', 'USD')
      .order('transaction_date');

    console.log('All income transactions:');
    let total = 0;
    if (income) {
      income.forEach(txn => {
        total += txn.amount;
        const source = txn.metadata?.source || 'Unknown';
        console.log(`  ${txn.transaction_date}: ${txn.description} - $${txn.amount.toFixed(2)} [${source}]`);
      });
    }
    console.log(`  Total: $${total.toFixed(2)}`);

    // Check for refunds/credits (negative amounts converted to income)
    const refunds = income?.filter(txn =>
      txn.description.toLowerCase().includes('refund') ||
      txn.description.toLowerCase().includes('reimbursement') ||
      txn.description.toLowerCase().includes('credit')
    ) || [];

    if (refunds.length > 0) {
      console.log(`\nRefunds/Credits converted from negative (${refunds.length} transactions):`);
      refunds.forEach(txn => {
        console.log(`  - ${txn.description}: $${txn.amount.toFixed(2)}`);
      });

      const refundTotal = refunds.reduce((sum, txn) => sum + txn.amount, 0);
      console.log(`  Refund total: $${refundTotal.toFixed(2)}`);

      const incomeWithoutRefunds = total - refundTotal;
      console.log(`\nIncome without refunds: $${incomeWithoutRefunds.toFixed(2)}`);
      console.log(`PDF income: $${month.pdfIncome}`);
      console.log(`Difference: $${(incomeWithoutRefunds - month.pdfIncome).toFixed(2)}`);
    }
  }
}

investigateVariance().catch(console.error);
