require('dotenv').config({ path: '../../../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * PDF→Database Verification for Batch 9: Apr-Jan 2021
 *
 * PDF Pages:
 * - April 2021: page 55
 * - March 2021: page 56
 * - February 2021: page 57
 * - January 2021: page 58
 *
 * Protocol: MASTER-IMPORT-PROTOCOL v4.0
 * Verification: Sample-based (5-6 transactions per month from PDF)
 */

async function verifyPDF() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('========================================');
  console.log('BATCH 9: PDF→DATABASE VERIFICATION');
  console.log('========================================\n');
  console.log('Verifying January-April 2021 against PDF source (pages 55-58)\n');

  // APRIL 2021 - PDF Page 55
  console.log('📄 APRIL 2021 (PDF Page 55)');
  console.log('─'.repeat(70));

  const aprilPdfData = {
    total: 130,
    grandTotal: 2956.36,
    grossIncomeTotal: 5536.37,
    savingsTotal: 800.00,
    sampleTransactions: [
      { date: '2021-04-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
      { date: '2021-04-01', desc: 'Monthly Subscription: NYT', merchant: 'New York Times', amount: 4.00, currency: 'USD' },
      { date: '2021-04-25', desc: 'CNX Rent', merchant: 'Tsvetan', amount: 13000, currency: 'THB' },
      { date: '2021-04-30', desc: 'Annual Subscription: ExpressVPN', merchant: 'ExpressVPN', amount: 99.95, currency: 'USD' },
      { date: '2021-04-15', desc: 'Paycheck', merchant: 'BluJay', amount: 2523.18, currency: 'USD' },
      { date: '2021-04-30', desc: 'Paycheck', merchant: 'BluJay', amount: 2523.19, currency: 'USD' },
    ]
  };

  const { data: aprilDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-04-01')
    .lte('transaction_date', '2021-04-30')
    .order('transaction_date');

  console.log(`PDF Count: ${aprilPdfData.total} transactions`);
  console.log(`DB Count: ${aprilDbData.length} transactions`);

  if (aprilDbData.length === aprilPdfData.total) {
    console.log(`✅ COUNT MATCH (${aprilPdfData.total}/${aprilPdfData.total})\n`);
  } else {
    console.log(`⚠️  COUNT MISMATCH (DB: ${aprilDbData.length}, PDF: ${aprilPdfData.total})\n`);
  }

  console.log('Sample Transaction Verification:');
  let aprilMatches = 0;
  aprilPdfData.sampleTransactions.forEach(sample => {
    const match = aprilDbData.find(t =>
      t.transaction_date === sample.date &&
      t.description.toLowerCase().includes(sample.desc.toLowerCase().substring(0, 10)) &&
      Math.abs(t.amount - Math.abs(sample.amount)) < 0.01 &&
      t.original_currency === sample.currency
    );
    if (match) {
      console.log(`  ✅ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
      aprilMatches++;
    } else {
      console.log(`  ❌ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
    }
  });
  console.log(`\nSample Match Rate: ${aprilMatches}/${aprilPdfData.sampleTransactions.length}\n`);

  // MARCH 2021 - PDF Page 56
  console.log('📄 MARCH 2021 (PDF Page 56)');
  console.log('─'.repeat(70));

  const marchPdfData = {
    total: 111,
    grandTotal: 8050.15,
    grossIncomeTotal: 6545.00,
    savingsTotal: 800.00,
    sampleTransactions: [
      { date: '2021-03-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
      { date: '2021-03-03', desc: 'Flight: JFK - BKK', merchant: 'Asiana Airlines', amount: 1063.80, currency: 'USD' },
      { date: '2021-03-09', desc: 'ASQ Hotel', merchant: 'Lohas Residence', amount: 52000, currency: 'THB' },
      { date: '2021-03-25', desc: 'CNX Rent', merchant: 'Tsvetan', amount: 13000, currency: 'THB' },
      { date: '2021-03-15', desc: 'Paycheck', merchant: 'BluJay', amount: 2510.19, currency: 'USD' },
      { date: '2021-03-31', desc: 'Paycheck', merchant: 'BluJay', amount: 2510.18, currency: 'USD' },
    ]
  };

  const { data: marchDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-03-01')
    .lte('transaction_date', '2021-03-31')
    .order('transaction_date');

  console.log(`PDF Count: ${marchPdfData.total} transactions`);
  console.log(`DB Count: ${marchDbData.length} transactions`);

  if (marchDbData.length === marchPdfData.total) {
    console.log(`✅ COUNT MATCH (${marchPdfData.total}/${marchPdfData.total})\n`);
  } else {
    console.log(`⚠️  COUNT MISMATCH (DB: ${marchDbData.length}, PDF: ${marchPdfData.total})\n`);
  }

  console.log('Sample Transaction Verification:');
  let marchMatches = 0;
  marchPdfData.sampleTransactions.forEach(sample => {
    const match = marchDbData.find(t =>
      t.transaction_date === sample.date &&
      t.description.toLowerCase().includes(sample.desc.toLowerCase().substring(0, 10)) &&
      Math.abs(t.amount - Math.abs(sample.amount)) < 0.01 &&
      t.original_currency === sample.currency
    );
    if (match) {
      console.log(`  ✅ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
      marchMatches++;
    } else {
      console.log(`  ❌ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
    }
  });
  console.log(`\nSample Match Rate: ${marchMatches}/${marchPdfData.sampleTransactions.length}\n`);

  // FEBRUARY 2021 - PDF Page 57
  console.log('📄 FEBRUARY 2021 (PDF Page 57)');
  console.log('─'.repeat(70));

  const februaryPdfData = {
    total: 159,
    grandTotal: 3220.25,
    grossIncomeTotal: 5340.37,
    savingsTotal: 800.00,
    sampleTransactions: [
      { date: '2021-02-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
      { date: '2021-02-08', desc: 'Visa Extension', merchant: 'Thai Immigration', amount: 1900, currency: 'THB' },
      { date: '2021-02-12', desc: 'COVID Test', merchant: 'CM Mediclinic', amount: 3350, currency: 'THB' },
      { date: '2021-02-25', desc: 'CNX Rent', merchant: 'Tsvetan', amount: 13000, currency: 'THB' },
      { date: '2021-02-12', desc: 'Paycheck', merchant: 'BluJay', amount: 2510.19, currency: 'USD' },
      { date: '2021-02-26', desc: 'Paycheck', merchant: 'BluJay', amount: 2510.18, currency: 'USD' },
    ]
  };

  const { data: februaryDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-02-01')
    .lte('transaction_date', '2021-02-28')
    .order('transaction_date');

  console.log(`PDF Count: ${februaryPdfData.total} transactions`);
  console.log(`DB Count: ${februaryDbData.length} transactions`);

  if (februaryDbData.length === februaryPdfData.total) {
    console.log(`✅ COUNT MATCH (${februaryPdfData.total}/${februaryPdfData.total})\n`);
  } else {
    console.log(`⚠️  COUNT MISMATCH (DB: ${februaryDbData.length}, PDF: ${februaryPdfData.total})\n`);
  }

  console.log('Sample Transaction Verification:');
  let februaryMatches = 0;
  februaryPdfData.sampleTransactions.forEach(sample => {
    const match = februaryDbData.find(t =>
      t.transaction_date === sample.date &&
      t.description.toLowerCase().includes(sample.desc.toLowerCase().substring(0, 10)) &&
      Math.abs(t.amount - Math.abs(sample.amount)) < 0.01 &&
      t.original_currency === sample.currency
    );
    if (match) {
      console.log(`  ✅ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
      februaryMatches++;
    } else {
      console.log(`  ❌ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
    }
  });
  console.log(`\nSample Match Rate: ${februaryMatches}/${februaryPdfData.sampleTransactions.length}\n`);

  // JANUARY 2021 - PDF Page 58
  console.log('📄 JANUARY 2021 (PDF Page 58)');
  console.log('─'.repeat(70));

  const januaryPdfData = {
    total: 161,
    grandTotal: 3129.35,
    grossIncomeTotal: 5150.71,
    savingsTotal: 800.00,
    sampleTransactions: [
      { date: '2021-01-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
      { date: '2021-01-11', desc: 'Motorcycle Wheel Replacements', merchant: 'Honda', amount: 5006, currency: 'THB' },
      { date: '2021-01-25', desc: 'CNX Rent', merchant: 'Tsvetan', amount: 13000, currency: 'THB' },
      { date: '2021-01-25', desc: 'Coworking Space', merchant: 'Punspace', amount: 83.47, currency: 'USD' },
      { date: '2021-01-15', desc: 'Paycheck', merchant: 'BluJay', amount: 2510.19, currency: 'USD' },
      { date: '2021-01-29', desc: 'Paycheck', merchant: 'BluJay', amount: 2510.18, currency: 'USD' },
    ]
  };

  const { data: januaryDbData } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, vendors(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-01-01')
    .lte('transaction_date', '2021-01-31')
    .order('transaction_date');

  console.log(`PDF Count: ${januaryPdfData.total} transactions`);
  console.log(`DB Count: ${januaryDbData.length} transactions`);

  if (januaryDbData.length === januaryPdfData.total) {
    console.log(`✅ COUNT MATCH (${januaryPdfData.total}/${januaryPdfData.total})\n`);
  } else {
    console.log(`⚠️  COUNT MISMATCH (DB: ${januaryDbData.length}, PDF: ${januaryPdfData.total})\n`);
  }

  console.log('Sample Transaction Verification:');
  let januaryMatches = 0;
  januaryPdfData.sampleTransactions.forEach(sample => {
    const match = januaryDbData.find(t =>
      t.transaction_date === sample.date &&
      t.description.toLowerCase().includes(sample.desc.toLowerCase().substring(0, 10)) &&
      Math.abs(t.amount - Math.abs(sample.amount)) < 0.01 &&
      t.original_currency === sample.currency
    );
    if (match) {
      console.log(`  ✅ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
      januaryMatches++;
    } else {
      console.log(`  ❌ ${sample.date} | ${sample.desc} | ${sample.amount} ${sample.currency}`);
    }
  });
  console.log(`\nSample Match Rate: ${januaryMatches}/${januaryPdfData.sampleTransactions.length}\n`);

  // FINAL SUMMARY
  console.log('========================================');
  console.log('BATCH 9 VERIFICATION SUMMARY');
  console.log('========================================\n');

  const totalSamples = aprilPdfData.sampleTransactions.length +
                       marchPdfData.sampleTransactions.length +
                       februaryPdfData.sampleTransactions.length +
                       januaryPdfData.sampleTransactions.length;
  const totalMatches = aprilMatches + marchMatches + februaryMatches + januaryMatches;
  const totalTransactions = aprilDbData.length + marchDbData.length + februaryDbData.length + januaryDbData.length;
  const expectedTransactions = aprilPdfData.total + marchPdfData.total + februaryPdfData.total + januaryPdfData.total;

  console.log(`Total Months: 4 (January-April 2021)`);
  console.log(`PDF Pages: 55-58`);
  console.log(`Expected Transactions: ${expectedTransactions}`);
  console.log(`Database Transactions: ${totalTransactions}`);
  console.log(`Sample Transactions Verified: ${totalSamples}`);
  console.log(`Sample Matches: ${totalMatches}/${totalSamples}`);

  if (totalTransactions === expectedTransactions && totalMatches === totalSamples) {
    console.log('\n✅ VERIFICATION PASSED');
    console.log('All transaction counts match PDF');
    console.log('All sample transactions verified');
    console.log('\nSTATUS: ✅ PDF→DB CHAIN VERIFIED');
  } else {
    console.log('\n⚠️  VERIFICATION ISSUES DETECTED');
    if (totalTransactions !== expectedTransactions) {
      console.log(`- Transaction count mismatch: ${totalTransactions} vs ${expectedTransactions}`);
    }
    if (totalMatches !== totalSamples) {
      console.log(`- Sample transaction mismatches: ${totalSamples - totalMatches} failed`);
    }
  }

  console.log('\n========================================\n');
}

verifyPDF().catch(console.error);
