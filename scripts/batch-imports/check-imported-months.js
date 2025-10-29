require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkImportedMonths() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  // Check which months have transactions
  const { data } = await supabase
    .from('transactions')
    .select('transaction_date')
    .eq('user_id', user.id)
    .order('transaction_date');

  if (!data || data.length === 0) {
    console.log('No transactions found');
    return;
  }

  // Get earliest and latest dates
  const earliest = data[0].transaction_date;
  const latest = data[data.length - 1].transaction_date;

  console.log('TRANSACTION DATE RANGE IN DATABASE');
  console.log('='.repeat(60));
  console.log(`Earliest: ${earliest}`);
  console.log(`Latest: ${latest}`);
  console.log();

  // Count transactions by month
  const monthCounts = {};
  data.forEach(t => {
    const month = t.transaction_date.substring(0, 7);
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  console.log('TRANSACTIONS BY MONTH:');
  console.log('='.repeat(60));
  Object.keys(monthCounts).sort().forEach(month => {
    console.log(`  ${month}: ${monthCounts[month]} transactions`);
  });
  console.log();
  console.log(`Total months with data: ${Object.keys(monthCounts).length}`);
  console.log(`Total transactions: ${data.length}`);

  // Identify gaps
  console.log();
  console.log('MISSING MONTHS (2023):');
  console.log('='.repeat(60));
  const months2023 = Object.keys(monthCounts).filter(m => m.startsWith('2023')).sort();
  const allMonths2023 = [];
  for (let i = 1; i <= 12; i++) {
    allMonths2023.push(`2023-${String(i).padStart(2, '0')}`);
  }

  const missing2023 = allMonths2023.filter(m => !months2023.includes(m));
  if (missing2023.length > 0) {
    missing2023.forEach(m => console.log(`  ${m}`));
  } else {
    console.log('  None - all 2023 months imported!');
  }
}

checkImportedMonths().catch(console.error);
