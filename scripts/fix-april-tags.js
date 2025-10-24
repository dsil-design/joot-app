#!/usr/bin/env node

/**
 * Fix Missing Tags for April 2025
 * Adds missing Reimbursement and Florida House tags
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTags() {
  console.log('🔧 FIXING MISSING TAGS - APRIL 2025');
  console.log('==================================================\n');

  const reimbursementTagId = '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72';
  const floridaHouseTagId = '178739fd-1712-4356-b21a-8936-b6d0a461';

  // Missing Reimbursement tags (5 transactions)
  const missingReimbursements = [
    { id: 'f8d001c0-08d5-44a8-b2d1-a3efac2fa6b9', desc: 'Reimbursement: Groceries (THB 177)' },
    { id: '25cd5634-82cf-496c-adff-059eb4265f28', desc: 'Reimbursement: Lunch (THB 200)' },
    { id: '05de3429-7dd9-4007-92ea-d031207ef92d', desc: 'Reimbursement: Groceries (THB 70)' },
    { id: 'b8e620fd-9c96-4003-acbf-fd27c3d3d880', desc: 'Reimbursement: Dinner (THB 257)' },
    { id: 'a6ad3ce1-f3f3-43bd-afc9-4ff8789178e4', desc: 'Reimbursement: 2025 Estimated Tax Payment (USD 3492.06)' }
  ];

  // Missing Florida House tag (1 transaction)
  const missingFloridaHouse = [
    { id: '1fafdc85-2c7f-4e28-9a10-b412998e4d67', desc: 'CNX Water Bill (THB 592.99)' }
  ];

  console.log('Adding Reimbursement tags...\n');

  for (const txn of missingReimbursements) {
    const { error } = await supabase
      .from('transaction_tags')
      .insert({
        transaction_id: txn.id,
        tag_id: reimbursementTagId
      });

    if (error) {
      console.error(`❌ Error adding tag for ${txn.desc}:`, error.message);
    } else {
      console.log(`✅ Added Reimbursement tag: ${txn.desc}`);
    }
  }

  console.log('\nAdding Florida House tags...\n');

  for (const txn of missingFloridaHouse) {
    const { error } = await supabase
      .from('transaction_tags')
      .insert({
        transaction_id: txn.id,
        tag_id: floridaHouseTagId
      });

    if (error) {
      console.error(`❌ Error adding tag for ${txn.desc}:`, error.message);
    } else {
      console.log(`✅ Added Florida House tag: ${txn.desc}`);
    }
  }

  console.log('\n==================================================');
  console.log('✅ TAG FIX COMPLETE');
  console.log('==================================================\n');
  console.log(`Added Reimbursement tags: ${missingReimbursements.length}`);
  console.log(`Added Florida House tags: ${missingFloridaHouse.length}`);
  console.log(`Total tags added: ${missingReimbursements.length + missingFloridaHouse.length}`);
  console.log('\nNext step: Re-run validation to verify section totals');
}

fixTags().catch(console.error);
