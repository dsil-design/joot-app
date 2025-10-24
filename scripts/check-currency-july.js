const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/july-2025-CORRECTED.json', 'utf-8'));

const thb = data.filter(t => t.original_currency === 'THB');
const usd = data.filter(t => !t.original_currency || t.original_currency === 'USD');

console.log('THB transactions:', thb.length);
console.log('USD transactions (no original_currency):', usd.length);
console.log('Total:', data.length);
console.log('');

// Show some THB examples
console.log('THB examples:');
thb.slice(0, 3).forEach(t => {
  console.log(`  ${t.date} - ${t.description} - THB ${t.original_amount} = USD ${t.amount}`);
});

console.log('');
console.log('USD examples:');
usd.slice(0, 3).forEach(t => {
  console.log(`  ${t.date} - ${t.description} - USD ${t.amount}`);
});
