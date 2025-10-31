/**
 * Apply Document Management Migration v4
 *
 * Uses Supabase Management API to execute SQL
 */

async function main() {
  console.log('🚀 Applying Document Management Migration\n');

  const projectRef = 'uwjmgjqongcrsamprvjr';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

  const sqlStatements = [
    'ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;',
    'DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;',
    'DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;',
    'DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;',
    'DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;',
    `CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);`,
    `CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);`,
    `CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);`,
    `CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);`,
  ];

  console.log('📝 Applying RLS policies via Supabase REST API...\n');

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const desc = sql.substring(0, 60).replace(/\n/g, ' ') + '...';

    console.log(`${i + 1}/${sqlStatements.length}: ${desc}`);

    try {
      // Try using the query endpoint
      const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        const text = await response.text();
        console.log(`   ⚠️  Response: ${response.status} - ${text.substring(0, 100)}`);
      } else {
        console.log('   ✅');
      }
    } catch (error: any) {
      console.log(`   ❌ ${error.message}`);
    }
  }

  console.log('\n⚠️  Note: The REST API may not support DDL commands.');
  console.log('Let me try verifying if policies exist...\n');

  // Try to check if we can at least insert a test row
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    `https://${projectRef}.supabase.co`,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .limit(1);

  if (error) {
    console.log('❌ Could not query documents table:', error.message);
  } else {
    console.log('✅ Can query documents table');
  }

  console.log('\n📋 MANUAL STEPS REQUIRED:');
  console.log('Since automatic migration via API is not possible, please:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/sql/new');
  console.log('2. Run the following SQL:');
  console.log('');
  console.log('```sql');
  console.log(sqlStatements.join('\n\n'));
  console.log('```');
  console.log('');
  console.log('3. Click "Run" and verify "Success. No rows returned"');
  console.log('4. Try uploading a document again');
}

main();
