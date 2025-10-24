const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const months = [
  'february-2025',
  'march-2025',
  'april-2025',
  'may-2025',
  'june-2025',
  'july-2025',
  'august-2025',
  'september-2025'
];

// Tag name to ID mapping
const tagMap = {
  'Business': '3cbdf913-189b-43d9-9abe-ef22db97fef4',
  'Business Expense': '973433bd-bf9f-469f-9b9f-20128def8726',
  'Client Meeting': '91b12591-b199-43c5-b2cc-99425e26cc7c',
  'Florida House': '178739fd-1712-4356-b21a-8936b6d0a461',
  'Personal': 'a4b5614a-f40e-4342-b2a4-1a7f12412578',
  'Recurring': '92e8be61-798a-42e7-8074-ab568fb51fe7',
  'Reimbursement': '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72',
  'Savings/Investment': 'c0928dfe-1544-4569-bbad-77fea7d7e5aa',
  'Tax Deductible': '5699a22e-8cdd-42a2-803a-0c36e25284eb',
  'Work Travel': '8f8eab30-bc9c-4c24-ad09-4429380a78c1'
};

async function restoreTagsForMonth(monthFile) {
  const monthName = monthFile.replace('-CORRECTED.json', '');
  console.log(`\n=== Processing ${monthName} ===`);

  const filePath = path.join(__dirname, `${monthFile}`);
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ File not found: ${monthFile}`);
    return { month: monthName, error: 'File not found' };
  }

  const transactions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const transactionsWithTags = transactions.filter(t => t.tags && t.tags.length > 0);

  console.log(`  Total transactions: ${transactions.length}`);
  console.log(`  Transactions with tags: ${transactionsWithTags.length}`);

  if (transactionsWithTags.length === 0) {
    console.log(`  ℹ️  No tags to restore`);
    return { month: monthName, restored: 0, errors: 0 };
  }

  let restored = 0;
  let errors = 0;
  const errorDetails = [];

  for (const tx of transactionsWithTags) {
    try {
      // Find the transaction in the database by date, description, amount, and currency
      const { data: dbTransactions, error: findError } = await supabase
        .from('transactions')
        .select('id')
        .eq('transaction_date', tx.date)
        .eq('description', tx.description)
        .eq('amount', tx.amount)
        .eq('original_currency', tx.currency);

      if (findError) {
        console.error(`  ❌ Error finding transaction:`, findError);
        errors++;
        errorDetails.push({ tx, error: findError.message });
        continue;
      }

      if (!dbTransactions || dbTransactions.length === 0) {
        console.log(`  ⚠️  Transaction not found: ${tx.date} - ${tx.description} (${tx.amount} ${tx.currency})`);
        errors++;
        errorDetails.push({ tx, error: 'Transaction not found in DB' });
        continue;
      }

      if (dbTransactions.length > 1) {
        console.log(`  ⚠️  Multiple matches found for: ${tx.date} - ${tx.description}, using first match`);
      }

      const transactionId = dbTransactions[0].id;

      // Delete existing tags for this transaction
      const { error: deleteError } = await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transactionId);

      if (deleteError) {
        console.error(`  ❌ Error deleting existing tags:`, deleteError);
        errors++;
        errorDetails.push({ tx, error: deleteError.message });
        continue;
      }

      // Insert new tags
      const tagInserts = tx.tags.map(tagName => {
        const tagId = tagMap[tagName];
        if (!tagId) {
          console.log(`  ⚠️  Unknown tag: ${tagName}`);
          return null;
        }
        return {
          transaction_id: transactionId,
          tag_id: tagId
        };
      }).filter(Boolean);

      if (tagInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('transaction_tags')
          .insert(tagInserts);

        if (insertError) {
          console.error(`  ❌ Error inserting tags:`, insertError);
          errors++;
          errorDetails.push({ tx, error: insertError.message });
          continue;
        }

        console.log(`  ✅ Restored ${tagInserts.length} tag(s) for: ${tx.description}`);
        restored++;
      }

    } catch (error) {
      console.error(`  ❌ Unexpected error processing transaction:`, error);
      errors++;
      errorDetails.push({ tx, error: error.message });
    }
  }

  console.log(`  Summary: ${restored} restored, ${errors} errors`);

  return { month: monthName, restored, errors, errorDetails };
}

async function main() {
  console.log('🏷️  Tag Restoration Script');
  console.log('========================\n');

  const results = [];

  for (const monthFile of months) {
    const result = await restoreTagsForMonth(monthFile + '-CORRECTED.json');
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n=== FINAL SUMMARY ===');
  console.log('Month                | Restored | Errors');
  console.log('---------------------|----------|-------');

  let totalRestored = 0;
  let totalErrors = 0;

  for (const result of results) {
    if (result.error) {
      console.log(`${result.month.padEnd(20)} | N/A      | ${result.error}`);
    } else {
      console.log(`${result.month.padEnd(20)} | ${String(result.restored).padStart(8)} | ${String(result.errors).padStart(6)}`);
      totalRestored += result.restored;
      totalErrors += result.errors;
    }
  }

  console.log('---------------------|----------|-------');
  console.log(`${'TOTAL'.padEnd(20)} | ${String(totalRestored).padStart(8)} | ${String(totalErrors).padStart(6)}`);

  if (totalErrors > 0) {
    console.log('\n⚠️  Some errors occurred. Review the error details above.');
  } else {
    console.log('\n✅ All tags restored successfully!');
  }

  // Save detailed results
  const outputPath = path.join(__dirname, `tag-restoration-results-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${outputPath}`);
}

main().catch(console.error);
