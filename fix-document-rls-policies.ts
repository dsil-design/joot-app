/**
 * Fix Document RLS Policies
 *
 * This script ensures that RLS policies are properly set up for the documents table.
 * It uses the service role key to bypass RLS and directly modify the policies.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for documents table...\n');

  // SQL to drop existing policies and recreate them
  const sql = `
-- Enable RLS on documents table (if not already enabled)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Create RLS policies for documents table
CREATE POLICY "Users can view own documents"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);
  `;

  try {
    // Execute the SQL using service role client
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternate method: run each statement individually
      console.log('exec_sql not available, trying direct query...\n');

      // Split SQL into statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({ sql_query: statement })
        });

        if (!result.ok) {
          const errorText = await result.text();
          console.error(`Failed: ${errorText}`);
        }
      }

      console.log('\n❌ Could not apply policies using RPC.');
      console.log('Please run the migration manually using the Supabase dashboard or CLI.');
      console.log('\nMigration file: database/supabase/migrations/20251029000000_add_document_management_tables.sql');
      return false;
    }

    console.log('✅ Successfully applied RLS policies!\n');

    // Verify policies were created
    console.log('Verifying policies...');
    const { data: policies, error: verifyError } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', 'documents');

    if (verifyError) {
      console.log('Could not verify (this is normal if pg_policies is not exposed)');
    } else {
      console.log(`Found ${policies?.length || 0} policies on documents table`);
      if (policies) {
        policies.forEach(p => console.log(`  - ${p.policyname}`));
      }
    }

    return true;
  } catch (error) {
    console.error('Error applying policies:', error);
    return false;
  }
}

async function main() {
  const success = await fixRLSPolicies();

  if (!success) {
    console.log('\n📝 Manual steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the following SQL:\n');
    console.log('ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('CREATE POLICY "Users can insert own documents" ON public.documents');
    console.log('  FOR INSERT WITH CHECK (auth.uid() = user_id);');
    console.log('');
    console.log('CREATE POLICY "Users can view own documents" ON public.documents');
    console.log('  FOR SELECT USING (auth.uid() = user_id);');
    console.log('');
    console.log('CREATE POLICY "Users can update own documents" ON public.documents');
    console.log('  FOR UPDATE USING (auth.uid() = user_id);');
    console.log('');
    console.log('CREATE POLICY "Users can delete own documents" ON public.documents');
    console.log('  FOR DELETE USING (auth.uid() = user_id);');

    process.exit(1);
  }

  console.log('\n🎉 Done! You should now be able to upload documents.');
}

main();
