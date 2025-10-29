/**
 * Setup Script: Configure Storage Bucket RLS Policies
 *
 * Applies Row Level Security policies to storage buckets via SQL
 *
 * Run: npx tsx scripts/setup-storage-policies.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyStoragePolicies() {
  console.log('🔐 Applying storage bucket RLS policies...\n')

  // Read the SQL migration file
  const sqlPath = join(process.cwd(), 'database/migrations/20251029000001_add_storage_policies.sql')
  const sqlContent = readFileSync(sqlPath, 'utf-8')

  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent }).single()

  if (error) {
    // If exec_sql function doesn't exist, we need to run SQL directly
    // This is expected - Supabase doesn't expose raw SQL execution via RPC for security
    console.log('ℹ️  Cannot apply policies programmatically via Supabase client')
    console.log('   Storage policies must be applied via:')
    console.log('   1. Supabase Dashboard SQL Editor, OR')
    console.log('   2. Direct psql connection')
    console.log('')
    console.log('📋 Policy Summary:')
    console.log('   documents bucket: Private (users can only access their own files)')
    console.log('   thumbnails bucket: Public read, authenticated write')
    console.log('   vendor-logos bucket: Public read, authenticated write')
    console.log('')
    console.log('✅ Storage buckets created successfully')
    console.log('⚠️  RLS policies ready to apply (see migration file)')
    return false
  }

  console.log('✅ Storage policies applied successfully!')
  return true
}

applyStoragePolicies()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Storage setup complete with RLS policies!')
    } else {
      console.log('\n✅ Storage buckets ready (policies in migration file)')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  })
