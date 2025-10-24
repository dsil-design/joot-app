#!/usr/bin/env node

/**
 * Verify Tags Script
 * Checks if tags are properly applied to transactions
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTags() {
  console.log('🔍 Verifying Tags for September 2025\n');
  console.log('='.repeat(80));

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const dennis = users.users.find(u => u.email === 'dennis@dsil.design');

  if (!dennis) {
    console.error('❌ User not found!');
    return;
  }

  // Get all tags
  console.log('\n📋 Available Tags:');
  const { data: allTags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', dennis.id);

  allTags.forEach(tag => {
    console.log(`  - ${tag.name} (${tag.color})`);
  });

  // Get September transactions with tags
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      transaction_type,
      transaction_date,
      transaction_tags (
        tag_id,
        tags (
          id,
          name,
          color
        )
      )
    `)
    .eq('user_id', dennis.id)
    .gte('transaction_date', '2025-09-01')
    .lt('transaction_date', '2025-10-01')
    .order('transaction_date', { ascending: false });

  // Count by tag type
  const tagStats = {
    'Reimbursement': 0,
    'Florida House': 0,
    'Savings/Investment': 0,
    'No Tags': 0
  };

  transactions.forEach(t => {
    const tags = t.transaction_tags?.map(tt => tt.tags?.name).filter(Boolean) || [];
    if (tags.length === 0) {
      tagStats['No Tags']++;
    } else {
      tags.forEach(tagName => {
        if (tagStats[tagName] !== undefined) {
          tagStats[tagName]++;
        }
      });
    }
  });

  console.log('\n📊 Tag Statistics for September 2025:');
  console.log('='.repeat(80));
  Object.entries(tagStats).forEach(([tag, count]) => {
    console.log(`  ${tag}: ${count} transactions`);
  });

  // Show sample transactions with tags
  console.log('\n🏷️  Sample Tagged Transactions:');
  console.log('='.repeat(80));

  // Reimbursements
  const reimbursements = transactions.filter(t =>
    t.transaction_tags?.some(tt => tt.tags?.name === 'Reimbursement')
  ).slice(0, 5);

  console.log('\n✅ Reimbursement Tag (first 5):');
  reimbursements.forEach((t, idx) => {
    const tags = t.transaction_tags?.map(tt => tt.tags?.name).join(', ') || 'none';
    console.log(`  ${idx + 1}. ${t.description}`);
    console.log(`     Date: ${t.transaction_date} | Type: ${t.transaction_type}`);
    console.log(`     Tags: ${tags}`);
  });

  // Florida House
  const floridaHouse = transactions.filter(t =>
    t.transaction_tags?.some(tt => tt.tags?.name === 'Florida House')
  );

  console.log('\n🏠 Florida House Tag:');
  floridaHouse.forEach((t, idx) => {
    const tags = t.transaction_tags?.map(tt => tt.tags?.name).join(', ') || 'none';
    console.log(`  ${idx + 1}. ${t.description}`);
    console.log(`     Date: ${t.transaction_date} | Type: ${t.transaction_type}`);
    console.log(`     Tags: ${tags}`);
  });

  // Savings
  const savings = transactions.filter(t =>
    t.transaction_tags?.some(tt => tt.tags?.name === 'Savings/Investment')
  );

  console.log('\n💰 Savings/Investment Tag:');
  savings.forEach((t, idx) => {
    const tags = t.transaction_tags?.map(tt => tt.tags?.name).join(', ') || 'none';
    console.log(`  ${idx + 1}. ${t.description}`);
    console.log(`     Date: ${t.transaction_date} | Type: ${t.transaction_type}`);
    console.log(`     Tags: ${tags}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Verification Complete!');
  console.log('='.repeat(80));

  if (tagStats['Reimbursement'] > 0 && tagStats['Florida House'] > 0 && tagStats['Savings/Investment'] > 0) {
    console.log('\n✅ ALL TAGS ARE PROPERLY APPLIED IN DATABASE');
    console.log('\nIf tags don\'t appear in the app:');
    console.log('1. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('2. Check browser console for errors');
    console.log('3. Clear browser cache');
    console.log('4. Restart the dev server');
  } else {
    console.log('\n⚠️  Some tags may be missing!');
  }
}

verifyTags().catch(console.error);
