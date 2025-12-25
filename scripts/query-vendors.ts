import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

  // Get all vendors with transaction counts
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('user_id', userId)
    .order('name');

  if (vendorsError) {
    console.error('Error fetching vendors:', vendorsError);
    return;
  }

  // Get transaction counts for each vendor
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('vendor_id, amount, transaction_date')
    .eq('user_id', userId);

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return;
  }

  // Calculate stats per vendor
  const vendorStats = new Map<string, {
    count: number;
    total: number;
    firstDate: string | null;
    lastDate: string | null;
  }>();

  for (const tx of transactions || []) {
    if (!tx.vendor_id) continue;

    const existing = vendorStats.get(tx.vendor_id) || {
      count: 0,
      total: 0,
      firstDate: null,
      lastDate: null
    };

    existing.count++;
    existing.total += parseFloat(tx.amount);

    if (!existing.firstDate || tx.transaction_date < existing.firstDate) {
      existing.firstDate = tx.transaction_date;
    }
    if (!existing.lastDate || tx.transaction_date > existing.lastDate) {
      existing.lastDate = tx.transaction_date;
    }

    vendorStats.set(tx.vendor_id, existing);
  }

  // Combine and output
  const results = (vendors || []).map(v => {
    const stats = vendorStats.get(v.id) || { count: 0, total: 0, firstDate: null, lastDate: null };
    return {
      id: v.id,
      name: v.name,
      count: stats.count,
      total: Math.round(stats.total * 100) / 100,
      firstDate: stats.firstDate,
      lastDate: stats.lastDate
    };
  }).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  console.log(JSON.stringify(results, null, 2));
}

main();
