/**
 * Apply Document Management Migration v2
 *
 * Uses direct database connection with correct Supabase pooler settings
 */

import { Client } from 'pg';
import * as fs from 'fs';

async function main() {
  console.log('🚀 Applying Document Management Migration\n');

  // Supabase connection details
  const connectionString = `postgresql://postgres.uwjmgjqongcrsamprvjr:NkWsbieKWodIMkjF@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  console.log('📡 Connecting to database...');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected!\n');

    // First, let's just apply the RLS policies since the tables already exist
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

    // Verify policies were created
    console.log('🔍 Verifying policies...');
    const result = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'documents'
      ORDER BY policyname
    `);

    if (result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} policies:`);
      result.rows.forEach(row => {
        console.log(`   - ${row.policyname} (${row.cmd})`);
      });
    } else {
      console.log('⚠️  No policies found (verification failed)');
    }

    await client.end();

    console.log('\n🎉 Migration completed successfully!');
    console.log('You can now upload documents without RLS errors.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Policies may already exist. Trying to verify...');
      try {
        const result = await client.query(`
          SELECT policyname FROM pg_policies WHERE tablename = 'documents'
        `);
        console.log(`Found ${result.rows.length} existing policies.`);
        if (result.rows.length >= 4) {
          console.log('✅ Policies are already in place. Upload should work.');
        }
      } catch {}
    }

    try {
      await client.end();
    } catch {}

    process.exit(1);
  }
}

main();
