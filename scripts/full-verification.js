const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function getFullData() {
  try {
    console.log('Fetching all data with vendor and payment method information...\n');

    // Get transactions with vendor details - check schema first
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        vendors(name),
        payment_methods(name)
      `)
      .eq('user_id', userId)
      .gte('transaction_date', '2024-11-01')
      .lte('transaction_date', '2024-11-30')
      .order('transaction_date', { ascending: true });

    if (txError) {
      console.error('Error:', txError);
      // Fallback: just get transactions
      const { data: txOnly, error: fallbackError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', '2024-11-01')
        .lte('transaction_date', '2024-11-30')
        .order('transaction_date', { ascending: true });

      if (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return;
      }

      console.log(`Fetched ${txOnly.length} transactions (without vendor info)\n`);

      fs.writeFileSync(
        path.join(__dirname, 'db_nov_enriched.json'),
        JSON.stringify(txOnly, null, 2)
      );

      console.log('Data saved to db_nov_enriched.json');
      process.exit(0);
    }

    console.log(`Fetched ${transactions.length} transactions\n`);

    // Save enriched data
    fs.writeFileSync(
      path.join(__dirname, 'db_nov_enriched.json'),
      JSON.stringify(transactions, null, 2)
    );

    console.log('Data saved to db_nov_enriched.json');

    // Show summary
    console.log('\nSample records with vendor info:');
    console.log('-'.repeat(100));

    transactions.slice(0, 5).forEach((tx, i) => {
      console.log(`${i + 1}. [${tx.transaction_date}] ${tx.description}`);
      console.log(`   Vendor: ${tx.vendors?.name || 'Unknown'}`);
      console.log(`   Amount: ${tx.amount} ${tx.original_currency}`);
      console.log(`   Payment: ${tx.payment_methods?.name || 'Unknown'}`);
    });

  } catch (error) {
    console.error('Fatal error:', error.message);
  }

  process.exit(0);
}

getFullData();
