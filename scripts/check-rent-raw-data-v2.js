const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function checkRent() {
  // Get August rent - try with LIKE since exact match failed
  const { data: augustRent, error: error1 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_date', '2025-08-04')
    .ilike('description', "%rent%");

  if (error1) {
    console.error('Error fetching August rent:', error1);
    return;
  }

  console.log(`\nFound ${augustRent.length} transactions on 2025-08-04 with "rent":\n`);

  augustRent.forEach(rent => {
    console.log('='.repeat(70));
    console.log(`Description: ${rent.description}`);
    console.log(`Amount: ${rent.amount}`);
    console.log(`Type: ${typeof rent.amount}`);
    console.log(`Original Currency: ${rent.original_currency}`);
    console.log(`Original Amount: ${rent.original_amount}`);
    console.log(`Transaction Type: ${rent.transaction_type}`);

    console.log('\n--- ANALYSIS ---');
    const amount = parseFloat(rent.amount);

    // Check if it's around 35000 (THB value)
    if (amount > 30000 && amount < 40000) {
      console.log(`❌ This appears to be THB value (${amount})`);
      console.log(`   PDF says: THB 35,000 = $1,067.50 USD`);
      console.log(`   Expected DB amount: ~1067.50`);
      console.log(`   Actual DB amount: ${amount}`);
      console.log(`   ERROR: THB not converted to USD!`);
    }
    // Check if it's around 1067 (USD value)
    else if (amount > 1000 && amount < 1100) {
      console.log(`✅ This appears to be USD value (${amount})`);
      console.log(`   PDF says: THB 35,000 = $${amount} USD`);
      console.log(`   This is CORRECT - THB was converted to USD`);
    }
    else {
      console.log(`⚠️ Unexpected amount: ${amount}`);
    }
    console.log('='.repeat(70) + '\n');
  });
}

checkRent();
