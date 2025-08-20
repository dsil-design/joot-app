#!/usr/bin/env node

/**
 * Reset Transaction Data Script
 * 
 * This script wipes and reseeds transaction-related data with realistic examples.
 * It connects to the Supabase database and executes the SQL reset script.
 * 
 * Usage:
 *   node scripts/db/reset-transaction-data.js
 * 
 * Environment variables required:
 *   - SUPABASE_DB_URL (full database connection string)
 *   OR
 *   - SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function resetTransactionData() {
  console.log('🔄 Starting transaction data reset...\n');

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_PROJECT_URL)');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    console.error('\nMake sure your .env.local file is configured correctly.');
    process.exit(1);
  }

  // Read the SQL script
  const sqlScriptPath = path.join(__dirname, '../../database/scripts/reset-transaction-data.sql');
  
  if (!fs.existsSync(sqlScriptPath)) {
    console.error(`❌ SQL script not found at: ${sqlScriptPath}`);
    process.exit(1);
  }

  const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
  console.log(`📄 Loaded SQL script: ${sqlScriptPath}\n`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔗 Connected to Supabase...\n');

  try {
    // Step 1: Clear existing data
    console.log('🗑️  Clearing existing transaction data...');
    
    // For transactions - delete all records by getting them first
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id');
    
    if (existingTransactions && existingTransactions.length > 0) {
      const { error: deleteTransactionsError } = await supabase
        .from('transactions')
        .delete()
        .in('id', existingTransactions.map(t => t.id));
      
      if (deleteTransactionsError) {
        console.log('⚠️  Warning: Could not clear transactions:', deleteTransactionsError.message);
      } else {
        console.log('✅ Cleared transactions');
      }
    } else {
      console.log('✅ No existing transactions to clear');
    }

    // For vendors - delete all records  
    const { data: existingVendors } = await supabase
      .from('vendors')
      .select('id');
    
    if (existingVendors && existingVendors.length > 0) {
      const { error: deleteVendorsError } = await supabase
        .from('vendors')
        .delete()
        .in('id', existingVendors.map(v => v.id));
      
      if (deleteVendorsError) {
        console.log('⚠️  Warning: Could not clear vendors:', deleteVendorsError.message);
      } else {
        console.log('✅ Cleared vendors');
      }
    } else {
      console.log('✅ No existing vendors to clear');
    }

    // For payment methods - delete all records
    const { data: existingPaymentMethods } = await supabase
      .from('payment_methods')
      .select('id');
    
    if (existingPaymentMethods && existingPaymentMethods.length > 0) {
      const { error: deletePaymentMethodsError } = await supabase
        .from('payment_methods')
        .delete()
        .in('id', existingPaymentMethods.map(pm => pm.id));
      
      if (deletePaymentMethodsError) {
        console.log('⚠️  Warning: Could not clear payment methods:', deletePaymentMethodsError.message);
      } else {
        console.log('✅ Cleared payment methods');
      }
    } else {
      console.log('✅ No existing payment methods to clear');
    }

    // Step 2: Get all users
    console.log('\n👥 Getting user list...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');
    
    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`);
    }
    
    if (!users || users.length === 0) {
      throw new Error('No users found. Please ensure you have at least one user in the database.');
    }
    
    console.log(`✅ Found ${users.length} user(s)`);

    // Step 3: Insert vendors for each user
    console.log('\n🏪 Creating vendors...');
    const vendorNames = [
      'Starbucks', 'McDonald\'s', 'Amazon', 'Target', 'Whole Foods',
      'Uber', 'Netflix', 'Spotify', 'Shell Gas Station', 'CVS Pharmacy',
      'Apple Store', 'Best Buy', 'Home Depot', 'Costco', 'Trader Joe\'s'
    ];
    
    const vendorsToInsert = [];
    users.forEach(user => {
      vendorNames.forEach(vendorName => {
        vendorsToInsert.push({
          name: vendorName,
          user_id: user.id
        });
      });
    });
    
    const { error: vendorsInsertError } = await supabase
      .from('vendors')
      .insert(vendorsToInsert);
    
    if (vendorsInsertError) {
      throw new Error(`Failed to insert vendors: ${vendorsInsertError.message}`);
    }
    
    console.log(`✅ Created ${vendorsToInsert.length} vendors`);

    // Step 4: Insert payment methods for each user
    console.log('\n💳 Creating payment methods...');
    const paymentMethodNames = [
      'Cash', 'Credit Card', 'Debit Card', 'PayPal',
      'Apple Pay', 'Bank Transfer', 'Venmo', 'Zelle'
    ];
    
    const paymentMethodsToInsert = [];
    users.forEach(user => {
      paymentMethodNames.forEach(methodName => {
        paymentMethodsToInsert.push({
          name: methodName,
          user_id: user.id
        });
      });
    });
    
    const { error: paymentMethodsInsertError } = await supabase
      .from('payment_methods')
      .insert(paymentMethodsToInsert);
    
    if (paymentMethodsInsertError) {
      throw new Error(`Failed to insert payment methods: ${paymentMethodsInsertError.message}`);
    }
    
    console.log(`✅ Created ${paymentMethodsToInsert.length} payment methods`);

    // Step 5: Get the created vendors and payment methods for transaction creation
    console.log('\n🔗 Fetching created vendors and payment methods...');
    
    const { data: createdVendors, error: vendorsQueryError } = await supabase
      .from('vendors')
      .select('id, name, user_id');
    
    const { data: createdPaymentMethods, error: paymentMethodsQueryError } = await supabase
      .from('payment_methods')
      .select('id, name, user_id');
    
    if (vendorsQueryError) {
      throw new Error(`Failed to query vendors: ${vendorsQueryError.message}`);
    }
    
    if (paymentMethodsQueryError) {
      throw new Error(`Failed to query payment methods: ${paymentMethodsQueryError.message}`);
    }

    // Step 6: Create sample transactions for each user
    console.log('\n💰 Creating sample transactions...');
    
    const sampleTransactions = [
      { description: 'Coffee and pastry', amount_usd: 8.50, amount_thb: 274.25, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 1 },
      { description: 'Lunch combo meal', amount_usd: 12.99, amount_thb: 418.84, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 2 },
      { description: 'Online shopping', amount_usd: 45.67, amount_thb: 1472.20, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 3 },
      { description: 'Grocery shopping', amount_usd: 89.34, amount_thb: 2881.20, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 5 },
      { description: 'Organic groceries', amount_usd: 67.45, amount_thb: 2174.31, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 7 },
      { description: 'Ride to airport', amount_usd: 25.80, amount_thb: 831.79, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 8 },
      { description: 'Monthly subscription', amount_usd: 15.99, amount_thb: 515.72, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 10 },
      { description: 'Music streaming', amount_usd: 9.99, amount_thb: 322.18, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 12 },
      { description: 'Gas fill-up', amount_usd: 42.50, amount_thb: 1370.20, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 14 },
      { description: 'Pharmacy pickup', amount_usd: 18.75, amount_thb: 604.50, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 16 },
      { description: 'Street food dinner', amount_usd: 4.65, amount_thb: 150.00, exchange_rate: 32.24, original_currency: 'THB', transaction_type: 'expense', days_ago: 18 },
      { description: 'Local market shopping', amount_usd: 15.53, amount_thb: 500.95, exchange_rate: 32.24, original_currency: 'THB', transaction_type: 'expense', days_ago: 20 },
      { description: 'Electronics purchase', amount_usd: 93.18, amount_thb: 3004.50, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 22 },
      { description: 'Home improvement supplies', amount_usd: 156.78, amount_thb: 5054.65, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 25 },
      { description: 'Bulk shopping', amount_usd: 234.56, amount_thb: 7563.02, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'expense', days_ago: 28 },
      { description: 'Freelance payment', amount_usd: 500.00, amount_thb: 16120.00, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'income', days_ago: 15 },
      { description: 'Refund from return', amount_usd: 67.89, amount_thb: 2188.47, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'income', days_ago: 21 },
      { description: 'Cash back reward', amount_usd: 12.50, amount_thb: 403.00, exchange_rate: 32.24, original_currency: 'USD', transaction_type: 'income', days_ago: 26 }
    ];
    
    const transactionsToInsert = [];
    users.forEach(user => {
      const userVendors = createdVendors.filter(v => v.user_id === user.id);
      const userPaymentMethods = createdPaymentMethods.filter(pm => pm.user_id === user.id);
      
      sampleTransactions.forEach(tx => {
        // Pick random vendor and payment method for this user
        const randomVendor = userVendors[Math.floor(Math.random() * userVendors.length)];
        const randomPaymentMethod = userPaymentMethods[Math.floor(Math.random() * userPaymentMethods.length)];
        
        // Calculate transaction date
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - tx.days_ago);
        
        transactionsToInsert.push({
          user_id: user.id,
          vendor_id: randomVendor ? randomVendor.id : null,
          payment_method_id: randomPaymentMethod ? randomPaymentMethod.id : null,
          description: tx.description,
          amount_usd: tx.amount_usd,
          amount_thb: tx.amount_thb,
          exchange_rate: tx.exchange_rate,
          original_currency: tx.original_currency,
          transaction_type: tx.transaction_type,
          transaction_date: transactionDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
        });
      });
    });
    
    const { error: transactionsInsertError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);
    
    if (transactionsInsertError) {
      throw new Error(`Failed to insert transactions: ${transactionsInsertError.message}`);
    }
    
    console.log(`✅ Created ${transactionsToInsert.length} sample transactions`);
    
    console.log('\n🎉 Transaction data reset completed successfully!\n');

    // Try to get a count of records to verify
    console.log('📊 Verifying data...');
    
    const { data: transactionCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    
    const { data: vendorCount } = await supabase
      .from('vendors')
      .select('id', { count: 'exact', head: true });
      
    const { data: paymentMethodCount } = await supabase
      .from('payment_methods')
      .select('id', { count: 'exact', head: true });

    console.log(`   📈 Transactions: ${transactionCount?.length || 'N/A'}`);
    console.log(`   🏪 Vendors: ${vendorCount?.length || 'N/A'}`);
    console.log(`   💳 Payment Methods: ${paymentMethodCount?.length || 'N/A'}\n`);

    // Sample a few recent transactions to verify relationships
    const { data: recentTransactions, error: sampleError } = await supabase
      .from('transactions')
      .select(`
        description,
        amount_usd,
        transaction_date,
        vendors (name),
        payment_methods (name)
      `)
      .order('transaction_date', { ascending: false })
      .limit(3);

    if (!sampleError && recentTransactions?.length > 0) {
      console.log('📋 Sample transactions:');
      recentTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.description} - $${tx.amount_usd} - ${tx.vendors?.name || 'No vendor'} - ${tx.payment_methods?.name || 'No payment method'}`);
      });
    }

    console.log('\n✨ Data reset completed! Your home page should now show transactions.\n');

  } catch (error) {
    console.error('\n❌ Failed to reset transaction data:', error.message);
    console.error('\n🔍 Troubleshooting tips:');
    console.error('   1. Verify your Supabase credentials are correct');
    console.error('   2. Check that you have the proper permissions (service role key)');
    console.error('   3. Ensure the database is accessible and tables exist');
    console.error('   4. Try running individual SQL statements manually in Supabase SQL Editor\n');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  resetTransactionData().catch(console.error);
}

module.exports = { resetTransactionData };