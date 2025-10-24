const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function checkTHBConversion(monthName, startDate, endDate) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('original_currency', 'THB')
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)
    .order('amount', { ascending: false })
    .limit(10);

  if (error) {
    console.error(`Error fetching ${monthName}:`, error);
    return;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${monthName} - THB CONVERSION CHECK`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`Top 10 THB Transactions:\n`);
  data.forEach((t, idx) => {
    // Assuming exchange rate around 32-33 THB = 1 USD
    const expectedUSD = parseFloat(t.amount) / 32.5;
    const ratio = parseFloat(t.amount) / expectedUSD;

    console.log(`${(idx + 1).toString().padStart(2)}. Amount in DB: $${t.amount}`);
    console.log(`    ${t.description}`);
    console.log(`    Date: ${t.transaction_date}`);
    console.log(`    Expected if converted (~32.5 rate): $${expectedUSD.toFixed(2)}`);
    console.log(`    Ratio: ${ratio.toFixed(2)}x ${ratio > 25 ? '❌ NOT CONVERTED!' : '✅ Converted'}`);
    console.log(``);
  });

  return data;
}

async function main() {
  console.log('\n🔍 Checking if THB amounts were converted to USD...\n');

  await checkTHBConversion('June 2025', '2025-06-01', '2025-07-01');
  await checkTHBConversion('July 2025', '2025-07-01', '2025-08-01');
  await checkTHBConversion('August 2025', '2025-08-01', '2025-09-01');
  await checkTHBConversion('September 2025', '2025-09-01', '2025-10-01');
}

main();
