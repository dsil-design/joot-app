require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuplicates() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  console.log('\n🔍 CHECKING FOR DUPLICATE TAGS:\n');
  
  const { data: allTags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name, created_at');

  // Group by name
  const tagsByName = {};
  allTags.forEach(tag => {
    if (!tagsByName[tag.name]) {
      tagsByName[tag.name] = [];
    }
    tagsByName[tag.name].push(tag);
  });

  let foundDuplicates = false;
  
  for (const [name, tags] of Object.entries(tagsByName)) {
    if (tags.length > 1) {
      foundDuplicates = true;
      console.log(`❌ DUPLICATE: "${name}" has ${tags.length} entries:`);
      tags.forEach((tag, i) => {
        console.log(`  [${i+1}] ID: ${tag.id}, Created: ${tag.created_at}`);
      });
      console.log('');
    } else {
      console.log(`✅ "${name}" - single entry (ID: ${tags[0].id})`);
    }
  }

  if (!foundDuplicates) {
    console.log('\n✅ No duplicate tags found!');
  } else {
    console.log('\n❌ Duplicate tags detected - import script created new tags instead of using existing ones');
  }
}

checkDuplicates().catch(console.error);
