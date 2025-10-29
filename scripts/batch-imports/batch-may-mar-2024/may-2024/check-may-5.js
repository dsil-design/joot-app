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
  const transactions = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  const may5 = transactions.filter(t => t.transaction_date === '2024-05-05');

  console.log('May 5th in JSON:', may5.length);
  may5.forEach(t => console.log(`  - ${t.description}: ${t.amount} ${t.currency} (${t.merchant})`));

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  const { data: dbMay5 } = await supabase
    .from('transactions')
    .select('description, amount, original_currency, vendor:vendors(name)')
    .eq('user_id', user.id)
    .eq('transaction_date', '2024-05-05');

  console.log('\nMay 5th in DB:', dbMay5.length);
  dbMay5.forEach(t => console.log(`  - ${t.description}: ${t.amount} ${t.original_currency} (${t.vendor?.name || 'null'})`));
}

main();
