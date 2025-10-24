const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function checkDataModel() {
  console.log('\n🔍 Understanding the Data Model\n');
  console.log('='.repeat(70));

  // Check June rent
  const { data: juneRent } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_date', '2025-06-01')
    .ilike('description', "%rent%")
    .limit(1);

  if (juneRent && juneRent.length > 0) {
    const rent = juneRent[0];
    console.log('\nJUNE 2025 RENT:');
    console.log(`  Description: ${rent.description}`);
    console.log(`  Amount: ${rent.amount}`);
    console.log(`  Original Currency: ${rent.original_currency}`);
    console.log(`  Original Amount: ${rent.original_amount}`);

    console.log('\n  PDF Shows: THB 35,000.00 → $1,074.50');

    if (rent.amount > 30000) {
      console.log('  ✅ Amount stores ORIGINAL currency value (35000 THB)');
    } else if (rent.amount > 1000 && rent.amount < 1100) {
      console.log('  ❌ Amount stores CONVERTED USD value (~1074)');
    }
  }

  // Check August rent
  const { data: augustRent } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_date', '2025-08-04')
    .ilike('description', "%rent%")
    .limit(1);

  if (augustRent && augustRent.length > 0) {
    const rent = augustRent[0];
    console.log('\nAUGUST 2025 RENT:');
    console.log(`  Description: ${rent.description}`);
    console.log(`  Amount: ${rent.amount}`);
    console.log(`  Original Currency: ${rent.original_currency}`);
    console.log(`  Original Amount: ${rent.original_amount}`);

    console.log('\n  PDF Shows: THB 35,000.00 → $1,067.50');

    if (rent.amount > 30000) {
      console.log('  ✅ Amount stores ORIGINAL currency value (35000 THB)');
    } else if (rent.amount > 1000 && rent.amount < 1100) {
      console.log('  ❌ Amount stores CONVERTED USD value (~1067)');
    }
  }

  // Check some USD transactions
  const { data: usdTrans } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('original_currency', 'USD')
    .gte('transaction_date', '2025-08-01')
    .lt('transaction_date', '2025-09-01')
    .limit(3);

  console.log('\n\nUSD TRANSACTIONS (August):');
  usdTrans?.forEach(t => {
    console.log(`\n  ${t.description}`);
    console.log(`    Amount: $${t.amount}`);
    console.log(`    Currency: ${t.original_currency}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n📋 CONCLUSION:');
  console.log('  If BOTH June and August store THB as 35000...');
  console.log('  Then the data model is:');
  console.log('    • amount = value in original_currency');
  console.log('    • Conversion happens at query/display time');
  console.log('    • This is CORRECT design for multi-currency!');
}

checkDataModel();
