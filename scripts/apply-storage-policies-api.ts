/**
 * Apply Storage RLS Policies via Supabase Management API
 *
 * This script executes SQL statements via the Supabase Management API
 * when direct database connections are not available.
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyStoragePolicies() {
  console.log('🔐 Applying storage RLS policies via SQL execution...\n')

  // Read the migration file
  const sqlPath = join(process.cwd(), 'database/migrations/20251029000001_add_storage_policies.sql')
  const sqlContent = readFileSync(sqlPath, 'utf-8')

  // Split SQL into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'

    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim().length < 5) {
      continue
    }

    // Extract policy/function name for logging
    const match = statement.match(/CREATE POLICY "([^"]+)"|CREATE.*FUNCTION (\w+)/)
    const name = match ? (match[1] || match[2]) : `Statement ${i + 1}`

    try {
      const { error } = await supabase.rpc('exec_sql' as any, {
        query: statement
      } as any)

      if (error) {
        // Try direct execution via .from() for certain statements
        console.log(`⚠️  ${name}: ${error.message}`)
        errorCount++
      } else {
        console.log(`✅ ${name}`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ ${name}: ${err}`)
      errorCount++
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)

  if (errorCount > 0) {
    console.log('\n⚠️  Some policies could not be applied via API.')
    console.log('   Please apply the migration manually via Supabase Dashboard:')
    console.log('   1. Go to https://supabase.com/dashboard')
    console.log('   2. Select your project')
    console.log('   3. SQL Editor → New Query')
    console.log('   4. Copy/paste: database/migrations/20251029000001_add_storage_policies.sql')
    console.log('   5. Run the query')
  }
}

applyStoragePolicies()
  .then(() => {
    console.log('\n✅ Storage policy application complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })
