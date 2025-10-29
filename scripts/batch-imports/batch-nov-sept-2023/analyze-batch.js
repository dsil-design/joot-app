// Comprehensive Batch Pre-Flight Analysis Script
// November-October-September 2023
// This script analyzes CSV structure, counts transactions, identifies red flags

const fs = require('fs');
const path = require('path');

const CSV_PATH = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';

// Line ranges from manual inspection
const BATCH_CONFIG = {
  november: {
    month: 'November 2023',
    sections: {
      expenseTracker: { start: 6538, end: 6674 },
      grossIncome: { start: 6677, end: 6685 },
      savings: { start: 6688, end: 6690 },
      deficit: { start: 6692, end: 6697 },
      takeHome: { start: 6699, end: 6700 }
    },
    pdfPage: 24,
    expectedGrandTotal: '$5,753.38',
    expectedIncome: '$6,010.10',
    expectedSavings: '$341.67'
  },
  october: {
    month: 'October 2023',
    sections: {
      expenseTracker: { start: 6704, end: 6877 },
      grossIncome: { start: 6880, end: 6889 },
      savings: { start: 6892, end: 6894 },
      deficit: { start: 6896, end: 6901 },
      takeHome: { start: 6903, end: 6904 }
    },
    pdfPage: 25,
    expectedGrandTotal: '$5,561.33',
    expectedIncome: '$6,305.30',
    expectedSavings: '$341.67'
  },
  september: {
    month: 'September 2023',
    sections: {
      expenseTracker: { start: 6908, end: 7146 },
      grossIncome: { start: 7149, end: 7157 },
      savings: { start: 7160, end: 7162 },
      deficit: { start: 7164, end: 7169 },
      takeHome: { start: 7171, end: 7172 }
    },
    pdfPage: 26,
    expectedGrandTotal: '$7,283.71',
    expectedIncome: '$6,299.49',
    expectedSavings: '$341.67'
  }
};

function analyzeMonth(monthKey) {
  const config = BATCH_CONFIG[monthKey];
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n');

  console.log('\n================================================================================');
  console.log('ANALYZING: ' + config.month.toUpperCase());
  console.log('================================================================================\n');

  const results = {
    month: config.month,
    pdfPage: config.pdfPage,
    expectedTotals: {
      grandTotal: config.expectedGrandTotal,
      income: config.expectedIncome,
      savings: config.expectedSavings
    },
    sections: {},
    redFlags: {
      negative: [],
      commaFormatted: [],
      dualRent: [],
      thbTransactions: [],
      reimbursements: [],
      businessExpense: [],
      largeAmounts: []
    },
    currencyDistribution: { USD: 0, THB: 0 },
    summary: {}
  };

  // Analyze Expense Tracker
  const expStart = config.sections.expenseTracker.start - 1;
  const expEnd = config.sections.expenseTracker.end - 1;
  let transactionCount = 0;
  let thbCount = 0;
  let usdCount = 0;

  for (let i = expStart; i <= expEnd; i++) {
    const line = lines[i];
    if (!line || line.trim() === '' || line.includes('Daily Total') ||
        line.includes('GRAND TOTAL') || line.includes('Expense Tracker')) continue;

    // Skip header and empty date rows
    const fields = line.split(',');
    if (fields[1] && fields[1].trim() && !fields[1].includes('Desc')) {
      transactionCount++;

      // Check for THB
      if (line.includes('THB')) {
        thbCount++;
        results.redFlags.thbTransactions.push({
          line: i + 1,
          description: fields[1],
          amount: fields[6] || fields[7]
        });
      } else if (fields[7] || fields[9]) {
        usdCount++;
      }

      // Check for negative amounts
      if (line.includes('(') && line.includes(')') || line.includes('-$')) {
        results.redFlags.negative.push({
          line: i + 1,
          description: fields[1],
          amount: fields[7] || fields[9]
        });
      }

      // Check for comma-formatted amounts
      if (line.match(/\$\s*[0-9,]+\.[0-9]{2}/) && line.includes(',')) {
        const match = line.match(/\$\s*([0-9,]+\.[0-9]{2})/);
        if (match && match[1].includes(',')) {
          results.redFlags.commaFormatted.push({
            line: i + 1,
            description: fields[1],
            amount: match[1]
          });
        }
      }

      // Check for rent (dual rent pattern)
      if (fields[1] && fields[1].toLowerCase().includes('rent')) {
        results.redFlags.dualRent.push({
          line: i + 1,
          description: fields[1],
          merchant: fields[2],
          amount: (fields[6] && fields[6].includes('THB')) ? fields[6] : (fields[7] || fields[9]),
          currency: (fields[6] && fields[6].includes('THB')) ? 'THB' : 'USD'
        });
      }

      // Check for reimbursements
      if (fields[1] && fields[1].match(/[Rr]e[im]*burs/)) {
        results.redFlags.reimbursements.push({
          line: i + 1,
          description: fields[1],
          merchant: fields[2],
          amount: fields[7] || fields[9]
        });
      }

      // Check for large amounts (>$500)
      const amountStr = (fields[7] || fields[9] || '').replace(/[\$,]/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 500) {
        results.redFlags.largeAmounts.push({
          line: i + 1,
          description: fields[1],
          amount: amount,
          formatted: fields[7] || fields[9]
        });
      }
    }
  }

  results.sections.expenseTracker = {
    lineRange: config.sections.expenseTracker.start + '-' + config.sections.expenseTracker.end,
    rawLines: (config.sections.expenseTracker.end - config.sections.expenseTracker.start + 1),
    transactionCount,
    usdCount,
    thbCount
  };

  results.currencyDistribution.USD = usdCount;
  results.currencyDistribution.THB = thbCount;
  results.currencyDistribution.thbPercent = ((thbCount / (usdCount + thbCount)) * 100).toFixed(1);

  // Analyze Gross Income
  const incStart = config.sections.grossIncome.start - 1;
  const incEnd = config.sections.grossIncome.end - 1;
  let incomeCount = 0;

  for (let i = incStart; i <= incEnd; i++) {
    const line = lines[i];
    const fields = line.split(',');
    if (fields[1] && fields[1].trim() && !fields[1].includes('Description') &&
        !line.includes('Subtotal') && !line.includes('TOTAL')) {
      incomeCount++;
    }
  }

  results.sections.grossIncome = {
    lineRange: config.sections.grossIncome.start + '-' + config.sections.grossIncome.end,
    transactionCount: incomeCount
  };

  // Analyze Savings
  const savStart = config.sections.savings.start - 1;
  const savEnd = config.sections.savings.end - 1;
  let savingsCount = 0;

  for (let i = savStart; i <= savEnd; i++) {
    const line = lines[i];
    const fields = line.split(',');
    if (fields[1] && fields[1].trim() && !fields[1].includes('Description') && !line.includes('TOTAL')) {
      savingsCount++;
    }
  }

  results.sections.savings = {
    lineRange: config.sections.savings.start + '-' + config.sections.savings.end,
    transactionCount: savingsCount
  };

  // Summary
  results.summary = {
    totalExpenses: transactionCount,
    totalIncome: incomeCount,
    totalSavings: savingsCount,
    totalTransactions: transactionCount + incomeCount + savingsCount,
    expectedTotal: transactionCount + incomeCount + savingsCount
  };

  return results;
}

// Analyze all three months
console.log('\n================================================================================');
console.log('BATCH PRE-FLIGHT ANALYSIS: November-October-September 2023');
console.log('================================================================================');

const novemberResults = analyzeMonth('november');
const octoberResults = analyzeMonth('october');
const septemberResults = analyzeMonth('september');

// Output results
const outputPath = '/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-nov-sept-2023';
fs.writeFileSync(
  path.join(outputPath, 'analysis-results.json'),
  JSON.stringify({ november: novemberResults, october: octoberResults, september: septemberResults }, null, 2)
);

console.log('\n================================================================================');
console.log('BATCH SUMMARY');
console.log('================================================================================');
console.log('\nNovember 2023: ' + novemberResults.summary.totalTransactions + ' transactions (' + novemberResults.currencyDistribution.thbPercent + '% THB)');
console.log('October 2023:  ' + octoberResults.summary.totalTransactions + ' transactions (' + octoberResults.currencyDistribution.thbPercent + '% THB)');
console.log('September 2023: ' + septemberResults.summary.totalTransactions + ' transactions (' + septemberResults.currencyDistribution.thbPercent + '% THB)');
console.log('\nTotal Batch: ' + (novemberResults.summary.totalTransactions + octoberResults.summary.totalTransactions + septemberResults.summary.totalTransactions) + ' transactions');

console.log('\n================================================================================');
console.log('CRITICAL RED FLAGS');
console.log('================================================================================');

console.log('\nDUAL RENT PATTERN (USA MONTHS):');
console.log('   November: ' + novemberResults.redFlags.dualRent.length + ' rents');
novemberResults.redFlags.dualRent.forEach(r => {
  console.log('     - Line ' + r.line + ': ' + r.merchant + ' - ' + r.amount + ' (' + r.currency + ')');
});
console.log('   October: ' + octoberResults.redFlags.dualRent.length + ' rents');
octoberResults.redFlags.dualRent.forEach(r => {
  console.log('     - Line ' + r.line + ': ' + r.merchant + ' - ' + r.amount + ' (' + r.currency + ')');
});
console.log('   September: ' + septemberResults.redFlags.dualRent.length + ' rents');
septemberResults.redFlags.dualRent.forEach(r => {
  console.log('     - Line ' + r.line + ': ' + r.merchant + ' - ' + r.amount + ' (' + r.currency + ')');
});

console.log('\nNEGATIVE AMOUNTS (must convert to positive income):');
console.log('   November: ' + novemberResults.redFlags.negative.length + ' negatives');
console.log('   October: ' + octoberResults.redFlags.negative.length + ' negatives');
console.log('   September: ' + septemberResults.redFlags.negative.length + ' negatives');

console.log('\nCOMMA-FORMATTED AMOUNTS (enhanced parsing needed):');
console.log('   November: ' + novemberResults.redFlags.commaFormatted.length + ' amounts');
console.log('   October: ' + octoberResults.redFlags.commaFormatted.length + ' amounts');
console.log('   September: ' + septemberResults.redFlags.commaFormatted.length + ' amounts');

console.log('\nAnalysis complete. Results saved to analysis-results.json\n');
