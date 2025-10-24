require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTags() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('\n📊 ALL TAGS IN DATABASE:\n');
  
  const { data: allTags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');

  allTags.forEach(tag => {
    console.log(`  ID: ${tag.id}`);
    console.log(`  Name: "${tag.name}"`);
    console.log(`  Created: ${tag.created_at}`);
    console.log('  ---');
  });

  console.log(`\nTotal tags: ${allTags.length}\n`);
}

checkTags().catch(console.error);
