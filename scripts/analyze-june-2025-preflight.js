const fs = require('fs');
const path = require('path');

// Pre-flight analysis for June 2025 data
// Comprehensive validation before parsing

const CSV_PATH = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');

// Month mapping
const MONTHS = {
  'January': '01', 'February': '02', 'March': '03', 'April': '04',
  'May': '05', 'June': '06', 'July': '07', 'August': '08',
  'September': '09', 'October': '10', 'November': '11', 'December': '12'
};

// Parse date in format "Monday, June 1, 2025" or "6/1/2025"
function parseDate(dateStr) {
  if (!dateStr) return null;

  const fullDateMatch = dateStr.match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (fullDateMatch) {
    const [, month, day, year] = fullDateMatch;
    const monthNum = MONTHS[month];
    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthNum}-${dayPadded}`;
  }

  const slashDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDateMatch) {
    const [, month, day, year] = slashDateMatch;
    const monthPadded = month.padStart(2, '0');
    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthPadded}-${dayPadded}`;
  }

  return null;
}

// Parse amount
function parseAmount(amountStr) {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[$,]/g, '').replace(/THB\s*/g, '').trim();
  if (cleaned.match(/^\(.*\)$/)) {
    return -parseFloat(cleaned.replace(/[()]/g, ''));
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Check if row should be skipped
function shouldSkipRow(row, description) {
  if (!description || description.trim() === '') return true;
  const skipKeywords = [
    'Daily Total', 'GRAND TOTAL', 'Estimated', 'Subtotal',
    'TOTAL', 'GROSS INCOME TOTAL', 'ACTUAL GRAND TOTAL',
    'Estimated (Remaining) Subtotal', 'Estimated Grand Total'
  ];
  return skipKeywords.some(keyword => description.includes(keyword));
}

// Check if string is a date row
function isDateRow(str) {
  if (!str) return false;
  return /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/.test(str);
}

// Basic CSV line parser
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Main analysis
function analyzeJune2025() {
  console.log('='.repeat(80));
  console.log('JUNE 2025 PRE-FLIGHT ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n');

  const report = {
    sections: {},
    transactions: [],
    duplicates: [],
    tags: {
      reimbursements: 0,
      businessExpense: 0,
      floridaHouse: 0,
      savingsInvestment: 0,
      reimbursables: 0
    },
    currencies: {
      USD: 0,
      THB: 0,
      mixed: 0
    },
    anomalies: [],
    warnings: []
  };

  // SECTION 1: Expense Tracker (1232-1478)
  console.log('ANALYZING SECTION 1: Expense Tracker');
  let currentDate = null;
  let rawCount = 0;
  let validCount = 0;
  const expenseTrackerTransactions = [];

  for (let i = 1232; i <= 1478; i++) {
    const line = lines[i - 1];
    if (!line) continue;

    const row = parseCSVLine(line);

    // Date row
    if (row[0] && isDateRow(row[0])) {
      currentDate = parseDate(row[0]);
      continue;
    }

    const description = row[1];
    if (!description || description.trim() === '') continue;

    rawCount++;

    if (shouldSkipRow(row, description)) continue;

    const merchant = row[2];
    const reimbursable = row[3]; // X = reimbursable (tracking only, NO tag)
    const businessExpense = row[4]; // X = business expense (TAG)
    const paymentMethod = row[5];
    const thbAmount = row[6];
    const usdAmount = row[7];
    const conversionCol = row[8]; // IGNORE
    const subtotal = row[9];

    // Track reimbursables (Column 3 = X)
    if (reimbursable === 'X' || reimbursable === 'x') {
      report.tags.reimbursables++;
    }

    // Track business expenses (Column 4 = X)
    if (businessExpense === 'X' || businessExpense === 'x') {
      report.tags.businessExpense++;
    }

    // Track reimbursements (description starts with "Reimbursement:")
    if (description.toLowerCase().startsWith('reimbursement:')) {
      report.tags.reimbursements++;
    }

    // Currency detection
    let currency = null;
    let amount = null;

    if (thbAmount && thbAmount.includes('THB')) {
      const match = thbAmount.match(/THB\s*([\d,.-]+)/);
      if (match) {
        amount = parseAmount(match[1]);
        currency = 'THB';
        report.currencies.THB++;
      }
    } else if (usdAmount) {
      amount = parseAmount(usdAmount);
      currency = 'USD';
      report.currencies.USD++;
    }

    if (amount === null) {
      report.anomalies.push({
        line: i,
        issue: 'Missing amount',
        description,
        merchant
      });
      continue;
    }

    validCount++;

    expenseTrackerTransactions.push({
      line: i,
      date: currentDate,
      description: description.trim(),
      merchant: merchant ? merchant.trim() : description.trim(),
      amount: Math.abs(amount),
      currency,
      reimbursable: reimbursable === 'X' || reimbursable === 'x',
      businessExpense: businessExpense === 'X' || businessExpense === 'x',
      isReimbursement: description.toLowerCase().startsWith('reimbursement:')
    });
  }

  report.sections.expenseTracker = {
    lineRange: '1232-1478',
    rawCount,
    validCount,
    transactions: expenseTrackerTransactions
  };

  console.log(`  Line Range: 1232-1478`);
  console.log(`  Raw Count: ${rawCount}`);
  console.log(`  Valid Transactions: ${validCount}`);
  console.log();

  // SECTION 2: Gross Income Tracker (1479-1486)
  console.log('ANALYZING SECTION 2: Gross Income Tracker');
  rawCount = 0;
  validCount = 0;

  for (let i = 1479; i <= 1486; i++) {
    const line = lines[i - 1];
    if (!line) continue;

    const row = parseCSVLine(line);
    const description = row[1];

    if (!description || description.trim() === '') continue;
    rawCount++;

    if (shouldSkipRow(row, description)) continue;

    const dateStr = row[0];
    const source = row[2];
    const amountStr = row[3];

    const date = parseDate(dateStr);
    const amount = parseAmount(amountStr);

    if (!date || !amount) continue;

    validCount++;
    report.currencies.USD++;
  }

  report.sections.grossIncome = {
    lineRange: '1479-1486',
    rawCount,
    validCount
  };

  console.log(`  Line Range: 1479-1486`);
  console.log(`  Raw Count: ${rawCount}`);
  console.log(`  Valid Transactions: ${validCount}`);
  console.log();

  // SECTION 3: Personal Savings & Investments (1487-1491)
  console.log('ANALYZING SECTION 3: Personal Savings & Investments');
  rawCount = 0;
  validCount = 0;

  for (let i = 1487; i <= 1491; i++) {
    const line = lines[i - 1];
    if (!line) continue;

    const row = parseCSVLine(line);
    const description = row[1];

    if (!description || description.trim() === '') continue;
    rawCount++;

    if (shouldSkipRow(row, description)) continue;

    const dateStr = row[0];
    const vendor = row[2];
    const source = row[3];
    const amountStr = row[4];

    const date = parseDate(dateStr);
    const amount = parseAmount(amountStr);

    if (!date || !amount) continue;

    validCount++;
    report.tags.savingsInvestment++;
    report.currencies.USD++;
  }

  report.sections.savings = {
    lineRange: '1487-1491',
    rawCount,
    validCount
  };

  console.log(`  Line Range: 1487-1491`);
  console.log(`  Raw Count: ${rawCount}`);
  console.log(`  Valid Transactions: ${validCount}`);
  console.log();

  // SECTION 4: Florida House Expenses (1502-1519)
  console.log('ANALYZING SECTION 4: Florida House Expenses');
  rawCount = 0;
  validCount = 0;
  currentDate = null;
  const floridaHouseTransactions = [];

  for (let i = 1502; i <= 1519; i++) {
    const line = lines[i - 1];
    if (!line) continue;

    const row = parseCSVLine(line);

    // Date row
    if (row[0] && isDateRow(row[0])) {
      currentDate = parseDate(row[0]);
      continue;
    }

    const description = row[1];
    if (!description || description.trim() === '') continue;
    rawCount++;

    if (shouldSkipRow(row, description)) continue;

    const merchant = row[2];
    const reimbursement = row[3];
    const paymentMethod = row[4];
    const amountStr = row[5];

    const amount = parseAmount(amountStr);

    if (!amount || amount === 0) {
      // Check for missing amount (FL Internet line)
      if (description.includes('Internet') || merchant.includes('Xfinity')) {
        report.anomalies.push({
          line: i,
          issue: 'Missing amount in Florida House section',
          description,
          merchant,
          note: 'Likely duplicate with Expense Tracker line (FL Internet Bill - Xfinity - $73.00)'
        });
      }
      continue;
    }

    validCount++;
    report.tags.floridaHouse++;
    report.currencies.USD++;

    floridaHouseTransactions.push({
      line: i,
      date: currentDate,
      description: description.trim(),
      merchant: merchant ? merchant.trim() : description.trim(),
      amount: Math.abs(amount)
    });
  }

  report.sections.floridaHouse = {
    lineRange: '1502-1519',
    rawCount,
    validCount,
    transactions: floridaHouseTransactions
  };

  console.log(`  Line Range: 1502-1519`);
  console.log(`  Raw Count: ${rawCount}`);
  console.log(`  Valid Transactions: ${validCount}`);
  console.log();

  // DUPLICATE DETECTION
  console.log('DETECTING DUPLICATES...');

  // Compare Expense Tracker vs Florida House
  for (const fhTxn of floridaHouseTransactions) {
    for (const etTxn of expenseTrackerTransactions) {
      // Check for same merchant and amount
      const merchantMatch = fhTxn.merchant.toLowerCase() === etTxn.merchant.toLowerCase();
      const amountMatch = Math.abs(fhTxn.amount - etTxn.amount) < 0.01;

      // Check if dates are within 3 days or same month
      let dateMatch = false;
      if (fhTxn.date && etTxn.date) {
        const fhDate = new Date(fhTxn.date);
        const etDate = new Date(etTxn.date);
        const daysDiff = Math.abs((fhDate - etDate) / (1000 * 60 * 60 * 24));
        dateMatch = daysDiff <= 3;
      }

      if (merchantMatch && amountMatch) {
        report.duplicates.push({
          expenseTrackerLine: etTxn.line,
          expenseTrackerDesc: etTxn.description,
          expenseTrackerDate: etTxn.date,
          floridaHouseLine: fhTxn.line,
          floridaHouseDesc: fhTxn.description,
          floridaHouseDate: fhTxn.date,
          merchant: fhTxn.merchant,
          amount: fhTxn.amount,
          dateMatch,
          action: 'KEEP Expense Tracker, REMOVE Florida House'
        });
      }
    }
  }

  console.log(`  Found ${report.duplicates.length} potential duplicate(s)`);
  console.log();

  // VERIFY RENT TRANSACTION
  console.log('VERIFYING RENT TRANSACTION...');
  const rentTxn = expenseTrackerTransactions.find(t =>
    t.description.toLowerCase().includes('rent') &&
    t.merchant.toLowerCase().includes('landlord')
  );

  if (rentTxn) {
    console.log(`  Found rent transaction at line ${rentTxn.line}`);
    console.log(`  Currency: ${rentTxn.currency}`);
    console.log(`  Amount: ${rentTxn.amount.toFixed(2)}`);

    if (rentTxn.currency === 'THB' && rentTxn.amount === 35000) {
      console.log(`  ✅ CORRECT: Rent is THB 35,000.00 (NOT USD)`);
    } else if (rentTxn.currency === 'USD' && rentTxn.amount > 1000) {
      report.warnings.push({
        severity: 'CRITICAL',
        issue: 'Rent transaction currency mismatch',
        line: rentTxn.line,
        expected: 'THB 35,000.00',
        actual: `${rentTxn.currency} ${rentTxn.amount.toFixed(2)}`,
        action: 'Verify parsing script uses Column 6 for THB (NOT Column 8 conversion)'
      });
      console.log(`  ❌ ERROR: Rent is stored as ${rentTxn.currency} ${rentTxn.amount.toFixed(2)}`);
      console.log(`  Expected: THB 35,000.00`);
    }
  }
  console.log();

  return report;
}

// Generate comprehensive report
function generateReport(report) {
  const totalRaw = Object.values(report.sections).reduce((sum, s) => sum + s.rawCount, 0);
  const totalValid = Object.values(report.sections).reduce((sum, s) => sum + s.validCount, 0);

  let output = `# JUNE 2025 PRE-FLIGHT REPORT

**Generated:** ${new Date().toISOString()}
**Source:** csv_imports/fullImport_20251017.csv
**Reference PDF:** csv_imports/Master Reference PDFs/Budget for Import-page5.pdf

---

## 1. Section Line Numbers & Transaction Counts

| Section | Line Range | Raw Count | Valid Count | Notes |
|---------|------------|-----------|-------------|-------|
| **Expense Tracker** | ${report.sections.expenseTracker.lineRange} | ${report.sections.expenseTracker.rawCount} | ${report.sections.expenseTracker.validCount} | Includes dates, headers, totals |
| **Gross Income Tracker** | ${report.sections.grossIncome.lineRange} | ${report.sections.grossIncome.rawCount} | ${report.sections.grossIncome.validCount} | Single income transaction |
| **Personal Savings & Investments** | ${report.sections.savings.lineRange} | ${report.sections.savings.rawCount} | ${report.sections.savings.validCount} | Emergency savings |
| **Florida House Expenses** | ${report.sections.floridaHouse.lineRange} | ${report.sections.floridaHouse.rawCount} | ${report.sections.floridaHouse.validCount} | Includes 1 missing amount |
| **TOTAL** | - | **${totalRaw}** | **${totalValid}** | Before deduplication |

---

## 2. Expected Totals from PDF (Source of Truth)

### From PDF Budget for Import-page5.pdf:

| Section | Grand Total |
|---------|-------------|
| **Expense Tracker NET** | **$6,347.08** |
| **Gross Income** | $175.00 |
| **Savings/Investment** | $341.67 |
| **Florida House** | $344.28 |

### Expected Total Calculation:

\`\`\`
Expected Total = Expense Tracker NET + Florida House + Savings
               = $6,347.08 + $344.28 + $341.67
               = $7,033.03
\`\`\`

**Note:** Gross Income is already factored into Expense Tracker NET (as reimbursements reduce expenses).

---

## 3. Duplicate Detection Results

${report.duplicates.length === 0 ? '**No duplicates detected** between Expense Tracker and Florida House sections.\n\n**Note:** One missing amount detected in Florida House section (FL Internet - Xfinity) which likely indicates a duplicate that should be removed.' : ''}

${report.duplicates.length > 0 ? `**Found ${report.duplicates.length} potential duplicate(s):**

${report.duplicates.map((dup, idx) => `
### Duplicate ${idx + 1}: ${dup.merchant} - $${dup.amount.toFixed(2)}

- **Expense Tracker (Line ${dup.expenseTrackerLine}):**
  - Description: ${dup.expenseTrackerDesc}
  - Date: ${dup.expenseTrackerDate}
  - **Action:** ✅ KEEP

- **Florida House (Line ${dup.floridaHouseLine}):**
  - Description: ${dup.floridaHouseDesc}
  - Date: ${dup.floridaHouseDate}
  - **Action:** ❌ REMOVE

- **Date Match:** ${dup.dateMatch ? 'Yes (within 3 days)' : 'No (same month only)'}
`).join('\n')}` : ''}

### Missing Amount Issue:

One transaction in Florida House section has **no amount**:
- **Line ~1513:** FL Internet - Xfinity - **(no amount)**
- **Likely Duplicate:** Expense Tracker has "FL Internet Bill - Xfinity - $73.00" at line 1380
- **Action:** Florida House version should be skipped (already missing amount)

---

## 4. Tag Distribution Preview

| Tag Type | Count | Source |
|----------|-------|--------|
| **Reimbursements** | ${report.tags.reimbursements} | Description starts with "Reimbursement:" (income type) |
| **Business Expenses** | ${report.tags.businessExpense} | Column 4 has "X" (expense with tag) |
| **Reimbursables** | ${report.tags.reimbursables} | Column 3 has "X" (tracking only, NO tag) |
| **Florida House** | ${report.tags.floridaHouse} | From Florida House section (expense with tag) |
| **Savings/Investment** | ${report.tags.savingsInvestment} | From Savings section (expense with tag) |

---

## 5. Currency Breakdown

| Currency | Count | Percentage |
|----------|-------|------------|
| **USD** | ${report.currencies.USD} | ${((report.currencies.USD / (report.currencies.USD + report.currencies.THB)) * 100).toFixed(1)}% |
| **THB** | ${report.currencies.THB} | ${((report.currencies.THB / (report.currencies.USD + report.currencies.THB)) * 100).toFixed(1)}% |
| **Total** | ${report.currencies.USD + report.currencies.THB} | 100% |

**Critical Verification:**
- ✅ Rent transaction should be: **THB 35,000.00** (NOT ~$1,074)
- ✅ Parsing must use **Column 6** for THB amounts
- ❌ Parsing must **NOT use Column 8** (conversion column)

---

## 6. Parsing Script Verification

`;

  // Check parsing script
  const parsingScriptPath = path.join(__dirname, 'parse-june-2025.js');
  if (fs.existsSync(parsingScriptPath)) {
    const scriptContent = fs.readFileSync(parsingScriptPath, 'utf-8');

    const usesColumn6 = scriptContent.includes('row[6]') && scriptContent.includes("includes('THB')");
    const usesColumn7 = scriptContent.includes('row[7]');
    const usesColumn8Incorrectly = scriptContent.includes('row[8]') && !scriptContent.includes('IGNORE');
    const hasSubtotalFallback = scriptContent.includes('row[9]');

    output += `**Status:** Script found at \`scripts/parse-june-2025.js\`

### Verification Checklist:

- [${usesColumn6 ? 'x' : ' '}] Uses Column 6 for THB amount detection
- [${usesColumn7 ? 'x' : ' '}] Uses Column 7 for USD amount
- [${hasSubtotalFallback ? 'x' : ' '}] Uses Column 9 (Subtotal) as fallback
- [${!usesColumn8Incorrectly ? 'x' : ' '}] Does NOT use Column 8 (conversion column)

${!usesColumn6 || usesColumn8Incorrectly ? '⚠️ **WARNING:** Parsing script may have issues with currency extraction!' : '✅ **VERIFIED:** Parsing script uses correct columns for currency extraction.'}

`;
  } else {
    output += `**Status:** ⚠️ Script NOT found at \`scripts/parse-june-2025.js\`

**Action Required:** Create parsing script following FINAL_PARSING_RULES.md

`;
  }

  output += `---

## 7. Comparison to Previous Months

| Month | Total Transactions | Reimbursements | THB Transactions | Notes |
|-------|-------------------|----------------|------------------|-------|
| **June 2025** | **${totalValid}** | **${report.tags.reimbursements}** | **${report.currencies.THB}** | Current analysis |
| September 2025 | 159 | 23 | ~70 | Reference |
| August 2025 | 225 | 32 | 82 | Reference |
| July 2025 | 176 | 26 | ~90 | Reference |
| May 2025 | ~180 | ~25 | ~75 | Estimated |

### Structural Differences:

`;

  // Analyze differences
  const septTransactions = 159;
  const septReimbursements = 23;
  const septTHB = 70;

  const txnDiff = totalValid - septTransactions;
  const reimbDiff = report.tags.reimbursements - septReimbursements;
  const thbDiff = report.currencies.THB - septTHB;

  if (Math.abs(txnDiff) > 30) {
    output += `- ⚠️ **Transaction count ${txnDiff > 0 ? 'higher' : 'lower'} than September** by ${Math.abs(txnDiff)} transactions\n`;
  } else {
    output += `- ✅ Transaction count within normal range (${txnDiff > 0 ? '+' : ''}${txnDiff} vs September)\n`;
  }

  if (Math.abs(reimbDiff) > 10) {
    output += `- ⚠️ **Reimbursement count ${reimbDiff > 0 ? 'higher' : 'lower'} than September** by ${Math.abs(reimbDiff)} reimbursements\n`;
  } else {
    output += `- ✅ Reimbursement count within normal range (${reimbDiff > 0 ? '+' : ''}${reimbDiff} vs September)\n`;
  }

  if (Math.abs(thbDiff) > 20) {
    output += `- ⚠️ **THB transaction count ${thbDiff > 0 ? 'higher' : 'lower'} than September** by ${Math.abs(thbDiff)} transactions\n`;
  } else {
    output += `- ✅ THB transaction count within normal range (${thbDiff > 0 ? '+' : ''}${thbDiff} vs September)\n`;
  }

  output += `
---

## 8. Anomalies & Data Quality Issues

`;

  if (report.anomalies.length === 0) {
    output += `✅ **No anomalies detected**

All transactions have valid amounts and dates.

`;
  } else {
    output += `**Found ${report.anomalies.length} anomaly/anomalies:**

${report.anomalies.map((anomaly, idx) => `
${idx + 1}. **Line ${anomaly.line}:** ${anomaly.issue}
   - Description: ${anomaly.description}
   - Merchant: ${anomaly.merchant}
   ${anomaly.note ? `- Note: ${anomaly.note}` : ''}
`).join('\n')}
`;
  }

  output += `---

## 9. Red Flags for Human Review

`;

  if (report.warnings.length === 0) {
    output += `✅ **No critical warnings**

Data appears structurally sound for import.

`;
  } else {
    output += `${report.warnings.map((warning, idx) => `
### ${idx + 1}. ${warning.issue} (${warning.severity})

- **Line:** ${warning.line}
- **Expected:** ${warning.expected}
- **Actual:** ${warning.actual}
- **Action:** ${warning.action}
`).join('\n')}
`;
  }

  output += `---

## 10. Parsing Strategy Recommendations

### Pre-Import Actions:

1. **Duplicate Handling:**
   - Remove Florida House "FL Internet" entry (missing amount anyway)
   - If Ring subscription duplicate exists, keep Expense Tracker version

2. **Currency Verification:**
   - Verify parsing script uses Column 6 for THB (e.g., "THB 35000.00")
   - Verify parsing script uses Column 7/9 for USD (e.g., "$1,000.00")
   - Do NOT use Column 8 (conversion column - labeled "Conversion (THB to USD)")

3. **Tag Application:**
   - Reimbursements: ${report.tags.reimbursements} transactions (description starts with "Reimbursement:")
   - Business Expenses: ${report.tags.businessExpense} transactions (Column 4 = "X")
   - Florida House: ${report.tags.floridaHouse} transactions (from Florida House section)
   - Savings/Investment: ${report.tags.savingsInvestment} transaction (from Savings section)
   - Reimbursables: ${report.tags.reimbursables} transactions (Column 3 = "X" - NO TAG, tracking only)

4. **Expected Outcomes:**
   - Total transactions after deduplication: ~${totalValid - 1}
   - Expense Tracker NET should match: $6,347.08 (±1.5%)
   - All sections combined NET: ~$7,033.03

### Import Order:

1. Expense Tracker (${report.sections.expenseTracker.validCount} transactions)
2. Gross Income (${report.sections.grossIncome.validCount} transaction)
3. Savings/Investment (${report.sections.savings.validCount} transaction)
4. Florida House (${report.sections.floridaHouse.validCount} transactions - 1 duplicate = ${report.sections.floridaHouse.validCount - 1})

---

## Summary

**Status:** ${report.warnings.length === 0 ? '✅ READY FOR PARSING' : '⚠️ NEEDS REVIEW'}

- **Total Transactions (raw):** ${totalValid}
- **After Deduplication:** ~${totalValid - 1}
- **Expected NET Total:** $6,347.08 (Expense Tracker only)
- **Expected Combined Total:** $7,033.03 (all sections)
- **Duplicates to Remove:** ${report.duplicates.length + 1} (includes missing amount entry)
- **Critical Issues:** ${report.warnings.length}

${report.warnings.length === 0 ? `
**Next Steps:**
1. Verify parsing script correctness
2. Run \`node scripts/parse-june-2025.js\`
3. Review parse report for accuracy
4. Import to database using \`scripts/db/import-month.js\`
` : `
**Action Required:**
1. Review critical warnings above
2. Fix parsing script if needed
3. Re-run pre-flight analysis
4. Proceed only after warnings are resolved
`}

---

**End of Pre-Flight Report**
`;

  return output;
}

// Main execution
const report = analyzeJune2025();
const reportContent = generateReport(report);

const OUTPUT_PATH = path.join(__dirname, 'JUNE-2025-PREFLIGHT-REPORT.md');
fs.writeFileSync(OUTPUT_PATH, reportContent);

console.log('='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('Summary:');
console.log(`  Total Raw Transactions: ${Object.values(report.sections).reduce((s, sec) => s + sec.rawCount, 0)}`);
console.log(`  Total Valid Transactions: ${Object.values(report.sections).reduce((s, sec) => s + sec.validCount, 0)}`);
console.log(`  Duplicates Detected: ${report.duplicates.length}`);
console.log(`  Anomalies: ${report.anomalies.length}`);
console.log(`  Warnings: ${report.warnings.length}`);
console.log();
console.log(`Report written to: ${OUTPUT_PATH}`);
console.log();
