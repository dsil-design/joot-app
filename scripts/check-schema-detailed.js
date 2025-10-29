const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // Try querying with minimal select
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Query error:', error);
    } else if (data && data.length > 0) {
      console.log('Sample transaction structure:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('No transactions found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
