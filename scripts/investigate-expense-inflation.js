const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function investigateMonth(monthName, startDate, endDate) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_type', 'expense')
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)
    .order('amount', { ascending: false });

  if (error) {
    console.error(`Error fetching ${monthName}:`, error);
    return;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${monthName} - TOP 20 EXPENSES`);
  console.log(`${'='.repeat(70)}\n`);

  const top20 = data.slice(0, 20);
  const top20Total = top20.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  top20.forEach((t, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. $${t.amount.toString().padStart(10)} - ${t.description}`);
    console.log(`    Date: ${t.transaction_date}, Currency: ${t.original_currency}, Original: ${t.original_amount || 'N/A'}`);
  });

  console.log(`\nTop 20 Total: $${top20Total.toFixed(2)}`);
  console.log(`All Expenses Total: $${data.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toFixed(2)}`);
  console.log(`Transaction Count: ${data.length}`);

  // Check for potential issues
  const suspiciouslyHigh = data.filter(t => parseFloat(t.amount) > 5000);
  if (suspiciouslyHigh.length > 0) {
    console.log(`\n⚠️ Found ${suspiciouslyHigh.length} transactions over $5,000`);
  }

  // Check original amounts
  console.log(`\n📊 Original Amount Analysis:`);
  const withOriginalAmount = data.filter(t => t.original_amount != null);
  const withoutOriginalAmount = data.filter(t => t.original_amount == null);
  console.log(`  With original_amount: ${withOriginalAmount.length}`);
  console.log(`  Without original_amount: ${withoutOriginalAmount.length}`);

  return data;
}

async function main() {
  await investigateMonth('June 2025', '2025-06-01', '2025-07-01');
  await investigateMonth('July 2025', '2025-07-01', '2025-08-01');
  await investigateMonth('August 2025', '2025-08-01', '2025-09-01');
  await investigateMonth('September 2025', '2025-09-01', '2025-10-01');
}

main();
