const fs = require('fs');
const lines = fs.readFileSync('/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv', 'utf-8').split(/\r?\n/);

function parseCSV(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  let cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
  const isNegative = amountStr.includes('(') && amountStr.includes(')');
  if (isNegative) {
    cleaned = '-' + cleaned.replace(/-/g, '');
  }
  return parseFloat(cleaned);
}

// Test line 6098 (array index 6097) - Google Email
console.log('='.repeat(60));
console.log('Testing Line 6098 (Google Email)');
console.log('='.repeat(60));

const row = parseCSV(lines[6097]);
console.log('\nParsed row:');
console.log('  [1] description:', row[1]);
console.log('  [2] merchant:', row[2]);
console.log('  [5] payment:', row[5]);
console.log('  [6] THB col:', row[6]);
console.log('  [7] USD col:', JSON.stringify(row[7]));
console.log('  [9] subtotal:', row[9]);

console.log('\nChecking parser logic:');
console.log('  row[1] exists?:', !!row[1]);
console.log('  row[1] === ""?:', row[1] === '');
console.log('  row[1] includes Daily Total?:', row[1].includes('Daily Total'));

console.log('\nCurrency extraction:');
console.log('  row[6] && row[6].includes("THB")?:', row[6] && row[6].includes('THB'));
console.log('  row[7] && row[7].trim() !== ""?:', row[7] && row[7].trim() !== '');

if (row[7] && row[7].trim() !== '') {
  console.log('  parseAmount(row[7]):', parseAmount(row[7]));
}

// Now test line 6299 - T-Mobile
console.log('\n' + '='.repeat(60));
console.log('Testing Line 6299 (T-Mobile)');
console.log('='.repeat(60));

const row2 = parseCSV(lines[6298]);
console.log('\nParsed row:');
console.log('  [1] description:', row2[1]);
console.log('  [2] merchant:', row2[2]);
console.log('  [5] payment:', row2[5]);
console.log('  [7] USD col:', JSON.stringify(row2[7]));

console.log('\nChecking parser logic:');
console.log('  row[1] exists?:', !!row2[1]);
console.log('  row[7] && row[7].trim() !== ""?:', row2[7] && row2[7].trim() !== '');

if (row2[7] && row2[7].trim() !== '') {
  console.log('  parseAmount(row[7]):', parseAmount(row2[7]));
}
