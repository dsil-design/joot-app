const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://uwjmgjqongcrsamprvjr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns'
)

async function addColumn() {
  console.log('Step 1: Adding preferred_currency column...')

  const sql1 = `
    ALTER TABLE public.payment_methods
    ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(10);
  `

  const { error: error1 } = await supabase.rpc('exec_sql', { sql: sql1 })
  if (error1) {
    console.error('Error in step 1:', error1)
    return
  }
  console.log('✓ Column added')

  console.log('\nStep 2: Adding foreign key constraint...')
  const sql2 = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_method_currency'
      ) THEN
        ALTER TABLE public.payment_methods
        ADD CONSTRAINT fk_payment_method_currency
        FOREIGN KEY (preferred_currency)
        REFERENCES currency_configuration(currency_code)
        ON DELETE SET NULL;
      END IF;
    END $$;
  `

  const { error: error2 } = await supabase.rpc('exec_sql', { sql: sql2 })
  if (error2) {
    console.error('Error in step 2:', error2)
    return
  }
  console.log('✓ Foreign key added')

  console.log('\nStep 3: Adding index...')
  const sql3 = `
    CREATE INDEX IF NOT EXISTS idx_payment_methods_preferred_currency
    ON public.payment_methods(preferred_currency)
    WHERE preferred_currency IS NOT NULL;
  `

  const { error: error3 } = await supabase.rpc('exec_sql', { sql: sql3 })
  if (error3) {
    console.error('Error in step 3:', error3)
    return
  }
  console.log('✓ Index added')

  console.log('\nMigration completed successfully!')

  // Verify
  console.log('\nVerifying...')
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name, preferred_currency')
    .limit(1)

  if (error) {
    console.error('Verification failed:', error)
  } else {
    console.log('✓ Verification successful - preferred_currency column exists!')
  }
}

addColumn()
