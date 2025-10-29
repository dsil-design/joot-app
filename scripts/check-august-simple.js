require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', '2024-08-01')
    .lte('transaction_date', '2024-08-31')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (data.length > 0) {
    console.log('Sample transaction columns:');
    console.log(Object.keys(data[0]));
  }
})();
