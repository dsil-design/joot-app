import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigate() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Find rent transactions
  console.log('=== LOOKING FOR RENT TRANSACTIONS ===\n');
  
  const { data: rentSearch } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (name),
      payment_methods (name)
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-01-01')
    .lte('transaction_date', '2025-01-31')
    .ilike('description', '%rent%');

  console.log('Rent transactions found:');
  rentSearch.forEach(t => {
    console.log(`  ${t.transaction_date} | ${t.description} | ${t.vendors?.name} | ${t.amount} ${t.original_currency}`);
  });

  // Find Pol transactions
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .ilike('name', '%pol%');
  
  console.log('\n=== VENDORS MATCHING "POL" ===');
  console.log(JSON.stringify(vendors, null, 2));

  // Find Landlord transactions
  const { data: landlordVendors } = await supabase
    .from('vendors')
    .select('*')
    .ilike('name', '%landlord%');
  
  console.log('\n=== VENDORS MATCHING "LANDLORD" ===');
  console.log(JSON.stringify(landlordVendors, null, 2));

  // Check Gross Income transactions
  console.log('\n=== GROSS INCOME ANALYSIS ===\n');
  
  const { data: allJan } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (name),
      transaction_tags (tags (name))
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-01-01')
    .lte('transaction_date', '2025-01-31')
    .eq('transaction_type', 'income');

  const reimbursements = allJan.filter(t => {
    const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
    return tags.includes('Reimbursement');
  });

  const nonReimbursements = allJan.filter(t => {
    const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
    return !tags.includes('Reimbursement');
  });

  console.log(`Total income transactions: ${allJan.length}`);
  console.log(`Reimbursements: ${reimbursements.length}`);
  console.log(`Non-reimbursement income (Gross Income): ${nonReimbursements.length}`);
  
  console.log('\nNon-reimbursement income transactions:');
  nonReimbursements.forEach(t => {
    console.log(`  ${t.transaction_date} | ${t.description} | ${t.vendors?.name} | ${t.amount} ${t.original_currency}`);
  });

  // Check for golf winnings
  console.log('\n=== GOLF WINNINGS CHECK ===\n');
  const golfWinnings = allJan.filter(t => t.description.includes('Golf'));
  console.log(`Found ${golfWinnings.length} golf-related transactions:`);
  golfWinnings.forEach(t => {
    console.log(`  ${t.transaction_date} | ${t.description} | ${t.vendors?.name} | ${t.amount} ${t.original_currency}`);
  });

  // Check January 4 reimbursement
  console.log('\n=== JANUARY 4 TRANSACTIONS ===\n');
  const jan4 = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (name),
      transaction_tags (tags (name))
    `)
    .eq('user_id', user.id)
    .eq('transaction_date', '2025-01-04');

  console.log(JSON.stringify(jan4.data, null, 2));
}

investigate();
