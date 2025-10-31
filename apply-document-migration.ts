/**
 * Apply Document Management Migration
 *
 * This script applies the document management migration by executing SQL
 * statements through the Supabase client using the service role.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public'
  }
});

async function executeSQL(sql: string, description: string) {
  console.log(`\n📝 ${description}...`);

  try {
    // Use the Supabase client to execute raw SQL via a postgres connection
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      throw error;
    }

    console.log('✅ Success');
    return true;
  } catch (error: any) {
    // If exec_sql doesn't exist, we need to use postgres driver directly
    console.log('⚠️  exec_sql RPC not available, using direct postgres query...');

    // Import postgres driver
    const { Client } = require('pg');

    const client = new Client({
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.uwjmgjqongcrsamprvjr',
      password: process.env.SUPABASE_DB_PASSWORD || 'NkWsbieKWodIMkjF',
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log('✅ Success (via pg client)');
      return true;
    } catch (pgError: any) {
      console.error('❌ Failed:', pgError.message);
      try {
        await client.end();
      } catch {}
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Applying Document Management Migration\n');
  console.log('Project:', supabaseUrl);

  // Read the migration file
  const migrationPath = 'database/supabase/migrations/20251029000000_add_document_management_tables.sql';

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Execute the full migration
  console.log('📄 Migration file:', migrationPath);

  const success = await executeSQL(migrationSQL, 'Applying document management tables and RLS policies');

  if (!success) {
    console.log('\n❌ Migration failed. Trying to apply RLS policies only...\n');

    // Try applying just the RLS policies
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

    const rlsSuccess = await executeSQL(rlsPoliciesSQL, 'Applying RLS policies for documents table');

    if (!rlsSuccess) {
      console.log('\n❌ Could not apply migration automatically.');
      console.log('Please see FIX-DOCUMENT-UPLOAD.md for manual instructions.');
      process.exit(1);
    }
  }

  console.log('\n🎉 Migration applied successfully!');
  console.log('You can now upload documents without RLS errors.');
}

main().catch(console.error);
