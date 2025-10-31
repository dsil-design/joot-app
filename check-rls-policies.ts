import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

async function checkRLSPolicies() {
  const supabase = createClient(supabaseUrl, serviceKey);

  // Query pg_policies to check RLS policies on documents table
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'documents'
        ORDER BY policyname;
      `
    });

  if (error) {
    console.log('Error querying policies:', error);

    // Try alternate method - direct query
    const { data: policiesData, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'documents');

    if (policiesError) {
      console.log('Alternate method also failed:', policiesError);
    } else {
      console.log('Policies found (alternate method):', JSON.stringify(policiesData, null, 2));
    }
  } else {
    console.log('Policies found:', JSON.stringify(data, null, 2));
  }

  // Check if RLS is enabled
  const { data: rlsData, error: rlsError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'documents';
      `
    });

  if (rlsError) {
    console.log('Error checking RLS status:', rlsError);
  } else {
    console.log('RLS status:', JSON.stringify(rlsData, null, 2));
  }
}

checkRLSPolicies();
