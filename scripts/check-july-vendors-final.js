require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkVendors() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  const { data, error } = await supabase
    .from('transactions')
    .select('id, transaction_date, description, amount, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-07-01')
    .lte('transaction_date', '2025-07-31')
    .order('transaction_date')
    .limit(15);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📊 July 2025 Transactions - Vendor Check\n');
  console.log('Date       | Description                    | Amount    | Vendor');
  console.log('-'.repeat(80));

  data.forEach(t => {
    const vendorName = t.vendors?.name || 'UNKNOWN';
    const desc = t.description.substring(0, 30).padEnd(30);
    const amt = t.amount.toString().padEnd(8);
    console.log(`${t.transaction_date} | ${desc} | $${amt} | ${vendorName}`);
  });

  // Count transactions with vs without vendors
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-07-01')
    .lte('transaction_date', '2025-07-31');

  const { count: withVendorCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-07-01')
    .lte('transaction_date', '2025-07-31')
    .not('vendor_id', 'is', null);

  console.log('\n' + '='.repeat(80));
  console.log(`Total July transactions: ${totalCount}`);
  console.log(`With vendor: ${withVendorCount}`);
  console.log(`Without vendor: ${totalCount - withVendorCount}`);
  console.log('='.repeat(80) + '\n');
}

checkVendors();
