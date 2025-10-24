const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

// PDF values - let me check exact transactions from the PDFs
const pdfTransactions = {
  august: [
    { date: '2025-08-01', desc: 'Haircut', thb: 600, usd: 18.30 },
    { date: '2025-08-04', desc: "This Month's Rent", thb: 35000, usd: 1067.50 },
    { date: '2025-08-05', desc: 'Monthly Cleaning', thb: 2782, usd: 85.96 },
    { date: '2025-08-07', desc: 'October Scramble', thb: 9350, usd: 288.92 },
    { date: '2025-08-26', desc: 'CNX Electricity', thb: 4677.36, usd: 144.06 },
  ],
  september: [
    { date: '2025-09-03', desc: 'Reimbursement: Rent', thb: 8000, usd: 248.00 },
    { date: '2025-09-05', desc: "This Month's Rent", thb: 35000, usd: 1081.50 },
    { date: '2025-09-08', desc: 'Monthly Cleaning', thb: 3477.50, usd: 107.80 },
    { date: '2025-09-18', desc: 'CNX Phone Bill', thb: 419.22, usd: 13.21 },
  ]
};

async function checkExactMatch(month, pdfTrans) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${month.toUpperCase()} - EXACT PDF TO DB COMPARISON`);
  console.log(`${'='.repeat(70)}\n`);

  for (const pdf of pdfTrans) {
    // Query for this specific transaction
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('transaction_date', pdf.date)
      .ilike('description', `%${pdf.desc}%`)
      .limit(1);

    if (error) {
      console.error(`Error:`, error);
      continue;
    }

    if (data.length === 0) {
      console.log(`❌ NOT FOUND: ${pdf.date} - ${pdf.desc}`);
      continue;
    }

    const db = data[0];
    const dbAmount = parseFloat(db.amount);

    console.log(`📄 PDF: ${pdf.date} - ${pdf.desc}`);
    console.log(`   Original: THB ${pdf.thb.toLocaleString()}`);
    console.log(`   Converted: $${pdf.usd.toFixed(2)}`);
    console.log(`   Exchange Rate: ${(pdf.thb / pdf.usd).toFixed(2)}`);
    console.log(``);
    console.log(`💾 DB: ${db.description}`);
    console.log(`   Amount: $${dbAmount.toFixed(2)}`);
    console.log(`   Currency: ${db.original_currency}`);
    console.log(`   Original Amount: ${db.original_amount}`);
    console.log(``);

    // Check if matches
    const matchesUSD = Math.abs(dbAmount - pdf.usd) < 0.01;
    const matchesTHB = Math.abs(dbAmount - pdf.thb) < 0.01;

    if (matchesUSD) {
      console.log(`✅ MATCHES USD VALUE ($${pdf.usd}) - CONVERSION CORRECT!`);
    } else if (matchesTHB) {
      console.log(`❌ MATCHES THB VALUE (${pdf.thb}) - NOT CONVERTED!`);
    } else {
      console.log(`⚠️  MATCHES NEITHER - Amount is $${dbAmount.toFixed(2)}`);
    }
    console.log(`${'─'.repeat(70)}\n`);
  }
}

async function main() {
  console.log('\n🔍 VERIFYING EXACT TRANSACTIONS FROM PDF\n');

  await checkExactMatch('August 2025', pdfTransactions.august);
  await checkExactMatch('September 2025', pdfTransactions.september);
}

main();
