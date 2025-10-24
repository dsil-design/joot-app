const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('='.repeat(80));
console.log('MARCH 2025 PRE-FLIGHT ANALYSIS');
console.log('='.repeat(80));
console.log();

// Section boundaries
const sections = {
  expenseTracker: { start: 2100, end: 2409, name: 'Expense Tracker' },
  income: { start: 2410, end: 2423, name: 'Gross Income Tracker' },
  savings: { start: 2424, end: 2428, name: 'Personal Savings & Investments' },
  florida: { start: 2439, end: 2453, name: 'Florida House Expenses' }
};

console.log('📍 SECTION LINE NUMBERS');
console.log('-'.repeat(80));
for (const [key, section] of Object.entries(sections)) {
  console.log(`${section.name}: Lines ${section.start}-${section.end} (${section.end - section.start + 1} lines)`);
}
console.log();

// Analysis structures
const results = {
  expenseTracker: {
    transactions: [],
    reimbursements: [],
    businessExpenses: [],
    reimbursables: [],
    thbTransactions: [],
    usdTransactions: [],
    negativeAmounts: [],
    largeAmounts: [],
    anomalies: []
  },
  income: {
    transactions: []
  },
  savings: {
    transactions: []
  },
  florida: {
    transactions: []
  },
  duplicates: []
};

// Parse Expense Tracker
console.log('🔍 ANALYZING EXPENSE TRACKER (Lines 2100-2409)');
console.log('-'.repeat(80));

let currentDate = null;
for (let i = sections.expenseTracker.start - 1; i < sections.expenseTracker.end; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  if (!line || line.trim() === '') continue;

  const cols = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

  // Check for date rows
  if (cols[0] && cols[0].match(/day,.*2025/i)) {
    currentDate = cols[0];
    continue;
  }

  // Skip header and total rows
  if (line.includes('GRAND TOTAL') || line.includes('Daily Total') ||
      line.includes('Desc,Merchant') || line.includes('Expense Tracker')) {
    continue;
  }

  // Transaction rows have description in col[1]
  if (cols[1] && cols[1].length > 0 && !cols[1].includes('Desc')) {
    const description = cols[1];
    const merchant = cols[2];
    const reimbursableFlag = cols[3];
    const businessFlag = cols[4];
    const paymentMethod = cols[5];
    const thbCol = cols[6];
    const usdCol = cols[7];
    const conversionCol = cols[8];
    const subtotalCol = cols[9];

    // Parse amount and currency
    let amount = 0;
    let currency = 'USD';

    if (thbCol && thbCol.includes('THB')) {
      const match = thbCol.match(/THB\s*([-\d,\.]+)/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        currency = 'THB';
      }
    } else if (usdCol && usdCol.match(/[\$\d]/)) {
      const match = usdCol.match(/\$?\s*([-\d,\.]+)/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        currency = 'USD';
      }
    } else if (subtotalCol && subtotalCol.match(/[\$\d]/)) {
      const match = subtotalCol.match(/\$?\s*([-\d,\.]+)/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        currency = 'USD';
      }
    }

    if (amount !== 0) {
      const transaction = {
        lineNum,
        date: currentDate,
        description,
        merchant,
        amount,
        currency,
        paymentMethod,
        reimbursableFlag,
        businessFlag
      };

      results.expenseTracker.transactions.push(transaction);

      // Track reimbursements
      if (description.toLowerCase().startsWith('reimbursement:')) {
        results.expenseTracker.reimbursements.push(transaction);
      }

      // Track business expenses
      if (businessFlag === 'X' || businessFlag === 'x') {
        results.expenseTracker.businessExpenses.push(transaction);
      }

      // Track reimbursables
      if (reimbursableFlag === 'X' || reimbursableFlag === 'x') {
        results.expenseTracker.reimbursables.push(transaction);
      }

      // Track currency
      if (currency === 'THB') {
        results.expenseTracker.thbTransactions.push(transaction);
      } else {
        results.expenseTracker.usdTransactions.push(transaction);
      }

      // Check for negative amounts (potential issue)
      if (amount < 0 && !description.toLowerCase().startsWith('reimbursement:')) {
        results.expenseTracker.negativeAmounts.push({
          ...transaction,
          issue: 'Negative amount in non-reimbursement transaction'
        });
      }

      // Check for unusually large amounts
      if (currency === 'USD' && amount > 1000 && !description.includes('Florida House')) {
        results.expenseTracker.largeAmounts.push({
          ...transaction,
          issue: 'Large USD amount (>$1000)'
        });
      }

      if (currency === 'THB' && amount > 40000) {
        results.expenseTracker.largeAmounts.push({
          ...transaction,
          issue: 'Large THB amount (>40000)'
        });
      }
    }
  }
}

console.log(`Total transactions found: ${results.expenseTracker.transactions.length}`);
console.log(`Reimbursements: ${results.expenseTracker.reimbursements.length}`);
console.log(`Business Expenses: ${results.expenseTracker.businessExpenses.length}`);
console.log(`Reimbursables (tracking only): ${results.expenseTracker.reimbursables.length}`);
console.log(`THB transactions: ${results.expenseTracker.thbTransactions.length}`);
console.log(`USD transactions: ${results.expenseTracker.usdTransactions.length}`);
console.log();

// Parse Income Tracker
console.log('🔍 ANALYZING GROSS INCOME TRACKER (Lines 2410-2423)');
console.log('-'.repeat(80));

for (let i = sections.income.start - 1; i < sections.income.end; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  if (!line || line.trim() === '') continue;
  if (line.includes('Estimated') || line.includes('GROSS INCOME') || line.includes('Date Receieved')) continue;

  const cols = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

  if (cols[0] && cols[0].match(/2025/) && cols[1] && cols[3]) {
    const date = cols[0];
    const description = cols[1];
    const source = cols[2];
    const amountStr = cols[3];

    const match = amountStr.match(/\$?\s*([\d,\.]+)/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));

      results.income.transactions.push({
        lineNum,
        date,
        description,
        source,
        amount
      });
    }
  }
}

console.log(`Total income transactions: ${results.income.transactions.length}`);
console.log();

// Parse Savings
console.log('🔍 ANALYZING SAVINGS & INVESTMENTS (Lines 2424-2428)');
console.log('-'.repeat(80));

for (let i = sections.savings.start - 1; i < sections.savings.end; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  if (!line || line.trim() === '') continue;
  if (line.includes('TOTAL') || line.includes('Date Made')) continue;

  const cols = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

  if (cols[1] && cols[4]) {
    const description = cols[1];
    const vendor = cols[2];
    const source = cols[3];
    const amountStr = cols[4];

    const match = amountStr.match(/\$?\s*([\d,\.]+)/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));

      if (amount > 0) {
        results.savings.transactions.push({
          lineNum,
          description,
          vendor,
          source,
          amount
        });
      }
    }
  }
}

console.log(`Total savings transactions: ${results.savings.transactions.length}`);
console.log();

// Parse Florida House
console.log('🔍 ANALYZING FLORIDA HOUSE EXPENSES (Lines 2439-2453)');
console.log('-'.repeat(80));

currentDate = null;
for (let i = sections.florida.start - 1; i < sections.florida.end; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  if (!line || line.trim() === '') continue;

  const cols = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

  // Check for date rows
  if (cols[0] && cols[0].match(/day,.*2025/i)) {
    currentDate = cols[0];
    continue;
  }

  if (line.includes('GRAND TOTAL') || line.includes('Desc,Merchant')) continue;

  if (cols[1] && cols[5]) {
    const description = cols[1];
    const merchant = cols[2];
    const reimbursement = cols[3];
    const paymentMethod = cols[4];
    const amountStr = cols[5];

    const match = amountStr.match(/\$?\s*([\d,\.]+)/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));

      results.florida.transactions.push({
        lineNum,
        date: currentDate,
        description,
        merchant,
        amount,
        paymentMethod
      });
    }
  }
}

console.log(`Total Florida House transactions: ${results.florida.transactions.length}`);
console.log();

// Duplicate Detection
console.log('🔍 DUPLICATE DETECTION');
console.log('-'.repeat(80));

results.florida.transactions.forEach(flTx => {
  results.expenseTracker.transactions.forEach(expTx => {
    if (flTx.merchant.toLowerCase() === expTx.merchant.toLowerCase() &&
        Math.abs(flTx.amount - Math.abs(expTx.amount)) < 0.01) {
      results.duplicates.push({
        merchant: flTx.merchant,
        amount: flTx.amount,
        expenseTrackerLine: expTx.lineNum,
        floridaHouseLine: flTx.lineNum,
        expenseDescription: expTx.description,
        floridaDescription: flTx.description,
        recommendation: 'Keep Expense Tracker, review Florida House'
      });
    }
  });
});

if (results.duplicates.length > 0) {
  console.log(`Found ${results.duplicates.length} potential duplicate(s):`);
  results.duplicates.forEach((dup, idx) => {
    console.log(`\n${idx + 1}. ${dup.merchant} - $${dup.amount.toFixed(2)}`);
    console.log(`   Expense Tracker (Line ${dup.expenseTrackerLine}): "${dup.expenseDescription}"`);
    console.log(`   Florida House (Line ${dup.floridaHouseLine}): "${dup.floridaDescription}"`);
    console.log(`   → ${dup.recommendation}`);
  });
} else {
  console.log('No duplicates detected.');
}
console.log();

// RED FLAGS
console.log('🚩 RED FLAGS AND ANOMALIES');
console.log('-'.repeat(80));

let redFlagCount = 0;

// Check for negative amounts
if (results.expenseTracker.negativeAmounts.length > 0) {
  console.log('\n⚠️  NEGATIVE AMOUNTS IN NON-REIMBURSEMENT TRANSACTIONS:');
  results.expenseTracker.negativeAmounts.forEach(tx => {
    console.log(`   Line ${tx.lineNum}: ${tx.description} | ${tx.merchant} | ${tx.currency} ${tx.amount}`);
    redFlagCount++;
  });
}

// Check for large amounts
if (results.expenseTracker.largeAmounts.length > 0) {
  console.log('\n💰 LARGE AMOUNTS (Review for accuracy):');
  results.expenseTracker.largeAmounts.forEach(tx => {
    console.log(`   Line ${tx.lineNum}: ${tx.description} | ${tx.merchant} | ${tx.currency} ${tx.amount.toFixed(2)}`);
    redFlagCount++;
  });
}

// Check for rent transaction
const rentTransactions = results.expenseTracker.transactions.filter(tx =>
  tx.description.toLowerCase().includes('rent') && tx.merchant.toLowerCase().includes('landlord')
);

if (rentTransactions.length > 0) {
  console.log('\n🏠 RENT TRANSACTION(S):');
  rentTransactions.forEach(tx => {
    console.log(`   Line ${tx.lineNum}: ${tx.description} | ${tx.currency} ${tx.amount.toFixed(2)}`);
    if (tx.currency === 'THB' && tx.amount !== 35000) {
      console.log(`   ⚠️  WARNING: Expected THB 35000.00, found THB ${tx.amount.toFixed(2)}`);
      redFlagCount++;
    }
    if (tx.currency === 'USD' && tx.amount > 1100) {
      console.log(`   ⚠️  WARNING: USD rent amount seems high. Should be THB 35000 (~$1020-1074)`);
      redFlagCount++;
    }
  });
}

// Check parsing script
console.log('\n📝 PARSING SCRIPT VERIFICATION:');
const scriptPath = path.join(__dirname, 'parse-march-2025.js');
if (fs.existsSync(scriptPath)) {
  console.log('   ✅ parse-march-2025.js EXISTS');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

  if (scriptContent.includes('row[6]') && scriptContent.includes('THB')) {
    console.log('   ✅ Script uses Column 6 for THB amounts');
  } else {
    console.log('   ⚠️  WARNING: Script may not be using Column 6 for THB');
    redFlagCount++;
  }

  if (scriptContent.includes('row[8]') && scriptContent.includes('amount')) {
    console.log('   ⚠️  WARNING: Script may be using Column 8 (conversion) for amounts');
    redFlagCount++;
  } else {
    console.log('   ✅ Script does not use Column 8 (conversion column)');
  }
} else {
  console.log('   ❌ parse-march-2025.js DOES NOT EXIST - needs to be created');
  redFlagCount++;
}

console.log();
console.log(`Total red flags: ${redFlagCount}`);
console.log();

// Summary
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total Expense Tracker transactions: ${results.expenseTracker.transactions.length}`);
console.log(`Total Income transactions: ${results.income.transactions.length}`);
console.log(`Total Savings transactions: ${results.savings.transactions.length}`);
console.log(`Total Florida House transactions: ${results.florida.transactions.length}`);
console.log(`Potential duplicates: ${results.duplicates.length}`);
console.log();

// Tag distribution
console.log('TAG DISTRIBUTION (Expected):');
console.log(`- Reimbursements: ${results.expenseTracker.reimbursements.length}`);
console.log(`- Business Expenses: ${results.expenseTracker.businessExpenses.length}`);
console.log(`- Reimbursables (tracking only, no tag): ${results.expenseTracker.reimbursables.length}`);
console.log(`- Florida House: ${results.florida.transactions.length}`);
console.log(`- Savings/Investment: ${results.savings.transactions.length}`);
console.log();

// Currency breakdown
console.log('CURRENCY BREAKDOWN:');
console.log(`- THB transactions: ${results.expenseTracker.thbTransactions.length}`);
console.log(`- USD transactions: ${results.expenseTracker.usdTransactions.length}`);
console.log();

// Comparison to previous months
console.log('COMPARISON TO PREVIOUS MONTHS:');
console.log('- September 2025: 159 transactions, 23 reimbursements, ~70 THB');
console.log('- August 2025: 194 transactions, 32 reimbursements, 82 THB');
console.log('- July 2025: 176 transactions, 26 reimbursements, ~90 THB');
console.log('- June 2025: 190 transactions, 27 reimbursements, 85 THB');
console.log('- May 2025: 174 transactions, 16 reimbursements, 89 THB');
console.log('- April 2025: 182 transactions, 22 reimbursements, 93 THB');
console.log(`- March 2025: ${results.expenseTracker.transactions.length} transactions, ${results.expenseTracker.reimbursements.length} reimbursements, ${results.expenseTracker.thbTransactions.length} THB`);
console.log();

// Save results to JSON for further analysis
const outputPath = path.join(__dirname, 'march-2025-preflight-results.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Detailed results saved to: ${outputPath}`);
console.log();
