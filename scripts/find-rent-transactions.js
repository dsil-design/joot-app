const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function findRent() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .ilike('description', '%rent%')
    .gte('transaction_date', '2025-08-01')
    .lt('transaction_date', '2025-10-01')
    .order('transaction_date');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n Found ${data.length} transactions with "rent" in description:\n`);

  data.forEach(t => {
    console.log(`Date: ${t.transaction_date}`);
    console.log(`Description: ${t.description}`);
    console.log(`Amount: $${t.amount}`);
    console.log(`Currency: ${t.original_currency}`);
    console.log(`Type: ${t.transaction_type}`);
    console.log(`---`);
  });
}

findRent();
