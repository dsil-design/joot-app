#!/usr/bin/env node

/**
 * Verify July 2025 THB Transactions Against PDF
 *
 * Compares database values with PDF source to ensure original THB amounts
 * were stored correctly (not USD conversions)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USER_EMAIL = 'dennis@dsil.design';

// Sample THB transactions from PDF (page 4) with expected amounts
const PDF_THB_SAMPLES = [
  { date: '2025-07-01', description: 'Reimbursement: Rent', expected: 8000 },
  { date: '2025-07-03', description: "This Month's Rent", expected: 35000 },
  { date: '2025-07-03', description: 'Monthly Cleaning', expected: 3477.5 },
  { date: '2025-07-03', description: 'Extra Taxi', expected: 100 },
  { date: '2025-07-03', description: 'Haircut', expected: 600 },
  { date: '2025-07-03', description: 'Snack', expected: 59 },
  { date: '2025-07-03', description: 'Dinner', expected: 572, merchant: 'Coco Ichiban' },
  { date: '2025-07-03', description: 'Reimbursement: Dinner', expected: 200 },
  { date: '2025-07-03', description: 'Reimbursement: CNX Electricity', expected: 1238 },
  { date: '2025-07-03', description: 'Reimbursement: Wine', expected: 1300 },
  { date: '2025-07-04', description: 'Dinner', expected: 1610, merchant: 'Italian Restaurant' },
  { date: '2025-07-04', description: 'Something', expected: 260 },
  { date: '2025-07-04', description: 'Drinks', expected: 710 },
  { date: '2025-07-05', description: 'Taxi to Hotel', expected: 400, merchant: 'Songthaew' },
  { date: '2025-07-06', description: 'Lunch', expected: 1180, merchant: 'Near Pig Island' },
  { date: '2025-07-06', description: 'Dinner', expected: 620 },
  { date: '2025-07-07', description: 'Coffee', expected: 300 },
  { date: '2025-07-07', description: 'Transfer Fee', expected: 44.76 },
  { date: '2025-07-07', description: 'Coffees', expected: 117 },
  { date: '2025-07-08', description: 'Coffee', expected: 130 },
  { date: '2025-07-08', description: 'Elephant Sanctuary w/ Austin', expected: 3500 },
  { date: '2025-07-08', description: 'Drinks', expected: 160 },
  { date: '2025-07-08', description: 'Gas', expected: 200 },
  { date: '2025-07-09', description: 'Tour: Doi Suthep and DoiPui', expected: 1900 },
  { date: '2025-07-09', description: 'Gas', expected: 370 },
  { date: '2025-07-09', description: 'Game', expected: 10 },
  { date: '2025-07-09', description: 'Phone Cases', expected: 70 },
  { date: '2025-07-09', description: 'Drinks', expected: 85, merchant: 'BuaTong Waterfalls' },
  { date: '2025-07-09', description: 'Tip', expected: 20 },
  { date: '2025-07-09', description: 'Drinks', expected: 640, merchant: 'Chiang Mai Cultural Dinner' },
  { date: '2025-07-10', description: 'Laundry', expected: 220 },
  { date: '2025-07-10', description: 'Souvenirs', expected: 727 },
  { date: '2025-07-10', description: 'Lunch w/ Austin', expected: 696 },
  { date: '2025-07-10', description: 'CNX Water', expected: 158.36 },
  { date: '2025-07-10', description: 'Coffees', expected: 240 },
  { date: '2025-07-10', description: 'Reimbursement: Tea', expected: 70 },
  { date: '2025-07-10', description: 'Reimbursement: Flight BKK-CNX', expected: 1380 },
  { date: '2025-07-19', description: 'Meal Plan', expected: 1000 },
  { date: '2025-07-21', description: 'Lunch', expected: 279 },
  { date: '2025-07-21', description: 'Reimbursement: Lunch', expected: 130 },
  { date: '2025-07-21', description: 'Reimbursement: Groceries', expected: 400 },
  { date: '2025-07-22', description: 'Residency Certificate', expected: 500 },
  { date: '2025-07-22', description: 'Medical Certificate', expected: 200 },
  { date: '2025-07-23', description: 'Water', expected: 15 },
  { date: '2025-07-24', description: 'Gas', expected: 160 },
  { date: '2025-07-25', description: "Driver's License for Car", expected: 205 },
  { date: '2025-07-25', description: 'Coffee', expected: 95 },
  { date: '2025-07-26', description: 'Meal Plan', expected: 1000 },
  { date: '2025-07-26', description: 'Caddy Fee', expected: 400 },
  { date: '2025-07-26', description: 'Drinks', expected: 713 },
  { date: '2025-07-26', description: 'Caddy Tip', expected: 400 },
  { date: '2025-07-26', description: 'Lunch w/ Leigh', expected: 718 },
  { date: '2025-07-26', description: 'Dinner', expected: 2000 },
  { date: '2025-07-27', description: 'Lunch', expected: 178 },
  { date: '2025-07-27', description: 'Coffee', expected: 60 },
  { date: '2025-07-27', description: 'Reimbursement: Groceries', expected: 355 },
  { date: '2025-07-27', description: 'Reimbursement: Flights to US', expected: 16452 },
  { date: '2025-07-27', description: 'Reimbursement: Dinner w Leigh', expected: 500 },
  { date: '2025-07-28', description: 'Reimbursement: Electricity', expected: 1012 },
  { date: '2025-07-28', description: 'Scooter & Motorcycle Wash', expected: 400 },
  { date: '2025-07-28', description: 'Reimbursement: Groceries', expected: 149 },
  { date: '2025-07-28', description: 'Coffee Beans', expected: 290 },
  { date: '2025-07-28', description: 'Coffee Delivery', expected: 100 },
  { date: '2025-07-28', description: 'CNX Electricity', expected: 4039.81 },
  { date: '2025-07-29', description: 'Dry Cleaning', expected: 235 },
  { date: '2025-07-29', description: 'Coffee', expected: 70, merchant: 'Nidnoi' },
  { date: '2025-07-29', description: 'Coffee @ Minimal', expected: 80 },
  { date: '2025-07-31', description: 'Coffee Beans', expected: 125 }
];

async function verifyThbTransactions() {
  console.log('='.repeat(70));
  console.log('JULY 2025 THB VERIFICATION AGAINST PDF');
  console.log('='.repeat(70));
  console.log(`Verifying ${PDF_THB_SAMPLES.length} THB transactions from PDF\n`);

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  let matched = 0;
  let mismatched = 0;
  let missing = 0;
  const errors = [];

  for (const sample of PDF_THB_SAMPLES) {
    // Query for this transaction
    let query = supabase
      .from('transactions')
      .select('id, description, amount, original_currency, transaction_date')
      .eq('user_id', user.id)
      .eq('transaction_date', sample.date)
      .eq('original_currency', 'THB');

    // Match by description (case-insensitive, partial match)
    const { data: txns } = await query;

    const match = txns?.find(t => {
      const descMatch = t.description.toLowerCase().includes(sample.description.toLowerCase());
      if (!sample.merchant) return descMatch;
      return descMatch && t.description.toLowerCase().includes(sample.merchant.toLowerCase());
    });

    if (!match) {
      missing++;
      errors.push({
        type: 'MISSING',
        date: sample.date,
        description: sample.description,
        expected: sample.expected,
        message: 'Transaction not found in database'
      });
      continue;
    }

    const dbAmount = parseFloat(match.amount);
    const pdfAmount = sample.expected;

    if (Math.abs(dbAmount - pdfAmount) < 0.01) {
      matched++;
    } else {
      mismatched++;
      errors.push({
        type: 'MISMATCH',
        date: sample.date,
        description: match.description,
        expected: pdfAmount,
        actual: dbAmount,
        message: `Amount mismatch: Expected ${pdfAmount} THB, got ${dbAmount} THB`
      });
    }
  }

  // Results
  console.log('📊 VERIFICATION RESULTS:');
  console.log(`   ✅ Matched: ${matched}/${PDF_THB_SAMPLES.length}`);
  console.log(`   ❌ Mismatched: ${mismatched}`);
  console.log(`   ⚠️  Missing: ${missing}`);
  console.log();

  if (errors.length > 0) {
    console.log('='.repeat(70));
    console.log('ERRORS FOUND:');
    console.log('='.repeat(70));
    errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. [${err.type}] ${err.date} - ${err.description}`);
      console.log(`   ${err.message}`);
      if (err.expected !== undefined && err.actual !== undefined) {
        console.log(`   Expected: ${err.expected} THB`);
        console.log(`   Actual: ${err.actual} THB`);
        console.log(`   Difference: ${Math.abs(err.expected - err.actual).toFixed(2)} THB`);
      }
    });
    console.log();
  }

  // Sample matches
  if (matched > 0) {
    console.log('='.repeat(70));
    console.log('SAMPLE SUCCESSFUL MATCHES (first 10):');
    console.log('='.repeat(70));

    let shown = 0;
    for (const sample of PDF_THB_SAMPLES) {
      if (shown >= 10) break;

      let query = supabase
        .from('transactions')
        .select('id, description, amount, original_currency, transaction_date')
        .eq('user_id', user.id)
        .eq('transaction_date', sample.date)
        .eq('original_currency', 'THB');

      const { data: txns } = await query;
      const match = txns?.find(t => {
        const descMatch = t.description.toLowerCase().includes(sample.description.toLowerCase());
        if (!sample.merchant) return descMatch;
        return descMatch && t.description.toLowerCase().includes(sample.merchant.toLowerCase());
      });

      if (match && Math.abs(parseFloat(match.amount) - sample.expected) < 0.01) {
        console.log(`✅ ${sample.date} | ${match.description}: ${match.amount} THB`);
        shown++;
      }
    }
    console.log();
  }

  // Final status
  console.log('='.repeat(70));
  const passRate = (matched / PDF_THB_SAMPLES.length) * 100;
  console.log(`PASS RATE: ${passRate.toFixed(1)}% (${matched}/${PDF_THB_SAMPLES.length})`);

  if (passRate === 100) {
    console.log('✅ ALL THB TRANSACTIONS VERIFIED SUCCESSFULLY');
    console.log('✅ Original THB values stored correctly (not USD conversions)');
  } else if (passRate >= 95) {
    console.log('⚠️  MOSTLY VERIFIED - Minor discrepancies found');
  } else {
    console.log('❌ VERIFICATION FAILED - Significant discrepancies detected');
  }
  console.log('='.repeat(70));

  process.exit(passRate >= 95 ? 0 : 1);
}

verifyThbTransactions().catch(error => {
  console.error('❌ Verification error:', error);
  process.exit(1);
});
