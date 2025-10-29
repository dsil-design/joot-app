require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function investigateRents() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('INVESTIGATING THAILAND RENT TRANSACTIONS');
  console.log('========================================\n');

  const months = [
    { name: 'January 2023', start: '2023-01-01', end: '2023-01-31' },
    { name: 'February 2023', start: '2023-02-01', end: '2023-02-28' },
    { name: 'March 2023', start: '2023-03-01', end: '2023-03-31' },
    { name: 'April 2023', start: '2023-04-01', end: '2023-04-30' }
  ];

  for (const month of months) {
    console.log(`\n=== ${month.name} ===`);

    // Check ALL transactions with "rent" in description
    const { data: allRents } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .ilike('description', '%rent%');

    console.log(`Total rent transactions found: ${allRents?.length || 0}`);

    if (allRents && allRents.length > 0) {
      allRents.forEach(rent => {
        console.log(`  - ${rent.transaction_date}: ${rent.description}`);
        console.log(`    Amount: ${rent.amount} ${rent.original_currency}`);
        console.log(`    Merchant: ${rent.merchant}`);
        console.log(`    Type: ${rent.transaction_type}`);
      });
    }

    // Specifically check for Pol/Panya (landlords)
    const { data: thaiLandlords } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .or('merchant.ilike.%pol%,merchant.ilike.%panya%');

    if (thaiLandlords && thaiLandlords.length > 0) {
      console.log(`\nThailand landlord transactions:`);
      thaiLandlords.forEach(txn => {
        console.log(`  - ${txn.transaction_date}: ${txn.description} - ${txn.amount} ${txn.original_currency}`);
      });
    }
  }
}

investigateRents().catch(console.error);
