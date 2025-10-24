const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

// Exchange rates from PDFs (approximate averages)
const exchangeRates = {
  'June 2025': 32.50,
  'July 2025': 32.46,
  'August 2025': 32.50,
  'September 2025': 32.26
};

async function verifyMonthWithConversion(monthName, startDate, endDate, pdfExpenseTotal, pdfFLHouseTotal, pdfIncomeTotal) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate);

  if (error) {
    console.error(`Error:`, error);
    return;
  }

  const rate = exchangeRates[monthName];

  // Convert ALL amounts to USD
  const convertedData = data.map(t => ({
    ...t,
    amountUSD: t.original_currency === 'THB' ? parseFloat(t.amount) / rate : parseFloat(t.amount)
  }));

  const totalExpensesUSD = convertedData
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amountUSD, 0);

  const totalIncomeUSD = convertedData
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amountUSD, 0);

  const reimbursementIncomeUSD = convertedData
    .filter(t => t.transaction_type === 'income' && t.description.toLowerCase().includes('reimbursement'))
    .reduce((sum, t) => sum + t.amountUSD, 0);

  const nonReimbursementIncomeUSD = totalIncomeUSD - reimbursementIncomeUSD;

  const pdfExpenseTotal_Combined = pdfExpenseTotal + pdfFLHouseTotal;

  const expenseVariance = totalExpensesUSD - pdfExpenseTotal_Combined;
  const expenseVariancePercent = ((expenseVariance / pdfExpenseTotal_Combined) * 100).toFixed(2);

  const incomeVariance = nonReimbursementIncomeUSD - pdfIncomeTotal;
  const incomeVariancePercent = pdfIncomeTotal > 0 ? ((incomeVariance / pdfIncomeTotal) * 100).toFixed(2) : 'N/A';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${monthName.toUpperCase()}`);
  console.log(`${'='.repeat(70)}`);

  console.log(`\n📄 PDF TOTALS:`);
  console.log(`  Expense Tracker: $${pdfExpenseTotal.toFixed(2)}`);
  console.log(`  Florida House: $${pdfFLHouseTotal.toFixed(2)}`);
  console.log(`  Combined Expenses: $${pdfExpenseTotal_Combined.toFixed(2)}`);
  console.log(`  Gross Income: $${pdfIncomeTotal.toFixed(2)}`);

  console.log(`\n💾 DATABASE TOTALS (Converted to USD @ rate ${rate}):`);
  console.log(`  Total Transactions: ${data.length}`);
  console.log(`  Total Expenses: $${totalExpensesUSD.toFixed(2)}`);
  console.log(`  Total Income: $${totalIncomeUSD.toFixed(2)}`);
  console.log(`    - Reimbursements: $${reimbursementIncomeUSD.toFixed(2)}`);
  console.log(`    - Non-Reimbursement Income: $${nonReimbursementIncomeUSD.toFixed(2)}`);

  console.log(`\n📊 VARIANCE ANALYSIS:`);
  console.log(`  Expense Variance: $${expenseVariance.toFixed(2)} (${expenseVariancePercent}%)`);
  console.log(`  Income Variance: $${incomeVariance.toFixed(2)} (${incomeVariancePercent}%)`);

  const expensePassed = Math.abs(parseFloat(expenseVariancePercent)) <= 3;
  const incomePassed = pdfIncomeTotal === 0 || Math.abs(parseFloat(incomeVariancePercent)) <= 3;

  console.log(`  Expense Check: ${expensePassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Income Check: ${incomePassed ? '✅ PASS' : '❌ FAIL'}`);

  return {
    monthName,
    pdfExpenseTotal: pdfExpenseTotal_Combined,
    dbExpenseTotal: totalExpensesUSD,
    expenseVariance,
    expenseVariancePercent: parseFloat(expenseVariancePercent),
    pdfIncomeTotal,
    dbIncomeTotal: nonReimbursementIncomeUSD,
    incomeVariance,
    passed: expensePassed && incomePassed
  };
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('JUNE-SEPTEMBER 2025 PDF VERIFICATION (WITH CURRENCY CONVERSION)');
  console.log('='.repeat(70));

  const results = await Promise.all([
    verifyMonthWithConversion('June 2025', '2025-06-01', '2025-07-01', 6347.08, 344.28, 175.00),
    verifyMonthWithConversion('July 2025', '2025-07-01', '2025-08-01', 6972.97, 2609.64, 365.00),
    verifyMonthWithConversion('August 2025', '2025-08-01', '2025-09-01', 8025.57, 163.60, 175.00),
    verifyMonthWithConversion('September 2025', '2025-09-01', '2025-10-01', 6804.11, 367.74, 175.00)
  ]);

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY RESULTS');
  console.log('='.repeat(70));

  results.forEach(result => {
    if (result) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${result.monthName}: ${status}`);
      console.log(`  PDF Expenses: $${result.pdfExpenseTotal.toFixed(2)}`);
      console.log(`  DB Expenses: $${result.dbExpenseTotal.toFixed(2)}`);
      console.log(`  Expense Variance: $${result.expenseVariance.toFixed(2)} (${result.expenseVariancePercent}%)`);
    }
  });

  const allPassed = results.every(r => r && r.passed);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`OVERALL STATUS: ${allPassed ? '✅ ALL MONTHS PASS' : '⚠️ SOME VARIANCES DETECTED'}`);
  console.log(`${'='.repeat(70)}\n`);
}

main();
