require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyAllMonths() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('BATCH 2: COMPREHENSIVE PDF VERIFICATION');
  console.log('========================================\n');

  const months = [
    {
      name: 'January 2023',
      start: '2023-01-01',
      end: '2023-01-31',
      pdf: { expense: 3244.62, income: 7219.97, savings: 341.67 }
    },
    {
      name: 'February 2023',
      start: '2023-02-01',
      end: '2023-02-28',
      pdf: { expense: 1961.84, income: 5949.48, savings: 341.67 }
    },
    {
      name: 'March 2023',
      start: '2023-03-01',
      end: '2023-03-31',
      pdf: { expense: 2362.41, income: 6299.49, savings: 341.67 }
    },
    {
      name: 'April 2023',
      start: '2023-04-01',
      end: '2023-04-30',
      pdf: { expense: 6408.20, income: 6299.49, savings: 341.67 }
    }
  ];

  let allPassed = true;

  for (const month of months) {
    console.log(`\n${month.name}`);
    console.log('-'.repeat(50));

    // Get income total (should be straightforward - all USD)
    const { data: income } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .eq('transaction_type', 'income')
      .eq('original_currency', 'USD');

    let incomeTotal = 0;
    if (income) {
      income.forEach(txn => incomeTotal += txn.amount);
    }

    const incomeVariance = incomeTotal - month.pdf.income;
    const incomeVariancePct = (incomeVariance / month.pdf.income * 100).toFixed(2);

    console.log(`Gross Income:`);
    console.log(`  PDF:      $${month.pdf.income.toFixed(2)}`);
    console.log(`  Database: $${incomeTotal.toFixed(2)}`);
    console.log(`  Variance: $${incomeVariance.toFixed(2)} (${incomeVariancePct}%)`);

    if (Math.abs(incomeVariance) <= 5) {
      console.log(`  ✅ PASS (within $5)`);
    } else {
      console.log(`  ⚠️  Variance exceeds $5`);
      allPassed = false;
    }

    // Get savings total (should also be straightforward)
    const { data: savings } = await supabase
      .from('transactions')
      .select('amount, description')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .ilike('description', '%savings%')
      .eq('transaction_type', 'expense');

    let savingsTotal = 0;
    if (savings) {
      savings.forEach(txn => savingsTotal += txn.amount);
    }

    const savingsVariance = savingsTotal - month.pdf.savings;

    console.log(`\nPersonal Savings:`);
    console.log(`  PDF:      $${month.pdf.savings.toFixed(2)}`);
    console.log(`  Database: $${savingsTotal.toFixed(2)}`);
    console.log(`  Variance: $${savingsVariance.toFixed(2)}`);

    if (Math.abs(savingsVariance) <= 1) {
      console.log(`  ✅ PASS`);
    } else {
      console.log(`  ⚠️  Variance exceeds $1`);
      allPassed = false;
    }

    // Note about expenses
    console.log(`\nExpense Tracker:`);
    console.log(`  PDF:      $${month.pdf.expense.toFixed(2)}`);
    console.log(`  Note: Cannot verify directly - requires exchange rate conversion`);
    console.log(`        Database stores amounts in original currencies (THB/USD)`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(50));

  if (allPassed) {
    console.log('\n✅ ALL MONTHS VERIFIED AGAINST PDFs');
    console.log('Income and Savings totals match within acceptable variance');
  } else {
    console.log('\n⚠️  SOME VARIANCES DETECTED');
    console.log('Review details above');
  }
}

verifyAllMonths().catch(console.error);
