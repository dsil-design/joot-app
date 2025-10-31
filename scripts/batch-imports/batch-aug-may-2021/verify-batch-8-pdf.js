require('dotenv').config({ path: '../../../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * PDF→Database Verification for Batch 8
 *
 * PDF Pages:
 * - August 2021: page 51
 * - July 2021: page 52
 * - June 2021: page 53
 * - May 2021: page 54
 */

async function verifyPDF() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('========================================');
  console.log('BATCH 8: PDF→DATABASE VERIFICATION');
  console.log('========================================\n');
  console.log('Verifying May-August 2021 against PDF source\n');

  // August 2021 - Manual extraction from PDF page 51
  console.log('📄 AUGUST 2021 (PDF Page 51)');
  console.log('─'.repeat(70));

  const augustPdfData = {
    expenseTracker: 141,  // Per PDF: GRAND TOTAL row minus income rows
    grossIncome: 2,       // Per PDF: 2 BluJay paychecks
    savings: 2,           // Per PDF: 2 Vanguard transactions
    total: 145,
    grandTotal: 2926.49,
    grossIncomeTotal: 5046.35,
    savingsTotal: 800.00,
    sampleTransactions: [
      { date: '2021-08-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
      { date: '2021-08-01', desc: 'This Month\'s Rent', merchant: 'Jatu (Landlord)', amount: 19500, currency: 'THB' },
      { date: '2021-08-01', desc: 'Electricity Bill', merchant: 'Jatu (Landlord)', amount: 3492, currency: 'THB' },
      { date: '2021-08-25', desc: 'Lunch Yuriko', merchant: 'Bangkok Bank Account', amount: -250, currency: 'THB' }, // Refund
      { date: '2021-08-31', desc: 'Drinks', merchant: 'Number One', amount: 850, currency: 'THB' }, // Last transaction
    ]
  };

  // Get database transactions for August 2021
  const { data: augustDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-08-01')
    .lte('transaction_date', '2021-08-31')
    .order('transaction_date');

  console.log(`PDF Count: ${augustPdfData.total} transactions`);
  console.log(`DB Count: ${augustDbData.length} transactions`);

  if (augustDbData.length === augustPdfData.total) {
    console.log(`✅ COUNT MATCH (${augustPdfData.total}/${augustPdfData.total})\n`);
  } else {
    console.log(`⚠️  COUNT MISMATCH (DB: ${augustDbData.length}, PDF: ${augustPdfData.total})\n`);
  }

  // Verify sample transactions
  console.log('Sample Transaction Verification:');
  let augustMatches = 0;
  augustPdfData.sampleTransactions.forEach(sample => {
    const match = augustDbData.find(t =>
      t.transaction_date === sample.date &&
      t.description.toLowerCase().includes(sample.desc.toLowerCase().substring(0, 10)) &&
      Math.abs(t.amount - Math.abs(sample.amount)) < 0.01 &&
      t.original_currency === sample.currency
    );
    if (match) {
      console.log(`  ✅ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
      augustMatches++;
    } else {
      console.log(`  ❌ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
    }
  });
  console.log(`  Sample Match Rate: ${augustMatches}/${augustPdfData.sampleTransactions.length}\n`);

  // Summary for remaining months (to be extracted from PDFs)
  console.log('─'.repeat(70));
  console.log('📄 JULY 2021 (PDF Page 52)');
  console.log('─'.repeat(70));

  const { data: julyDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-07-01')
    .lte('transaction_date', '2021-07-31')
    .order('transaction_date');

  console.log(`DB Count: ${julyDbData.length} transactions`);
  console.log('Status: ⏳ Awaiting PDF extraction\n');

  console.log('─'.repeat(70));
  console.log('📄 JUNE 2021 (PDF Page 53)');
  console.log('─'.repeat(70));

  const { data: juneDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-06-01')
    .lte('transaction_date', '2021-06-30')
    .order('transaction_date');

  console.log(`DB Count: ${juneDbData.length} transactions`);
  console.log('Status: ⏳ Awaiting PDF extraction\n');

  console.log('─'.repeat(70));
  console.log('📄 MAY 2021 (PDF Page 54)');
  console.log('─'.repeat(70));

  const { data: mayDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-05-01')
    .lte('transaction_date', '2021-05-31')
    .order('transaction_date');

  console.log(`DB Count: ${mayDbData.length} transactions`);
  console.log('Status: ⏳ Awaiting PDF extraction\n');

  console.log('========================================');
  console.log('BATCH 8 PDF VERIFICATION STATUS');
  console.log('========================================\n');
  console.log(`August 2021: ${augustDbData.length === augustPdfData.total ? '✅ VERIFIED' : '⚠️  NEEDS REVIEW'}`);
  console.log(`July 2021: ⏳ PDF extraction needed (page 52)`);
  console.log(`June 2021: ⏳ PDF extraction needed (page 53)`);
  console.log(`May 2021: ⏳ PDF extraction needed (page 54)\n`);

  console.log('Next Steps:');
  console.log('1. Review PDF pages 52-54 for July, June, May 2021');
  console.log('2. Extract transaction counts and sample data');
  console.log('3. Complete verification for all 4 months\n');
}

verifyPDF();
