#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';
const JSON_FILE = path.join(__dirname, 'may-2024-CORRECTED.json');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const jsonTxns = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  const { data: dbTxns } = await supabase
    .from('transactions')
    .select('description, transaction_date, amount, original_currency, vendor:vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-05-01')
    .lte('transaction_date', '2024-05-31')
    .order('transaction_date');

  console.log(`JSON: ${jsonTxns.length}, DB: ${dbTxns.length}\n`);

  // Create keys for all JSON transactions
  const jsonKeys = new Set();
  jsonTxns.forEach(t => {
    const key = `${t.transaction_date}|${t.description}|${t.amount}|${t.currency}|${t.merchant}`;
    jsonKeys.add(key);
  });

  // Check which DB transactions match
  const dbKeys = new Set();
  dbTxns.forEach(t => {
    const key = `${t.transaction_date}|${t.description}|${t.amount}|${t.original_currency}|${t.vendor?.name || 'null'}`;
    dbKeys.add(key);
  });

  // Find missing from JSON
  const missingFromDB = [];
  jsonTxns.forEach(t => {
    const key = `${t.transaction_date}|${t.description}|${t.amount}|${t.currency}|${t.merchant}`;
    if (!dbKeys.has(key)) {
      missingFromDB.push(t);
    }
  });

  // Find extra in DB (not in JSON)
  const extraInDB = [];
  dbTxns.forEach(t => {
    const key = `${t.transaction_date}|${t.description}|${t.amount}|${t.original_currency}|${t.vendor?.name || 'null'}`;
    if (!jsonKeys.has(key)) {
      extraInDB.push(t);
    }
  });

  if (missingFromDB.length > 0) {
    console.log(`❌ Missing from DB (${missingFromDB.length}):`);
    missingFromDB.forEach(t => {
      console.log(`  ${t.transaction_date} | ${t.description} | ${t.amount} ${t.currency} | ${t.merchant}`);
    });
    console.log();
  }

  if (extraInDB.length > 0) {
    console.log(`⚠️  Extra in DB (${extraInDB.length}):`);
    extraInDB.forEach(t => {
      console.log(`  ${t.transaction_date} | ${t.description} | ${t.amount} ${t.original_currency} | ${t.vendor?.name}`);
    });
    console.log();
  }

  console.log(`\nSummary:`);
  console.log(`  JSON has ${jsonTxns.length} transactions`);
  console.log(`  DB has ${dbTxns.length} transactions`);
  console.log(`  Missing from DB: ${missingFromDB.length}`);
  console.log(`  Extra in DB: ${extraInDB.length}`);

  if (missingFromDB.length === 0 && extraInDB.length === 0 && jsonTxns.length === dbTxns.length) {
    console.log('\n✅ Perfect match - all transactions match!\n');
  } else if (jsonTxns.length !== dbTxns.length) {
    console.log(`\n⚠️  Count mismatch but no differences found - possible merchant NULL vs string issue`);
  }
}

main();
