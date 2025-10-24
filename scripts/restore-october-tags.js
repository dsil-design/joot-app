const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const REIMBURSEMENT_TAG_ID = '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72';
const FLORIDA_HOUSE_TAG_ID = '178739fd-1712-4356-b21a-8936b6d0a461';

async function restoreOctoberTags() {
  console.log('🏷️  Restoring October 2025 Tags\n');

  // Get all reimbursement transactions
  const { data: reimbursements, error: reimbError } = await supabase
    .from('transactions')
    .select('id, description')
    .gte('transaction_date', '2025-10-01')
    .lte('transaction_date', '2025-10-31')
    .ilike('description', '%reimbursement%');

  if (reimbError) {
    console.error('Error fetching reimbursements:', reimbError);
    return;
  }

  console.log(`Found ${reimbursements.length} Reimbursement transactions`);

  // Get Florida House transactions
  const { data: floridaHouse, error: floridaError } = await supabase
    .from('transactions')
    .select('id, description')
    .gte('transaction_date', '2025-10-01')
    .lte('transaction_date', '2025-10-31')
    .or('description.ilike.%florida house%,description.ilike.%hoa%,description.ilike.%property%');

  if (floridaError) {
    console.error('Error fetching Florida House transactions:', floridaError);
    return;
  }

  console.log(`Found ${floridaHouse.length} Florida House transactions\n`);

  let restored = 0;

  // Tag all reimbursements
  for (const tx of reimbursements) {
    const { error } = await supabase
      .from('transaction_tags')
      .upsert({
        transaction_id: tx.id,
        tag_id: REIMBURSEMENT_TAG_ID
      }, {
        onConflict: 'transaction_id,tag_id'
      });

    if (error) {
      console.error(`❌ Error tagging ${tx.description}:`, error);
    } else {
      console.log(`✅ Tagged: ${tx.description}`);
      restored++;
    }
  }

  // Tag Florida House transactions
  for (const tx of floridaHouse) {
    const { error } = await supabase
      .from('transaction_tags')
      .upsert({
        transaction_id: tx.id,
        tag_id: FLORIDA_HOUSE_TAG_ID
      }, {
        onConflict: 'transaction_id,tag_id'
      });

    if (error) {
      console.error(`❌ Error tagging ${tx.description}:`, error);
    } else {
      console.log(`✅ Tagged: ${tx.description}`);
      restored++;
    }
  }

  console.log(`\n✅ Restored ${restored} October tags!`);
}

restoreOctoberTags().catch(console.error);
