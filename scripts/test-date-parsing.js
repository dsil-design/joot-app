// Test date parsing differences between CSV and PDF parsers

// CSV date parser
function parseTransactionDateCSV(dateString) {
  const datePart = dateString.split(', ').slice(1).join(', ');
  const date = new Date(datePart);
  return date.toISOString().split('T')[0];
}

// PDF date parser
function parseTransactionDatePDF(dateString) {
  const match = dateString.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (!match) return null;

  const monthName = match[2];
  const day = match[3];
  const year = match[4];

  const monthNum = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
  const monthStr = String(monthNum).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');

  return `${year}-${monthStr}-${dayStr}`;
}

const testDate = 'Wednesday, October 1, 2025';
console.log('Input:', testDate);
console.log('CSV parser:', parseTransactionDateCSV(testDate));
console.log('PDF parser:', parseTransactionDatePDF(testDate));
console.log('');

// Check some actual data from CSV
const fs = require('fs');
const csvData = JSON.parse(fs.readFileSync('verification-output/csv-transactions.json', 'utf-8'));
const pdfData = JSON.parse(fs.readFileSync('verification-output/pdf-transactions.json', 'utf-8'));

console.log('CSV Sept 30 count:', csvData.transactions.filter(t => t.date === '2025-09-30').length);
console.log('CSV Oct 1 count:', csvData.transactions.filter(t => t.date === '2025-10-01').length);
console.log('PDF Sept 30 count:', pdfData.transactions.filter(t => t.date === '2025-09-30').length);
console.log('PDF Oct 1 count:', pdfData.transactions.filter(t => t.date === '2025-10-01').length);
