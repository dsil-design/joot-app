const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });
const fs = require('fs');
const path = require('path');

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const JANUARY_2025_START = '2025-01-01';
const JANUARY_2025_END = '2025-01-31';
const USER_ID = 'dennis@dsil.design';

// Expected values from parse report
const EXPECTED_COUNTS = {
  total: 195,
  expenseTracker: 186,
  grossIncome: 6,
  savings: 0,
  floridaHouse: 3,
  reimbursement: 15,
  businessExpense: 3,
};

// Exchange rate calculation - from Rent #1 (THB 25,000)
// Need to extract USD equivalent from PDF first
let EXCHANGE_RATE = null;

async function extractPDFData() {
  console.log('Attempting to read PDF...');
  const pdfPath = '/Users/dennis/Code Projects/joot-app/csv_imports/Master Reference PDFs/Budget for Import-page10.pdf';
  
  // Try using a simple approach - check file exists
  if (fs.existsSync(pdfPath)) {
    console.log('PDF file found:', pdfPath);
    console.log('Note: Full PDF extraction requires pdf2json or similar library');
    return null;
  }
  return null;
}

async function queryDatabase() {
  console.log('\n=== DATABASE VALIDATION ===\n');
  
  // Query all January 2025 transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', USER_ID)
    .gte('date', JANUARY_2025_START)
    .lte('date', JANUARY_2025_END)
    .order('date', { ascending: true });

  if (error) {
    console.error('Database query error:', error);
    return null;
  }

  console.log(`Total transactions in database: ${transactions.length}`);
  
  // Separate by type and section
  const expenses = transactions.filter(t => t.transaction_type === 'expense');
  const income = transactions.filter(t => t.transaction_type === 'income');
  
  console.log(`- Expenses: ${expenses.length}`);
  console.log(`- Income: ${income.length}`);
  
  // Count by currency
  const usd = transactions.filter(t => t.currency === 'USD');
  const thb = transactions.filter(t => t.currency === 'THB');
  console.log(`- USD: ${usd.length}`);
  console.log(`- THB: ${thb.length}`);
  
  // Count by tags
  const reimbursement = transactions.filter(t => t.tags && t.tags.includes('Reimbursement'));
  const floridaHouse = transactions.filter(t => t.tags && t.tags.includes('Florida House'));
  const businessExpense = transactions.filter(t => t.tags && t.tags.includes('Business Expense'));
  
  console.log('\nTag Distribution:');
  console.log(`- Reimbursement: ${reimbursement.length}`);
  console.log(`- Florida House: ${floridaHouse.length}`);
  console.log(`- Business Expense: ${businessExpense.length}`);
  
  // Calculate totals
  const calculateTotal = (txns) => {
    return txns.reduce((sum, t) => {
      let amount = t.currency === 'THB' ? t.amount / (EXCHANGE_RATE || 17) : t.amount;
      return sum + amount;
    }, 0);
  };
  
  // Calculate Gross Income (exclude reimbursements and income adjustment)
  const grossIncomeTransactions = income.filter(t => {
    return !t.tags || !t.tags.includes('Reimbursement');
  });
  const grossIncomeTotal = calculateTotal(grossIncomeTransactions);
  
  // Calculate Expense Tracker (expenses + reimbursements, exclude Florida House and Savings)
  const expenseTrackerTransactions = transactions.filter(t => {
    return (!t.tags || (!t.tags.includes('Florida House') && !t.tags.includes('Savings')))
      && !(t.tags && t.tags.includes('Savings'));
  });
  const expenseTrackerTotal = calculateTotal(expenseTrackerTransactions);
  
  // Florida House
  const floridaHouseTotal = calculateTotal(floridaHouse);
  
  // Savings
  const savingsTransactions = transactions.filter(t => t.tags && t.tags.includes('Savings'));
  const savingsTotal = calculateTotal(savingsTransactions);
  
  console.log('\n=== SECTION TOTALS (in USD) ===');
  console.log(`Expense Tracker Total: $${expenseTrackerTotal.toFixed(2)}`);
  console.log(`Gross Income Total: $${grossIncomeTotal.toFixed(2)}`);
  console.log(`Florida House Total: $${floridaHouseTotal.toFixed(2)}`);
  console.log(`Savings Total: $${savingsTotal.toFixed(2)}`);
  
  // Verify critical transactions
  console.log('\n=== CRITICAL TRANSACTION VERIFICATION ===');
  
  // Rent #1
  const rent1 = transactions.find(t => 
    t.date === '2025-01-02' && t.description === 'This Month\'s Rent'
  );
  console.log(`Rent #1 (Jan 2): ${rent1 ? '✓ FOUND' : '✗ NOT FOUND'}`);
  if (rent1) {
    console.log(`  Amount: ${rent1.amount} ${rent1.currency}`);
    console.log(`  Merchant: ${rent1.merchant}`);
  }
  
  // Rent #2
  const rent2 = transactions.find(t => 
    t.date === '2025-01-31' && t.description === 'First Month\'s Rent'
  );
  console.log(`Rent #2 (Jan 31): ${rent2 ? '✓ FOUND' : '✗ NOT FOUND'}`);
  if (rent2) {
    console.log(`  Amount: ${rent2.amount} ${rent2.currency}`);
    console.log(`  Merchant: ${rent2.merchant}`);
  }
  
  // Income adjustment
  const incomeAdj = transactions.find(t => 
    t.description === 'Business income correction - returned funds'
  );
  console.log(`Income Adjustment (Expense): ${incomeAdj ? '✓ FOUND' : '✗ NOT FOUND'}`);
  if (incomeAdj) {
    console.log(`  Amount: ${incomeAdj.amount} ${incomeAdj.currency}`);
    console.log(`  Type: ${incomeAdj.transaction_type}`);
    console.log(`  Date: ${incomeAdj.date}`);
  }
  
  // Sample largest transactions
  console.log('\n=== SAMPLE TRANSACTIONS ===');
  const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
  console.log('\nLargest 5 transactions:');
  sorted.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.date} | ${t.description} | ${t.amount} ${t.currency}`);
  });
  
  return {
    transactions,
    expenses,
    income,
    reimbursement,
    floridaHouse,
    businessExpense,
    expenseTrackerTotal,
    grossIncomeTotal,
    floridaHouseTotal,
    savingsTotal,
    rent1,
    rent2,
    incomeAdj
  };
}

async function main() {
  try {
    // Set default exchange rate (will be updated after PDF analysis)
    EXCHANGE_RATE = 17; // Default estimate
    
    // Extract PDF data
    console.log('=== JANUARY 2025 COMPREHENSIVE VALIDATION ===\n');
    await extractPDFData();
    
    // Query database
    const dbData = await queryDatabase();
    
    // TODO: Compare with PDF
    console.log('\n\nNext steps:');
    console.log('1. Extract PDF data using pdf2json or similar');
    console.log('2. Parse PDF sections and transactions');
    console.log('3. Calculate exchange rate from Rent #1');
    console.log('4. Perform detailed 1:1 verification');
    
  } catch (error) {
    console.error('Validation error:', error);
    process.exit(1);
  }
}

main();
