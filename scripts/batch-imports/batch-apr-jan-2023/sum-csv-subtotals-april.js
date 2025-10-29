const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, '../../../csv_imports/fullImport_20251017.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('APRIL 2023 CSV SUBTOTAL ANALYSIS');
console.log('='.repeat(70));
console.log('\nAnalyzing lines 8198-8459 (April expenses)\n');

// Lines 8198-8459 are April expenses (0-indexed: 8197-8458)
let total = 0;
let usdOnlyTotal = 0;
let thbConversionTotal = 0;
let lineCount = 0;

for (let i = 8197; i < 8459; i++) {
  const line = lines[i];
  if (!line || !line.startsWith(',')) continue;

  const parts = line.split(',');
  // Column structure: 0=empty, 1=Desc, 2=Merchant, 3=Reimbursable, 4=MyBusExp,
  //                   5=PaymentType, 6=THB, 7=USD, 8=Conversion, 9=Subtotal

  if (parts.length < 10) continue;
  if (parts[1] === 'Desc') continue; // Skip header
  if (parts[1] === '' && parts[2] === '') continue; // Skip empty lines

  const subtotal = parts[9];
  const usd = parts[7];
  const thb = parts[6];

  // Parse subtotal (remove $ and commas)
  const subtotalValue = parseFloat(subtotal.replace(/[\$,]/g, ''));
  const usdValue = parseFloat(usd.replace(/[\$,]/g, '') || '0');

  if (!isNaN(subtotalValue) && subtotalValue !== 0) {
    total += subtotalValue;
    lineCount++;

    // Track if this is USD-only or includes THB conversion
    if (thb && thb.includes('THB') && thb !== 'THB') {
      thbConversionTotal += subtotalValue;
      console.log(`THB line: ${parts[1].substring(0, 40).padEnd(40)} | THB: ${thb.padEnd(15)} | Subtotal: $${subtotalValue.toFixed(2)}`);
    } else if (usdValue > 0) {
      usdOnlyTotal += subtotalValue;
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY:');
console.log(`  Total lines processed: ${lineCount}`);
console.log(`  USD-only total: $${usdOnlyTotal.toFixed(2)}`);
console.log(`  THB conversion total: $${thbConversionTotal.toFixed(2)}`);
console.log(`  Combined CSV total: $${total.toFixed(2)}`);
console.log(`  PDF GRAND TOTAL: $6,408.20`);
console.log(`  Variance: $${(total - 6408.20).toFixed(2)}`);
console.log('\n' + '='.repeat(70));
console.log('FINDING:');
console.log('  The PDF GRAND TOTAL includes BOTH:');
console.log('    1. USD expenses');
console.log('    2. THB expenses converted using CSV column 8 rates');
console.log('  Our database only sums USD expenses (THB stored separately)');
console.log('  This explains the variance.');
