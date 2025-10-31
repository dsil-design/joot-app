/**
 * Debug RLS Insert
 *
 * Tests document insertion with different auth contexts to identify the issue
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTYzMjIsImV4cCI6MjA2OTg3MjMyMn0.Fp2TIGDIx32-won5Eyp6NcI1-On_EkarZSnSwEDxggA';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

async function testInsert() {
  console.log('🔍 Debug: Testing document insert with RLS\n');

  // Test 1: Service role (should work - bypasses RLS)
  console.log('Test 1: Insert with service role key (bypasses RLS)...');
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const testDocService = {
    id: crypto.randomUUID(),
    user_id: '00000000-0000-0000-0000-000000000000', // dummy user ID
    file_name: 'test-service.pdf',
    file_type: 'pdf',
    file_size_bytes: 1000,
    mime_type: 'application/pdf',
    storage_path: 'test/service.pdf',
    processing_status: 'pending'
  };

  const { data: serviceData, error: serviceError } = await serviceClient
    .from('documents')
    .insert(testDocService)
    .select()
    .single();

  if (serviceError) {
    console.log('❌ Service role insert failed:', serviceError);
  } else {
    console.log('✅ Service role insert succeeded');
    console.log('   Document ID:', serviceData.id);

    // Clean up
    await serviceClient.from('documents').delete().eq('id', testDocService.id);
    console.log('   (cleaned up test document)\n');
  }

  // Test 2: Check if there's an authenticated user in the app
  console.log('Test 2: Get current auth session from cookies...');
  console.log('⚠️  This test needs to run in the browser context with actual cookies');
  console.log('   Skipping for now.\n');

  // Test 3: Check RLS policies directly
  console.log('Test 3: Verify RLS policies exist...');
  const { data: rlsData, error: rlsError } = await serviceClient
    .rpc('exec_sql', {
      sql_query: `
        SELECT
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual::text as using_clause,
          with_check::text as with_check_clause
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'documents'
        ORDER BY policyname;
      `
    });

  if (rlsError) {
    console.log('⚠️  Could not query policies via RPC:', rlsError.message);
    console.log('   This is expected if exec_sql function is not available.\n');
  } else {
    console.log('✅ Found policies:');
    console.log(JSON.stringify(rlsData, null, 2));
  }

  // Test 4: Try to check what auth.uid() returns
  console.log('\nTest 4: Check auth context...');
  console.log('   When you upload, check the server console logs for:');
  console.log('   - User ID from auth.getUser()');
  console.log('   - The exact dbError details\n');

  console.log('📋 Next Steps:');
  console.log('1. Check your server terminal logs (where npm run dev is running)');
  console.log('2. Look for "Database insert failed:" message with full error details');
  console.log('3. Verify the user_id being inserted matches auth.uid()');
  console.log('4. Share those log details with me for further debugging');
}

testInsert();
