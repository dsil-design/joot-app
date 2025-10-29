const fs = require('fs');
const path = require('path');

// This script queries Supabase for September 2024 transactions
// and performs comprehensive validation

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = 'https://qkxvwvywbtvxtmqtgrgl.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateSeptember2024() {
  try {
    console.log('Starting September 2024 Comprehensive Validation...\n');

    // Query all September 2024 transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
      .gte('transaction_date', '2024-09-01')
      .lte('transaction_date', '2024-09-30')
      .order('transaction_date');

    if (error) {
      console.error('Error querying transactions:', error);
      process.exit(1);
    }

    console.log(`Found ${transactions.length} transactions for September 2024\n`);

    // Log first few transactions to verify data
    console.log('Sample transactions:');
    transactions.slice(0, 5).forEach(t => {
      const desc = t.description ? t.description.substring(0, 30) : 'N/A';
      console.log(`  ${t.transaction_date} | ${desc} | ${t.amount} ${t.currency} | ${t.transaction_type}`);
    });

    // Export validation data
    exportValidationData(transactions);

  } catch (err) {
    console.error('Validation error:', err);
    process.exit(1);
  }
}

function exportValidationData(transactions) {
  const output = {
    metadata: {
      validationDate: new Date().toISOString(),
      month: 'September 2024',
      period: '2024-09-01 to 2024-09-30',
      userId: 'a1c3caff-a5de-4898-be7d-ab4b76247ae6',
      totalTransactions: transactions.length
    },
    rawTransactions: transactions
  };

  fs.writeFileSync(
    '/tmp/september-2024-raw-data.json',
    JSON.stringify(output, null, 2)
  );

  console.log('\nData exported to /tmp/september-2024-raw-data.json');
  console.log(`Total transactions found: ${transactions.length}`);
}

// Run validation
validateSeptember2024();
