import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  'https://uwjmgjqongcrsamprvjr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns'
)

async function runMigration() {
  try {
    // Step 1: Add column
    console.log('Adding column...')
    const { error: e1 } = await supabase.rpc('pg_catalog.pg_exec', {
      query: 'ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(10);'
    })
    if (e1) console.log('Column may already exist or error:', e1.message)
    else console.log('✓ Column added')

    // Step 2: Check if column exists now
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, name, preferred_currency')
      .limit(1)

    if (error) {
      console.error('Column does not exist yet:', error.message)
    } else {
      console.log('✓ Column exists! Sample:', data)
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

runMigration()
