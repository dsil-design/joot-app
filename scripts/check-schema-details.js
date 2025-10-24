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

async function checkSchema() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  // Query with relationships
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (name),
      payment_methods (name),
      transaction_tags (tags (name))
    `)
    .eq('user_id', user.id)
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample transactions with relationships:');
  console.log(JSON.stringify(data, null, 2));
}

checkSchema();
