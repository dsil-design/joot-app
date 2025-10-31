/**
 * Apply Document Management Migration v3
 *
 * Uses direct database connection (not pooler)
 */

import { Client } from 'pg';

async function main() {
  console.log('🚀 Applying Document Management Migration\n');

  // Try direct connection instead of pooler
  const connectionString = `postgresql://postgres.uwjmgjqongcrsamprvjr:[password]@db.uwjmgjqongcrsamprvjr.supabase.co:5432/postgres`;

  // Replace with actual password
  const finalConnectionString = connectionString.replace('[password]', 'NkWsbieKWodIMkjF');

  console.log('📡 Connecting to database (direct connection)...');

  const client = new Client({
    connectionString: finalConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected!\n');

    // Apply RLS policies
    const rlsPoliciesSQL = `
-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any exist)
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Create policies
CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);
`;

    console.log('📝 Applying RLS policies...');
    await client.query(rlsPoliciesSQL);
    console.log('✅ RLS policies applied successfully!\n');

    // Verify policies
    console.log('🔍 Verifying policies...');
    const result = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'documents'
      ORDER BY policyname
    `);

    console.log(`✅ Found ${result.rows.length} policies:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.policyname} (${row.cmd})`);
    });

    await client.end();

    console.log('\n🎉 Migration completed successfully!');
    console.log('You can now upload documents without RLS errors.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n✅ Policies already exist. Upload should work now.');
    }

    try {
      await client.end();
    } catch {}

    if (!error.message.includes('already exists')) {
      process.exit(1);
    }
  }
}

main();
