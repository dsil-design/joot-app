const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function checkReimbursements(monthName, startDate, endDate) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)
    .ilike('description', '%reimbursement%');

  if (error) {
    console.error(`Error fetching ${monthName}:`, error);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${monthName} - REIMBURSEMENTS CHECK`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Found ${data.length} transactions with "reimbursement" in description\n`);

  data.forEach(t => {
    console.log(`Date: ${t.transaction_date}`);
    console.log(`Description: ${t.description}`);
    console.log(`Amount: $${t.amount} (${t.amount < 0 ? 'NEGATIVE ✅' : 'POSITIVE ⚠️'})`);
    console.log(`Currency: ${t.original_currency}`);
    console.log(`Type: ${t.transaction_type}`);
    console.log(`---`);
  });

  return data;
}

async function main() {
  console.log('Checking for Reimbursement Data Issues...\n');

  await checkReimbursements('June 2025', '2025-06-01', '2025-07-01');
  await checkReimbursements('July 2025', '2025-07-01', '2025-08-01');
  await checkReimbursements('August 2025', '2025-08-01', '2025-09-01');
  await checkReimbursements('September 2025', '2025-09-01', '2025-10-01');
}

main();
