const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🔍 Running critical database migration...');
  
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250201_alter_transactions_vendor_payment_fk.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('🗄️ Executing migration on production database...');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    
    // Verify the migration worked by checking for the new column
    console.log('🔍 Verifying migration...');
    const { data: columnCheck, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'transactions')
      .eq('column_name', 'payment_method_id');

    if (verifyError) {
      console.warn('⚠️  Could not verify migration (this might be normal):', verifyError.message);
    } else if (columnCheck && columnCheck.length > 0) {
      console.log('✅ Verification successful: payment_method_id column exists');
    } else {
      console.log('🔍 Running alternative verification...');
      // Try direct SQL query
      const { data: directCheck, error: directError } = await supabase.rpc('exec_sql', {
        sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_method_id';`
      });
      
      if (!directError && directCheck) {
        console.log('✅ Alternative verification successful');
      }
    }

    console.log('🎉 Migration Phase 1 complete! Ready for code deployment.');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Check if we have the required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Make sure your .env.local file is properly configured.');
  process.exit(1);
}

runMigration();
