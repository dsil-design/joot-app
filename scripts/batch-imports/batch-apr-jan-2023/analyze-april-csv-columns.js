const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../../../csv_imports/fullImport_20251017.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('APRIL 2023 CSV COLUMN ANALYSIS');
console.log('='.repeat(70));

let usdColumnTotal = 0;
let subtotalColumnTotal = 0;
let lineCount = 0;

// Parse lines 8198-8473
for (let i = 8197; i < 8473; i++) {
  const line = lines[i];
  if (!line || !line.startsWith(',')) continue;

  const parts = line.split(',');
  if (parts.length < 10) continue;
  if (parts[1] === 'Desc') continue; // Header
  if (!parts[1] || parts[1].trim() === '') continue; // Empty description

  const usd = parts[7];
  const subtotal = parts[9];

  // Parse USD value (column 7)
  let usdValue = 0;
  if (usd && usd.includes('$')) {
    usdValue = parseFloat(usd.replace(/[\$,\t]/g, ''));
  }

  // Parse subtotal (column 9)
  let subtotalValue = 0;
  if (subtotal) {
    subtotalValue = parseFloat(subtotal.replace(/[\$,]/g, ''));
  }

  if (!isNaN(usdValue) && usdValue !== 0) {
    usdColumnTotal += usdValue;
  }

  if (!isNaN(subtotalValue) && subtotalValue !== 0) {
    subtotalColumnTotal += subtotalValue;
    lineCount++;
  }
}

console.log(`\nLines processed: ${lineCount}`);
console.log(`\nColumn 7 (USD) total: $${usdColumnTotal.toFixed(2)}`);
console.log(`Column 9 (Subtotal) total: $${subtotalColumnTotal.toFixed(2)}`);
console.log(`\nPDF GRAND TOTAL: $6,408.20`);
console.log(`\nSubtotal column variance: $${(subtotalColumnTotal - 6408.20).toFixed(2)}`);
console.log(`USD column variance: $${(usdColumnTotal - 6408.20).toFixed(2)}`);
console.log(`\nDatabase USD expenses (excl. savings): $4,537.05`);
console.log(`Database variance from USD column: $${(4537.05 - usdColumnTotal).toFixed(2)}`);
