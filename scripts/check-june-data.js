require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('Checking June 2025 data in database...\n');

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (userError) {
    console.error('Error getting user:', userError);
    return;
  }

  console.log(`User: ${userData.email} (ID: ${userData.id})\n`);

  // Check if there are any transactions for this user in June 2025
  const { data: allTransactions, error: txError, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userData.id)
    .gte('transaction_date', '2025-06-01')
    .lt('transaction_date', '2025-07-01');

  if (txError) {
    console.error('Error querying transactions:', txError);
    return;
  }

  console.log(`Total transactions found: ${count || 0}\n`);

  if (allTransactions && allTransactions.length > 0) {
    console.log('First 3 transactions:');
    allTransactions.slice(0, 3).forEach((tx, i) => {
      console.log(`\n${i + 1}. Date: ${tx.transaction_date}`);
      console.log(`   Amount: ${tx.amount}`);
      console.log(`   Type: ${tx.transaction_type}`);
      console.log(`   Original Currency: ${tx.original_currency || 'NOT SET'}`);
      console.log(`   Original Amount: ${tx.original_amount || 'NOT SET'}`);
    });

    // Count by currency
    const currencyCount = {};
    allTransactions.forEach(tx => {
      const curr = tx.original_currency || 'NULL';
      currencyCount[curr] = (currencyCount[curr] || 0) + 1;
    });

    console.log('\n\nCurrency Distribution:');
    Object.entries(currencyCount).forEach(([curr, count]) => {
      console.log(`  ${curr}: ${count}`);
    });
  } else {
    console.log('No transactions found for June 2025!');
  }
}

checkData().catch(console.error);
