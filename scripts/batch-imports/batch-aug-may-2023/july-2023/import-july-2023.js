require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function importJuly2023() {
  console.log('========================================');
  console.log('JULY 2023 DATABASE IMPORT');
  console.log('========================================\n');

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (userError || !user) {
    console.error('Error fetching user:', userError);
    return;
  }

  console.log(`User ID: ${user.id}\n`);

  // Load parsed transactions
  const parsedPath = path.join(__dirname, 'july-2023-PARSED.json');
  const transactions = JSON.parse(fs.readFileSync(parsedPath, 'utf-8'));

  console.log(`Loaded ${transactions.length} transactions from july-2023-PARSED.json\n`);

  await supabase.rpc('import_july_2023', {
    p_user_id: user.id,
    p_transactions: transactions
  });

  console.log('✅ Import complete\n');
}

importJuly2023().catch(console.error);
