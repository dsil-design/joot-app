const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function checkRent() {
  // Get August rent
  const { data: augustRent, error: error1 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_date', '2025-08-04')
    .eq('description', "This Month's Rent")
    .single();

  if (error1) {
    console.error('Error fetching August rent:', error1);
  } else {
    console.log('\n=== AUGUST RENT (2025-08-04) ===');
    console.log('Raw JSON:', JSON.stringify(augustRent, null, 2));
    console.log('\n=== INTERPRETATION ===');
    console.log(`Amount field value: ${augustRent.amount}`);
    console.log(`Amount field type: ${typeof augustRent.amount}`);
    console.log(`Original Currency: ${augustRent.original_currency}`);
    console.log(`Original Amount: ${augustRent.original_amount}`);

    // What you're seeing in UI
    console.log('\n=== WHAT UI MIGHT SHOW ===');
    if (augustRent.original_currency === 'THB' && augustRent.amount > 10000) {
      console.log(`UI Display (with conversion): THB ${augustRent.amount.toLocaleString()} = $${(augustRent.amount / 32.5).toFixed(2)} USD`);
    } else {
      console.log(`UI Display: $${augustRent.amount}`);
    }

    // What PDF says
    console.log('\n=== WHAT PDF SAYS ===');
    console.log('Original: THB 35,000.00');
    console.log('Converted: $1,067.50');

    // What it should be stored as
    console.log('\n=== WHAT IT SHOULD BE IN DATABASE ===');
    console.log('amount: 1067.50 (the USD value)');
    console.log('original_currency: THB');
    console.log('original_amount: 35000 (the THB value)');

    console.log('\n=== VERDICT ===');
    if (Math.abs(augustRent.amount - 35000) < 1) {
      console.log('❌ STORED AS THB VALUE (35000) - NOT CONVERTED');
      console.log('This inflates database totals by 32.5x');
      console.log('UI likely converts on display, but DB aggregations are wrong');
    } else if (Math.abs(augustRent.amount - 1067.50) < 1) {
      console.log('✅ STORED AS USD VALUE (~1067.50) - CORRECT');
    } else {
      console.log(`⚠️ UNEXPECTED VALUE: ${augustRent.amount}`);
    }
  }
}

checkRent();
