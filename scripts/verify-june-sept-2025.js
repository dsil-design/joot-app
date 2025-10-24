const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function verifyMonth(monthName, startDate, endDate) {
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

  const totalTransactions = data.length;
  const totalExpenses = data
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalIncome = data
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const thbCount = data.filter(t => t.original_currency === 'THB').length;
  const usdCount = data.filter(t => t.original_currency === 'USD').length;
  const reimbursementCount = data.filter(t => parseFloat(t.amount || 0) < 0).length;

  console.log(`\n=== ${monthName} ===`);
  console.log(`Total Transactions: ${totalTransactions}`);
  console.log(`Total Expenses: $${totalExpenses.toFixed(2)}`);
  console.log(`Total Income: $${totalIncome.toFixed(2)}`);
  console.log(`THB Transactions: ${thbCount}`);
  console.log(`USD Transactions: ${usdCount}`);
  console.log(`Reimbursements: ${reimbursementCount}`);

  return {
    monthName,
    totalTransactions,
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    totalIncome: parseFloat(totalIncome.toFixed(2)),
    thbCount,
    usdCount,
    reimbursementCount
  };
}

async function main() {
  console.log('Verifying June-September 2025 Imports...\n');

  const results = await Promise.all([
    verifyMonth('June 2025', '2025-06-01', '2025-07-01'),
    verifyMonth('July 2025', '2025-07-01', '2025-08-01'),
    verifyMonth('August 2025', '2025-08-01', '2025-09-01'),
    verifyMonth('September 2025', '2025-09-01', '2025-10-01')
  ]);

  console.log('\n=== PDF GRAND TOTALS ===');
  console.log('June 2025: $6,347.08 (Expense Tracker) + $344.28 (FL House) = $6,691.36 Total');
  console.log('July 2025: $6,972.97 (Expense Tracker) + $2,609.64 (FL House) = $9,582.61 Total');
  console.log('August 2025: $8,025.57 (Expense Tracker) + $163.60 (FL House) = $8,189.17 Total');
  console.log('September 2025: $6,804.11 (Expense Tracker) + $367.74 (FL House) = $7,171.85 Total');

  console.log('\n=== COMPARISON ===');
  const pdfTotals = {
    'June 2025': 6691.36,
    'July 2025': 9582.61,
    'August 2025': 8189.17,
    'September 2025': 7171.85
  };

  results.forEach(result => {
    if (result) {
      const pdfTotal = pdfTotals[result.monthName];
      const dbTotal = result.totalExpenses;
      const variance = dbTotal - pdfTotal;
      const variancePercent = ((variance / pdfTotal) * 100).toFixed(2);

      console.log(`\n${result.monthName}:`);
      console.log(`  PDF Total: $${pdfTotal.toFixed(2)}`);
      console.log(`  DB Total: $${dbTotal.toFixed(2)}`);
      console.log(`  Variance: $${variance.toFixed(2)} (${variancePercent}%)`);
    }
  });
}

main();
