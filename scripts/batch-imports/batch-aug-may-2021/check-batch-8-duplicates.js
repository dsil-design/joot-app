require('dotenv').config({ path: '../../../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBatch8Duplicates() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('========================================');
  console.log('BATCH 8: DUPLICATE DETECTION');
  console.log('========================================\n');
  console.log('Date Range: May 2021 - August 2021\n');

  // Get all transactions for May-August 2021
  const { data, error } = await supabase
    .from('transactions')
    .select('id, transaction_date, description, amount, original_currency, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-05-01')
    .lte('transaction_date', '2021-08-31')
    .order('transaction_date');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total transactions in range: ${data.length}\n`);

  // Group by month
  const byMonth = {};
  data.forEach(t => {
    const month = t.transaction_date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(t);
  });

  console.log('Transactions by month:');
  Object.keys(byMonth).sort().forEach(month => {
    console.log(`  ${month}: ${byMonth[month].length} transactions`);
  });
  console.log();

  // Detect duplicates: same date, description, amount, currency, AND vendor
  const duplicates = [];
  const seen = new Map();

  data.forEach(t => {
    const vendorName = t.vendors?.name || 'Unknown';
    const key = `${t.transaction_date}|${t.description}|${t.amount}|${t.original_currency}|${vendorName}`;
    if (seen.has(key)) {
      duplicates.push({
        original: seen.get(key),
        duplicate: t
      });
    } else {
      seen.set(key, t);
    }
  });

  if (duplicates.length === 0) {
    console.log('✅ NO DUPLICATES FOUND\n');
    console.log('All transactions are unique within the date range.\n');
  } else {
    console.log(`⚠️  DUPLICATES FOUND: ${duplicates.length}\n`);
    duplicates.forEach((dup, idx) => {
      console.log(`Duplicate ${idx + 1}:`);
      console.log(`  Original: ${dup.original.transaction_date} | ${dup.original.description} | ${dup.original.vendors?.name} | ${dup.original.amount} ${dup.original.original_currency}`);
      console.log(`  Duplicate: ${dup.duplicate.transaction_date} | ${dup.duplicate.description} | ${dup.duplicate.vendors?.name} | ${dup.duplicate.amount} ${dup.duplicate.original_currency}`);
      console.log(`  IDs: ${dup.original.id} vs ${dup.duplicate.id}\n`);
    });
  }

  console.log('========================================');
  console.log('VERIFICATION COMPLETE');
  console.log('========================================\n');
}

checkBatch8Duplicates();
