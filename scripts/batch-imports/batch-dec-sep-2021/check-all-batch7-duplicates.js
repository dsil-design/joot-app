require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBatch7Duplicates() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('='.repeat(80));
  console.log('BATCH 7 DUPLICATE ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  const months = [
    { name: 'December 2021', expected: 144, start: '2021-12-01', end: '2021-12-31' },
    { name: 'November 2021', expected: 106, start: '2021-11-01', end: '2021-11-30' },
    { name: 'October 2021', expected: 137, start: '2021-10-01', end: '2021-10-31' },
    { name: 'September 2021', expected: 161, start: '2021-09-01', end: '2021-09-30' }
  ];

  let totalExpected = 0;
  let totalActual = 0;

  for (const month of months) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, transaction_date, description, amount, original_currency')
      .eq('user_id', user.id)
      .gte('transaction_date', month.start)
      .lte('transaction_date', month.end)
      .order('transaction_date');

    if (error) {
      console.error(`Error checking ${month.name}:`, error);
      continue;
    }

    const actual = data.length;
    const duplicates = actual - month.expected;
    const duplicationFactor = (actual / month.expected).toFixed(1);

    totalExpected += month.expected;
    totalActual += actual;

    console.log(`${month.name}:`);
    console.log(`  Expected: ${month.expected}`);
    console.log(`  Actual:   ${actual}`);
    console.log(`  Duplicates: ${duplicates} (${duplicationFactor}x)`);
    console.log(`  Status: ${duplicates === 0 ? '✅ CLEAN' : '⚠️  DUPLICATES FOUND'}`);
    console.log();
  }

  console.log('='.repeat(80));
  console.log('BATCH 7 TOTALS:');
  console.log(`  Expected: ${totalExpected}`);
  console.log(`  Actual:   ${totalActual}`);
  console.log(`  Total Duplicates: ${totalActual - totalExpected}`);
  console.log(`  Average Duplication: ${(totalActual / totalExpected).toFixed(1)}x`);
  console.log('='.repeat(80));
}

checkBatch7Duplicates();
