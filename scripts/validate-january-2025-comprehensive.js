import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Exchange rate calculation from first rent payment
const RENT_1_THB = 25000;
const RENT_1_USD = 730.00; // From PDF
const EXCHANGE_RATE = RENT_1_USD / RENT_1_THB; // 0.0292

console.log('JANUARY 2025 COMPREHENSIVE VALIDATION');
console.log('=====================================\n');

// Get user ID
async function getUserId() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single();

  if (error) throw error;
  return data.id;
}

function convertTHBtoUSD(amount) {
  return amount * EXCHANGE_RATE;
}

async function runValidation() {
  try {
    const userId = await getUserId();
    console.log(`User ID: ${userId}\n`);
    console.log(`Exchange Rate: ${EXCHANGE_RATE.toFixed(6)} (calculated from rent: ${RENT_1_USD} / ${RENT_1_THB})\n`);

    // Query all January 2025 transactions
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        description,
        amount,
        original_currency,
        transaction_type,
        payment_method_id,
        vendors (name),
        payment_methods (name),
        transaction_tags (tags (name))
      `)
      .eq('user_id', userId)
      .gte('transaction_date', '2025-01-01')
      .lte('transaction_date', '2025-01-31')
      .order('transaction_date', { ascending: true });

    if (allError) throw allError;

    console.log('===============================');
    console.log('LEVEL 1: SECTION GRAND TOTALS');
    console.log('===============================\n');

    // Level 1.1: Expense Tracker
    const expenseTrackerTransactions = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      const isFloridaHouse = tags.includes('Florida House');
      const isSavings = tags.includes('Savings') || tags.includes('Investment');
      const isReimbursement = tags.includes('Reimbursement');
      const isIncome = t.transaction_type === 'income';

      // Expense Tracker = all expenses + reimbursements (income), exclude Florida House, exclude Savings
      // But also exclude non-reimbursement income from Gross Income section
      if (isFloridaHouse || isSavings) return false;
      if (t.transaction_type === 'expense') return true;
      if (isIncome && isReimbursement) return true;

      // Check if this is one of the converted income items that should be in Expense Tracker
      // Golf winnings and refunds are in Gross Income section, not Expense Tracker
      const isGrossIncome = isIncome && !isReimbursement;
      if (isGrossIncome) {
        // Check if it's the Apple refund, Golf winnings (converted from negative)
        if (t.merchant === 'Apple' && t.description.includes('Refund')) return false;
        if (t.merchant === 'Sawyer' && t.description.includes('Golf')) return false;
        if (t.merchant === 'Leigh' && t.description.includes('Golf')) return false;
      }

      return !isGrossIncome;
    });

    let expenseTrackerTotal = 0;
    for (const t of expenseTrackerTransactions) {
      let amountUSD = t.amount;
      if (t.original_currency === 'THB') {
        amountUSD = convertTHBtoUSD(t.amount);
      }

      if (t.transaction_type === 'income') {
        expenseTrackerTotal -= amountUSD; // Reimbursements reduce the total
      } else {
        expenseTrackerTotal += amountUSD;
      }
    }

    console.log('1.1 EXPENSE TRACKER SECTION');
    console.log(`Database Total: $${expenseTrackerTotal.toFixed(2)}`);
    console.log(`PDF Grand Total: $6,925.77`);
    console.log(`Difference: $${Math.abs(expenseTrackerTotal - 6925.77).toFixed(2)}`);
    console.log(`Variance: ${((Math.abs(expenseTrackerTotal - 6925.77) / 6925.77) * 100).toFixed(2)}%`);

    const expenseTrackerPass = Math.abs(expenseTrackerTotal - 6925.77) <= 150 ||
                                (Math.abs(expenseTrackerTotal - 6925.77) / 6925.77) <= 0.02;
    console.log(`Status: ${expenseTrackerPass ? '✅ PASS' : '❌ FAIL'}\n`);

    // Level 1.2: Florida House
    const floridaHouseTransactions = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      return tags.includes('Florida House');
    });

    let floridaHouseTotal = 0;
    for (const t of floridaHouseTransactions) {
      let amountUSD = t.amount;
      if (t.original_currency === 'THB') {
        amountUSD = convertTHBtoUSD(t.amount);
      }
      floridaHouseTotal += amountUSD;
    }

    console.log('1.2 FLORIDA HOUSE SECTION');
    console.log(`Database Total: $${floridaHouseTotal.toFixed(2)}`);
    console.log(`PDF Grand Total: $1,123.27`);
    console.log(`Difference: $${Math.abs(floridaHouseTotal - 1123.27).toFixed(2)}`);
    console.log(`Transaction Count: ${floridaHouseTransactions.length} (expected 3)`);

    const floridaHousePass = Math.abs(floridaHouseTotal - 1123.27) <= 5 && floridaHouseTransactions.length === 3;
    console.log(`Status: ${floridaHousePass ? '✅ PASS' : '❌ FAIL'}\n`);

    // Level 1.3: Savings/Investment
    const savingsTransactions = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      return tags.includes('Savings') || tags.includes('Investment');
    });

    let savingsTotal = 0;
    for (const t of savingsTransactions) {
      let amountUSD = t.amount;
      if (t.original_currency === 'THB') {
        amountUSD = convertTHBtoUSD(t.amount);
      }
      savingsTotal += amountUSD;
    }

    console.log('1.3 SAVINGS/INVESTMENT SECTION');
    console.log(`Database Total: $${savingsTotal.toFixed(2)}`);
    console.log(`PDF Grand Total: $0.00`);
    console.log(`Transaction Count: ${savingsTransactions.length} (expected 0)`);

    const savingsPass = savingsTotal === 0 && savingsTransactions.length === 0;
    console.log(`Status: ${savingsPass ? '✅ PASS' : '❌ FAIL'}\n`);

    // Level 1.4: Gross Income
    const grossIncomeTransactions = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      const isReimbursement = tags.includes('Reimbursement');
      const isIncome = t.transaction_type === 'income';

      // Gross Income = all income except reimbursements
      // But ALSO includes the income adjustment that was converted to expense
      return isIncome && !isReimbursement;
    });

    // Also find the income adjustment converted to expense
    const incomeAdjustment = allTransactions.find(t =>
      t.description.includes('Business income correction') &&
      t.transaction_type === 'expense' &&
      t.vendors?.name === 'DSIL Design'
    );

    let grossIncomeTotal = 0;
    for (const t of grossIncomeTransactions) {
      let amountUSD = t.amount;
      if (t.original_currency === 'THB') {
        amountUSD = convertTHBtoUSD(t.amount);
      }
      grossIncomeTotal += amountUSD;
    }

    console.log('1.4 GROSS INCOME SECTION');
    console.log(`Database Income Total: $${grossIncomeTotal.toFixed(2)}`);
    if (incomeAdjustment) {
      console.log(`Income Adjustment (now expense): -$${incomeAdjustment.amount.toFixed(2)}`);
      console.log(`Adjusted Total: $${(grossIncomeTotal - incomeAdjustment.amount).toFixed(2)}`);
    }
    console.log(`PDF Grand Total: $14,468.30`);
    console.log(`Difference: $${Math.abs((grossIncomeTotal - (incomeAdjustment?.amount || 0)) - 14468.30).toFixed(2)}`);
    console.log(`Transaction Count: ${grossIncomeTransactions.length + (incomeAdjustment ? 1 : 0)} (expected 6 in Gross Income section)`);

    // The PDF shows 6 entries, but one is converted to expense, so we expect 5 income + 1 expense
    const expectedGrossIncome = 14468.30;
    const actualAdjustedTotal = grossIncomeTotal - (incomeAdjustment?.amount || 0);
    const grossIncomePass = Math.abs(actualAdjustedTotal - expectedGrossIncome) <= 5;
    console.log(`Status: ${grossIncomePass ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('===============================');
    console.log('LEVEL 2: DAILY SUBTOTALS');
    console.log('===============================\n');

    // PDF daily totals (extracted from PDF)
    const pdfDailyTotals = {
      '2025-01-01': 1027.41,
      '2025-01-02': 659.73,
      '2025-01-03': 80.15,
      '2025-01-04': 29.27,
      '2025-01-05': 161.23,
      '2025-01-06': 247.86,
      '2025-01-07': 71.14,
      '2025-01-08': 65.61,
      '2025-01-09': 66.38,
      '2025-01-10': 95.60,
      '2025-01-11': 210.14,
      '2025-01-12': 98.97,
      '2025-01-13': 10.69,
      '2025-01-14': 43.72,
      '2025-01-15': 82.20,
      '2025-01-16': 116.64,
      '2025-01-17': 76.66,
      '2025-01-18': 605.56,
      '2025-01-19': 76.66,
      '2025-01-20': 198.42,
      '2025-01-21': 77.18,
      '2025-01-22': -4.23,
      '2025-01-23': 274.16,
      '2025-01-24': 891.53,
      '2025-01-25': 118.97,
      '2025-01-26': 74.52,
      '2025-01-27': 145.51,
      '2025-01-28': 48.21,
      '2025-01-29': 113.80,
      '2025-01-30': 20.91,
      '2025-01-31': 1141.17
    };

    // Calculate daily totals from database
    const dbDailyTotals = {};
    for (const t of expenseTrackerTransactions) {
      const date = t.transaction_date;
      if (!dbDailyTotals[date]) {
        dbDailyTotals[date] = 0;
      }

      let amountUSD = t.amount;
      if (t.original_currency === 'THB') {
        amountUSD = convertTHBtoUSD(t.amount);
      }

      if (t.transaction_type === 'income') {
        dbDailyTotals[date] -= amountUSD;
      } else {
        dbDailyTotals[date] += amountUSD;
      }
    }

    console.log('Daily Comparison Table:\n');
    console.log('| Date       | DB Total   | PDF Total  | Difference | Status |');
    console.log('|------------|------------|------------|------------|--------|');

    let within1Dollar = 0;
    let within5Dollars = 0;
    let over100Dollars = 0;
    let maxDifference = 0;

    for (const [date, pdfTotal] of Object.entries(pdfDailyTotals)) {
      const dbTotal = dbDailyTotals[date] || 0;
      const difference = Math.abs(dbTotal - pdfTotal);
      maxDifference = Math.max(maxDifference, difference);

      let status = '✅';
      if (difference <= 1.00) {
        within1Dollar++;
      } else if (difference <= 5.00) {
        within5Dollars++;
        status = '⚠️';
      } else if (difference > 100) {
        over100Dollars++;
        status = '❌';
      } else {
        status = '⚠️';
      }

      console.log(`| ${date} | $${dbTotal.toFixed(2).padStart(9)} | $${pdfTotal.toFixed(2).padStart(9)} | $${difference.toFixed(2).padStart(9)} | ${status} |`);
    }

    console.log('\nDaily Subtotals Summary:');
    console.log(`Days within $1.00: ${within1Dollar}/31 (${((within1Dollar/31)*100).toFixed(1)}%)`);
    console.log(`Days within $5.00: ${within1Dollar + within5Dollars}/31 (${(((within1Dollar + within5Dollars)/31)*100).toFixed(1)}%)`);
    console.log(`Days over $100 variance: ${over100Dollars}`);
    console.log(`Maximum difference: $${maxDifference.toFixed(2)}`);

    const dailyPass = (within1Dollar / 31) >= 0.5 && over100Dollars === 0;
    console.log(`Status: ${dailyPass ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('===============================');
    console.log('LEVEL 3: TRANSACTION COUNT');
    console.log('===============================\n');

    const expenseCount = allTransactions.filter(t => t.transaction_type === 'expense').length;
    const incomeCount = allTransactions.filter(t => t.transaction_type === 'income').length;
    const usdCount = allTransactions.filter(t => t.original_currency === 'USD').length;
    const thbCount = allTransactions.filter(t => t.original_currency === 'THB').length;

    console.log(`Total Transactions: ${allTransactions.length} (expected 195)`);
    console.log(`Expenses: ${expenseCount} (expected 172)`);
    console.log(`Income: ${incomeCount} (expected 23)`);
    console.log(`USD: ${usdCount} (expected 92)`);
    console.log(`THB: ${thbCount} (expected 103)`);

    const countPass = allTransactions.length === 195 &&
                      expenseCount === 172 &&
                      incomeCount === 23 &&
                      usdCount === 92 &&
                      thbCount === 103;
    console.log(`Status: ${countPass ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('===============================');
    console.log('LEVEL 4: TAG DISTRIBUTION');
    console.log('===============================\n');

    const reimbursementCount = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      return tags.includes('Reimbursement');
    }).length;

    const floridaHouseCount = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      return tags.includes('Florida House');
    }).length;

    const businessExpenseCount = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      return tags.includes('Business Expense');
    }).length;

    const savingsCount = allTransactions.filter(t => {
      const tags = t.transaction_tags?.map(tt => tt.tags.name) || [];
      return tags.includes('Savings') || tags.includes('Investment');
    }).length;

    console.log(`Reimbursement: ${reimbursementCount} (expected 15)`);
    console.log(`Florida House: ${floridaHouseCount} (expected 3)`);
    console.log(`Business Expense: ${businessExpenseCount} (expected 3)`);
    console.log(`Savings/Investment: ${savingsCount} (expected 0)`);
    console.log(`Total Tags: ${reimbursementCount + floridaHouseCount + businessExpenseCount + savingsCount} (expected 21)`);

    if (reimbursementCount === 0 || floridaHouseCount === 0 || businessExpenseCount === 0) {
      console.log('❌ CRITICAL ERROR: Some tag counts are 0!');
    }

    const tagPass = reimbursementCount === 15 &&
                    floridaHouseCount === 3 &&
                    businessExpenseCount === 3 &&
                    savingsCount === 0;
    console.log(`Status: ${tagPass ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('===============================');
    console.log('LEVEL 5: CRITICAL TRANSACTIONS');
    console.log('===============================\n');

    // Rent #1
    const rent1 = allTransactions.find(t =>
      t.description === "This Month's Rent" &&
      t.vendors?.name === 'Pol' &&
      t.transaction_date === '2025-01-02'
    );
    console.log('5.1 RENT #1 (Old Apartment)');
    console.log(`Found: ${rent1 ? '✅' : '❌'}`);
    if (rent1) {
      console.log(`  Amount: ${rent1.amount} ${rent1.original_currency} (expected 25000 THB)`);
      console.log(`  Merchant: ${rent1.vendors?.name} (expected Pol)`);
      console.log(`  Date: ${rent1.transaction_date} (expected 2025-01-02)`);
      console.log(`  Status: ${rent1.amount === 25000 && rent1.original_currency === 'THB' ? '✅' : '❌'}`);
    }
    console.log();

    // Rent #2
    const rent2 = allTransactions.find(t =>
      t.description === "First Month's Rent" &&
      t.vendors?.name === 'Landlord' &&
      t.transaction_date === '2025-01-31'
    );
    console.log('5.2 RENT #2 (New Apartment)');
    console.log(`Found: ${rent2 ? '✅' : '❌'}`);
    if (rent2) {
      console.log(`  Amount: ${rent2.amount} ${rent2.original_currency} (expected 35000 THB)`);
      console.log(`  Merchant: ${rent2.vendors?.name} (expected Landlord)`);
      console.log(`  Date: ${rent2.transaction_date} (expected 2025-01-31)`);
      console.log(`  Status: ${rent2.amount === 35000 && rent2.original_currency === 'THB' ? '✅' : '❌'}`);
    }
    console.log();

    // Income adjustment converted to expense
    console.log('5.3 INCOME ADJUSTMENT (Converted to Expense)');
    console.log(`Found: ${incomeAdjustment ? '✅' : '❌'}`);
    if (incomeAdjustment) {
      console.log(`  Description: ${incomeAdjustment.description}`);
      console.log(`  Merchant: ${incomeAdjustment.vendors?.name} (expected DSIL Design)`);
      console.log(`  Amount: $${incomeAdjustment.amount} (expected $602)`);
      console.log(`  Type: ${incomeAdjustment.transaction_type} (expected expense)`);
      console.log(`  Date: ${incomeAdjustment.transaction_date}`);
      console.log(`  Status: ${incomeAdjustment.amount === 602 && incomeAdjustment.transaction_type === 'expense' ? '✅' : '❌'}`);
    }
    console.log();

    // Florida House dates
    console.log('5.4 FLORIDA HOUSE DATES');
    for (const t of floridaHouseTransactions) {
      const isDefaulted = t.transaction_date === '2025-01-31';
      console.log(`  ${t.transaction_date} - ${t.description}: ${isDefaulted ? '⚠️ Defaulted?' : '✅'}`);
    }
    const floridaDatesPass = floridaHouseTransactions.every(t => t.transaction_date !== '2025-01-31' || t.description.includes('Electricity'));
    console.log(`  Status: ${floridaDatesPass ? '✅ All dates valid' : '⚠️ Check dates'}\n`);

    // Largest THB transaction
    const thbTransactions = allTransactions.filter(t => t.original_currency === 'THB' && t.transaction_type === 'expense');
    const largestTHB = thbTransactions.reduce((max, t) => t.amount > max.amount ? t : max, thbTransactions[0]);
    console.log('5.5 LARGEST THB TRANSACTION');
    if (largestTHB) {
      console.log(`  ${largestTHB.transaction_date} - ${largestTHB.description} | ${largestTHB.vendors?.name} | ${largestTHB.amount} THB`);
      console.log(`  USD Equivalent: $${convertTHBtoUSD(largestTHB.amount).toFixed(2)}`);
    }
    console.log();

    // Largest USD transaction
    const usdTransactions = allTransactions.filter(t => t.original_currency === 'USD' && t.transaction_type === 'expense');
    const largestUSD = usdTransactions.reduce((max, t) => t.amount > max.amount ? t : max, usdTransactions[0]);
    console.log('5.6 LARGEST USD TRANSACTION');
    if (largestUSD) {
      console.log(`  ${largestUSD.transaction_date} - ${largestUSD.description} | ${largestUSD.vendors?.name} | $${largestUSD.amount}`);
    }
    console.log();

    // First transaction
    console.log('5.7 FIRST TRANSACTION OF MONTH');
    const first = allTransactions[0];
    if (first) {
      console.log(`  ${first.transaction_date} - ${first.description} | ${first.vendors?.name} | ${first.amount} ${first.original_currency}`);
    }
    console.log();

    // Last transaction
    console.log('5.8 LAST TRANSACTION OF MONTH');
    const last = allTransactions[allTransactions.length - 1];
    if (last) {
      console.log(`  ${last.transaction_date} - ${last.description} | ${last.vendors?.name} | ${last.amount} ${last.original_currency}`);
    }
    console.log();

    const criticalPass = rent1 && rent2 && incomeAdjustment &&
                         rent1.amount === 25000 && rent2.amount === 35000 &&
                         incomeAdjustment && incomeAdjustment.amount === 602 && floridaDatesPass;
    console.log(`Overall Critical Transactions Status: ${criticalPass ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('===============================');
    console.log('FINAL SUMMARY');
    console.log('===============================\n');

    const allPass = expenseTrackerPass && floridaHousePass && savingsPass &&
                    grossIncomePass && dailyPass && countPass && tagPass && criticalPass;

    console.log(`Level 1 - Section Grand Totals: ${expenseTrackerPass && floridaHousePass && savingsPass && grossIncomePass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 2 - Daily Subtotals: ${dailyPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 3 - Transaction Count: ${countPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 4 - Tag Distribution: ${tagPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Level 5 - Critical Transactions: ${criticalPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log();
    console.log(`OVERALL VALIDATION: ${allPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    if (allPass) {
      console.log('✅ January 2025 import is VALIDATED and ready for production use.');
    } else {
      console.log('❌ January 2025 import has discrepancies that need to be reviewed.');
    }

    // Return data for report generation
    return {
      exchangeRate: EXCHANGE_RATE,
      level1: {
        expenseTracker: { db: expenseTrackerTotal, pdf: 6925.77, pass: expenseTrackerPass },
        floridaHouse: { db: floridaHouseTotal, pdf: 1123.27, pass: floridaHousePass, count: floridaHouseTransactions.length },
        savings: { db: savingsTotal, pdf: 0, pass: savingsPass, count: savingsTransactions.length },
        grossIncome: { db: grossIncomeTotal - (incomeAdjustment?.amount || 0), pdf: 14468.30, pass: grossIncomePass }
      },
      level2: {
        dailyTotals: { db: dbDailyTotals, pdf: pdfDailyTotals },
        stats: { within1Dollar, within5Dollars, over100Dollars, maxDifference },
        pass: dailyPass
      },
      level3: {
        total: allTransactions.length,
        expense: expenseCount,
        income: incomeCount,
        usd: usdCount,
        thb: thbCount,
        pass: countPass
      },
      level4: {
        reimbursement: reimbursementCount,
        floridaHouse: floridaHouseCount,
        businessExpense: businessExpenseCount,
        savings: savingsCount,
        pass: tagPass
      },
      level5: {
        rent1, rent2, incomeAdjustment,
        largestTHB, largestUSD,
        first, last,
        pass: criticalPass
      },
      allTransactions,
      overallPass: allPass
    };

  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}

runValidation().catch(console.error);
