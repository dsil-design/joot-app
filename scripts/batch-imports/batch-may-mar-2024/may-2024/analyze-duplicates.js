#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Analyzing May 2024 duplicates...\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, description, transaction_date, amount, original_currency, created_at')
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-05-01')
    .lte('transaction_date', '2024-05-31')
    .order('transaction_date');

  console.log(`Found ${transactions.length} May 2024 transactions\n`);

  // Group by description + date + amount to find duplicates
  const groups = {};
  transactions.forEach(t => {
    const key = `${t.description}|${t.transaction_date}|${t.amount}|${t.original_currency}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(t);
  });

  // Find duplicates
  const duplicates = Object.entries(groups).filter(([key, txns]) => txns.length > 1);

  if (duplicates.length > 0) {
    console.log(`🔴 Found ${duplicates.length} duplicate groups:\n`);
    duplicates.forEach(([key, txns]) => {
      console.log(`${txns[0].description} (${txns[0].transaction_date}) - ${txns[0].amount} ${txns[0].original_currency}`);
      console.log(`  ${txns.length} copies:`);
      txns.forEach(t => {
        console.log(`    - ID: ${t.id}, Created: ${t.created_at}`);
      });
      console.log();
    });
  } else {
    console.log('✅ No duplicates found\n');
  }

  // Check for rent
  const rent = transactions.filter(t => t.description.toLowerCase().includes('rent'));
  console.log(`Rent transactions (${rent.length}):`);
  rent.forEach(t => {
    console.log(`  - ${t.description} (${t.transaction_date}): ${t.amount} ${t.original_currency}`);
  });

  // Show creation time distribution
  console.log('\n📅 Import timestamps:');
  const today = new Date().toISOString().split('T')[0];
  const todayImports = transactions.filter(t => t.created_at.startsWith(today));
  const olderImports = transactions.filter(t => !t.created_at.startsWith(today));

  console.log(`  - Today: ${todayImports.length}`);
  console.log(`  - Older: ${olderImports.length}`);

  if (olderImports.length > 0) {
    console.log('\nOlder imports dates:');
    const dates = [...new Set(olderImports.map(t => t.created_at.split('T')[0]))];
    dates.forEach(d => {
      const count = olderImports.filter(t => t.created_at.startsWith(d)).length;
      console.log(`  - ${d}: ${count} transactions`);
    });
  }
}

main();
