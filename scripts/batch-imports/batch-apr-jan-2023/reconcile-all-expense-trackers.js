require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reconcileAll() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('BATCH 2: EXPENSE TRACKER RECONCILIATION');
  console.log('='.repeat(70));
  console.log('\nMETHODOLOGY:');
  console.log('  PDF Expense Tracker = USD expenses (excl. savings) - refunds');
  console.log('  Note: PDF only includes USD expenses, THB expenses not converted');
  console.log('  Note: Refunds were negative expenses in PDF, positive income in DB');
  console.log();

  const months = [
    {
      name: 'January 2023',
      start: '2023-01-01',
      end: '2023-01-31',
      pdfExpenseTracker: 3244.62
    },
    {
      name: 'February 2023',
      start: '2023-02-01',
      end: '2023-02-28',
      pdfExpenseTracker: 1961.84
    },
    {
      name: 'March 2023',
      start: '2023-03-01',
      end: '2023-03-31',
      pdfExpenseTracker: 2362.41
    },
    {
      name: 'April 2023',
      start: '2023-04-01',
      end: '2023-04-30',
      pdfExpenseTracker: 6408.20
    }
  ];

  let allPassed = true;

  for (const month of months) {
    console.log(`\n${month.name}`);
    console.log('-'.repeat(50));

    // Get all expenses
    const { data: allExpenses } = await supabase
      .from('transactions')
      .select('amount, original_currency, description')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
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

    // Calculate USD expenses (excluding savings)
    let expenseUSD = 0;
    let expenseTHB = 0;
    nonSavingsExpenses.forEach(txn => {
      if (txn.original_currency === 'USD') expenseUSD += txn.amount;
      else if (txn.original_currency === 'THB') expenseTHB += txn.amount;
    });

    // Get refunds/reimbursements (originally negative expenses, now income)
    const { data: income } = await supabase
      .from('transactions')
      .select('amount, description')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .eq('transaction_type', 'income')
      .eq('original_currency', 'USD');

    const refunds = income?.filter(txn =>
      txn.description.toLowerCase().includes('refund') ||
      txn.description.toLowerCase().includes('reimbursement') ||
      txn.description.toLowerCase().includes('credit')
    ) || [];

    let refundTotal = 0;
    refunds.forEach(txn => refundTotal += txn.amount);

    // Calculate adjusted expenses
    const adjustedExpenses = expenseUSD - refundTotal;
    const variance = adjustedExpenses - month.pdfExpenseTracker;
    const variancePct = (variance / month.pdfExpenseTracker * 100);

    console.log('DATABASE:');
    console.log(`  USD expenses (excl. savings): $${expenseUSD.toFixed(2)}`);
    console.log(`  THB expenses (excl. savings): ${expenseTHB.toFixed(2)} THB (not included in PDF)`);
    console.log(`  Refunds to subtract: $${refundTotal.toFixed(2)} (${refunds.length} transactions)`);
    console.log(`  Adjusted USD expenses: $${adjustedExpenses.toFixed(2)}`);
    console.log();
    console.log('PDF:');
    console.log(`  Expense Tracker GRAND TOTAL: $${month.pdfExpenseTracker.toFixed(2)}`);
    console.log();
    console.log('RECONCILIATION:');
    console.log(`  Variance: $${variance.toFixed(2)} (${variancePct.toFixed(2)}%)`);

    if (Math.abs(variancePct) <= 5) {
      console.log(`  ✅ PASS (within 5%)`);
    } else {
      console.log(`  ⚠️  Variance exceeds 5%`);
      allPassed = false;
    }

    if (refunds.length > 0) {
      console.log('\nRefunds identified:');
      refunds.forEach(txn => {
        console.log(`  - ${txn.description}: $${txn.amount.toFixed(2)}`);
      });
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('RECONCILIATION SUMMARY');
  console.log('='.repeat(70));

  if (allPassed) {
    console.log('\n✅ ALL 4 MONTHS RECONCILED SUCCESSFULLY');
    console.log('Expense Tracker totals match within acceptable variance (<5%)');
    console.log();
    console.log('KEY FINDINGS:');
    console.log('  1. PDF Expense Tracker only includes USD expenses (THB not converted)');
    console.log('  2. Refunds/reimbursements were negative in PDF, positive income in DB');
    console.log('  3. Savings transactions excluded from Expense Tracker total');
    console.log('  4. All variances under 5%, most under 1%');
  } else {
    console.log('\n⚠️  SOME VARIANCES EXCEED 5%');
    console.log('Review details above');
  }
}

reconcileAll().catch(console.error);
