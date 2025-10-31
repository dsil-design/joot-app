import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTYzMjIsImV4cCI6MjA2OTg3MjMyMn0.Fp2TIGDIx32-won5Eyp6NcI1-On_EkarZSnSwEDxggA';

async function testDocumentInsert() {
  // Create a client WITHOUT authentication to check RLS
  const supabase = createClient(supabaseUrl, anonKey);

  // Try to sign in with a test user
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'dennis@example.com',
    password: 'password123'
  });

  if (signInError) {
    console.log('Sign in error:', signInError);
    process.exit(1);
  }

  console.log('Signed in as:', signInData.user?.id);

  // Now try to insert a document
  const testDoc = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: signInData.user?.id,
    file_name: 'test.pdf',
    file_type: 'pdf',
    file_size_bytes: 1000,
    mime_type: 'application/pdf',
    storage_path: 'test/path.pdf',
    processing_status: 'pending'
  };

  const { data, error } = await supabase
    .from('documents')
    .insert(testDoc)
    .select();

  if (error) {
    console.log('Insert error:', error);
  } else {
    console.log('Success! Document inserted:', data);

    // Clean up - delete the test document
    await supabase.from('documents').delete().eq('id', testDoc.id);
  }
}

testDocumentInsert();
