const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function verifyMonth(monthName, startDate, endDate, pdfExpenseTotal, pdfFLHouseTotal) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate);

  if (error) {
    console.error(`Error fetching ${monthName}:`, error);
    return;
  }

  // Calculate NET expenses (including negative reimbursements)
  const netExpenses = data
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Count positive and negative transactions
  const positiveExpenses = data
    .filter(t => t.transaction_type === 'expense' && parseFloat(t.amount || 0) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const negativeExpenses = data
    .filter(t => t.transaction_type === 'expense' && parseFloat(t.amount || 0) < 0)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const positiveCount = data.filter(t => t.transaction_type === 'expense' && parseFloat(t.amount || 0) > 0).length;
  const negativeCount = data.filter(t => t.transaction_type === 'expense' && parseFloat(t.amount || 0) < 0).length;

  const totalIncome = data
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const pdfTotal = pdfExpenseTotal + pdfFLHouseTotal;
  const variance = netExpenses - pdfTotal;
  const variancePercent = ((variance / pdfTotal) * 100).toFixed(2);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${monthName.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nPDF TOTALS:`);
  console.log(`  Expense Tracker: $${pdfExpenseTotal.toFixed(2)}`);
  console.log(`  Florida House: $${pdfFLHouseTotal.toFixed(2)}`);
  console.log(`  TOTAL: $${pdfTotal.toFixed(2)}`);

  console.log(`\nDATABASE TOTALS:`);
  console.log(`  Total Transactions: ${data.length}`);
  console.log(`  Positive Expenses: $${positiveExpenses.toFixed(2)} (${positiveCount} transactions)`);
  console.log(`  Negative Expenses: $${negativeExpenses.toFixed(2)} (${negativeCount} transactions)`);
  console.log(`  NET Expenses: $${netExpenses.toFixed(2)}`);
  console.log(`  Total Income: $${totalIncome.toFixed(2)}`);

  console.log(`\nCURRENCY BREAKDOWN:`);
  console.log(`  THB: ${data.filter(t => t.original_currency === 'THB').length}`);
  console.log(`  USD: ${data.filter(t => t.original_currency === 'USD').length}`);

  console.log(`\nVARIANCE ANALYSIS:`);
  console.log(`  Database - PDF: $${variance.toFixed(2)}`);
  console.log(`  Variance %: ${variancePercent}%`);
  console.log(`  Status: ${Math.abs(parseFloat(variancePercent)) <= 3 ? '✅ PASS' : '❌ FAIL'}`);

  // Sample transactions
  console.log(`\nSAMPLE TRANSACTIONS (First 3 and Last 3):`);
  const sortedData = data.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  [...sortedData.slice(0, 3), ...sortedData.slice(-3)].forEach(t => {
    console.log(`  ${t.transaction_date}: ${t.description} - $${t.amount} (${t.original_currency})`);
  });

  return {
    monthName,
    pdfTotal,
    dbTotal: netExpenses,
    variance,
    variancePercent: parseFloat(variancePercent),
    passed: Math.abs(parseFloat(variancePercent)) <= 3
  };
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('JUNE-SEPTEMBER 2025 RETROACTIVE PDF VERIFICATION');
  console.log('='.repeat(60));

  const results = await Promise.all([
    verifyMonth('June 2025', '2025-06-01', '2025-07-01', 6347.08, 344.28),
    verifyMonth('July 2025', '2025-07-01', '2025-08-01', 6972.97, 2609.64),
    verifyMonth('August 2025', '2025-08-01', '2025-09-01', 8025.57, 163.60),
    verifyMonth('September 2025', '2025-09-01', '2025-10-01', 6804.11, 367.74)
  ]);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  results.forEach(result => {
    if (result) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${result.monthName}: ${status}`);
      console.log(`  PDF: $${result.pdfTotal.toFixed(2)}`);
      console.log(`  DB: $${result.dbTotal.toFixed(2)}`);
      console.log(`  Variance: $${result.variance.toFixed(2)} (${result.variancePercent}%)`);
    }
  });

  const allPassed = results.every(r => r && r.passed);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`OVERALL STATUS: ${allPassed ? '✅ ALL MONTHS PASS' : '❌ SOME MONTHS FAIL'}`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
