require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkVendors() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Get January rent transaction with vendor info
  const { data: rents } = await supabase
    .from('transactions')
    .select('*, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-01-01')
    .lte('transaction_date', '2023-01-31')
    .ilike('description', '%rent%');

  console.log('January 2023 Rent Transactions with Vendors:');
  rents.forEach(rent => {
    const vendorName = rent.vendors ? rent.vendors.name : 'NO VENDOR';
    console.log(`- ${rent.description}: ${rent.amount} ${rent.original_currency}`);
    console.log(`  Vendor: ${vendorName}`);
  });
}

checkVendors().catch(console.error);
