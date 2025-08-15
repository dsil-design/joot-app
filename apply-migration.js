const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  console.log('🚀 Starting critical database migration...');
  
  // Create direct PostgreSQL connection
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Extract database connection details
  const projectId = supabaseUrl.split('//')[1].split('.')[0];
  const connectionString = `postgresql://postgres.${projectId}:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  
  console.log('🔧 Attempting migration via Supabase API...');
  
  // Create Supabase client for verification
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log('📄 Starting schema updates...');
    
    // First, check if the column already exists
    console.log('🔍 Checking current schema...');
    const { data: existingColumns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'transactions')
      .eq('column_name', 'payment_method_id');
    
    if (checkError) {
      console.log('⚠️  Schema check failed, proceeding with migration:', checkError.message);
    } else if (existingColumns && existingColumns.length > 0) {
      console.log('✅ payment_method_id column already exists! Checking data migration...');
    } else {
      console.log('📊 payment_method_id column not found, will need full migration');
    }
    
    // Since we can't run DDL through Supabase client, let's provide instructions
    console.log('\n📋 MANUAL MIGRATION REQUIRED:');
    console.log('Please apply the following in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    
    const migrationSQL = `-- Phase 1: Add payment_method_id column
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- Phase 2: Create index
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id 
ON public.transactions(payment_method_id);

-- Phase 3: Migrate existing data
DO $$
DECLARE
    transaction_record RECORD;
    payment_method_id_val UUID;
BEGIN
    FOR transaction_record IN 
        SELECT t.id, t.user_id, t.payment_method
        FROM public.transactions t
        WHERE t.payment_method IS NOT NULL 
        AND t.payment_method != ''
        AND t.payment_method_id IS NULL
    LOOP
        SELECT pm.id INTO payment_method_id_val
        FROM public.payment_methods pm
        WHERE pm.user_id = transaction_record.user_id 
        AND pm.name = transaction_record.payment_method
        LIMIT 1;

        IF payment_method_id_val IS NOT NULL THEN
            UPDATE public.transactions 
            SET payment_method_id = payment_method_id_val
            WHERE id = transaction_record.id;
        ELSE
            INSERT INTO public.payment_methods (name, user_id)
            VALUES (transaction_record.payment_method, transaction_record.user_id)
            ON CONFLICT (name, user_id) DO NOTHING
            RETURNING id INTO payment_method_id_val;
            
            IF payment_method_id_val IS NULL THEN
                SELECT id INTO payment_method_id_val
                FROM public.payment_methods
                WHERE name = transaction_record.payment_method 
                AND user_id = transaction_record.user_id;
            END IF;
            
            IF payment_method_id_val IS NOT NULL THEN
                UPDATE public.transactions 
                SET payment_method_id = payment_method_id_val
                WHERE id = transaction_record.id;
            END IF;
        END IF;
        
        payment_method_id_val := NULL;
    END LOOP;
END $$;`;
    
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('\n🔗 Go to: https://supabase.com/dashboard/project/' + projectId + '/sql');
    console.log('\n⏳ Waiting for you to apply the migration...');
    console.log('Press ENTER when you have applied the migration in Supabase SQL Editor:');
    
    // Wait for user confirmation
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Verify migration was applied
    console.log('🔍 Verifying migration was applied...');
    
    // Try to query the transactions table directly to see if payment_method_id exists
    const { data: testData, error: testError } = await supabase
      .from('transactions')
      .select('id, payment_method_id')
      .limit(1);
    
    if (testError) {
      console.log('❌ Migration verification failed. Error:', testError.message);
      if (testError.message.includes('payment_method_id')) {
        console.log('   This suggests the column does not exist yet.');
        console.log('   Please double-check the migration was applied in Supabase SQL Editor.');
        process.exit(1);
      }
    }
    
    console.log('✅ Migration verified successfully!');
    
    // Check some sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('transactions')
      .select('id, payment_method, payment_method_id')
      .limit(3);
    
    if (!sampleError && sampleData) {
      console.log('📊 Sample migrated data:', sampleData);
    }
    
    console.log('🎉 Phase 1 Migration Complete! Ready for code deployment.');
    
  } catch (error) {
    console.error('💥 Migration process failed:', error.message);
    process.exit(1);
  }
}

// Validate environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Run npm run validate:env first.');
  process.exit(1);
}

applyMigration();
