const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Dennis's user ID
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function fetchNovemberTransactions() {
  try {
    console.log('Querying November 2024 transactions from database...\n');
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', '2024-11-01')
      .lte('transaction_date', '2024-11-30')
      .order('transaction_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    
    console.log(`Total database transactions: ${data.length}`);
    console.log('\nSample of first 10 transactions:');
    console.log('-'.repeat(100));
    
    data.slice(0, 10).forEach((tx, idx) => {
      console.log(`${idx + 1}. [${tx.transaction_date}] ${tx.description} @ ${tx.merchant}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}, Tags: ${tx.transaction_tags}`);
    });
    
    console.log('\n...\n');
    
    // Save to file for verification
    fs.writeFileSync(
      path.join(__dirname, 'db_transactions_nov2024.json'),
      JSON.stringify(data, null, 2)
    );
    
    console.log(`Full data saved to scripts/db_transactions_nov2024.json\n`);
    
    return data;
    
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

// Run query
fetchNovemberTransactions()
  .then(data => {
    console.log(`\nTotal transactions fetched: ${data.length}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
