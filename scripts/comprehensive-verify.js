const fs = require('fs');
const path = require('path');

// Read the database transactions
const dbTransactions = JSON.parse(fs.readFileSync('scripts/db_transactions_nov2024.json', 'utf8'));

console.log('Database Transactions Summary:');
console.log('='.repeat(100));
console.log(`Total: ${dbTransactions.length}`);

// Group by date
const byDate = {};
dbTransactions.forEach(tx => {
  const date = tx.transaction_date;
  if (!byDate[date]) byDate[date] = [];
  byDate[date].push(tx);
});

console.log('\nBreakdown by date:');
Object.keys(byDate).sort().forEach(date => {
  console.log(`  ${date}: ${byDate[date].length} transactions`);
});

// Check special cases
console.log('\n' + '='.repeat(100));
console.log('SPECIAL CASES CHECK:');
console.log('='.repeat(100));

// Check for refunds (negative amounts)
const refunds = dbTransactions.filter(tx => tx.amount < 0);
console.log(`\nRefunds found: ${refunds.length}`);
refunds.forEach((ref, idx) => {
  console.log(`${idx + 1}. [${ref.transaction_date}] ${ref.description} @ ${ref.merchant}: ${ref.amount} ${ref.currency}`);
});

// Check for $0 transactions
const zeroTxns = dbTransactions.filter(tx => tx.amount === 0);
console.log(`\n$0 transactions found: ${zeroTxns.length}`);
zeroTxns.forEach((tx, idx) => {
  console.log(`${idx + 1}. [${tx.transaction_date}] ${tx.description} @ ${tx.merchant}`);
});

// Check for THB transactions
const thbTxns = dbTransactions.filter(tx => tx.currency === 'THB');
console.log(`\nTHB transactions found: ${thbTxns.length}`);
thbTxns.forEach((tx, idx) => {
  console.log(`${idx + 1}. [${tx.transaction_date}] ${tx.description} @ ${tx.merchant}: ${tx.amount} ${tx.currency}`);
});

// Check for large amounts
const large = dbTransactions.filter(tx => Math.abs(tx.amount) >= 500).sort((a, b) => b.amount - a.amount);
console.log(`\nLarge transactions (>=500): ${large.length}`);
large.slice(0, 10).forEach((tx, idx) => {
  console.log(`${idx + 1}. [${tx.transaction_date}] ${tx.description} @ ${tx.merchant}: ${tx.amount} ${tx.currency}`);
});

// Count by merchant
const merchants = {};
dbTransactions.forEach(tx => {
  const merchant = tx.merchant || 'Unknown';
  merchants[merchant] = (merchants[merchant] || 0) + 1;
});

console.log(`\n${Object.keys(merchants).length} unique merchants`);
const topMerchants = Object.entries(merchants).sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('Top merchants:');
topMerchants.forEach(([merchant, count], idx) => {
  console.log(`${idx + 1}. ${merchant}: ${count}`);
});
