#!/usr/bin/env node

/**
 * Remove Incorrect Reimbursement Tag from Tax Payment
 * The "Reimbursement: 2025 Estimated Tax Payment" is DSIL Design income, NOT a reimbursement
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

async function removeIncorrectTag() {
  console.log('🔧 REMOVING INCORRECT TAG - APRIL 2025');
  console.log('==================================================\n');

  const transactionId = 'a6ad3ce1-f3f3-43bd-afc9-4ff8789178e4';
  const reimbursementTagId = '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72';

  console.log('Transaction: Reimbursement: 2025 Estimated Tax Payment');
  console.log('Amount: $3,492.06');
  console.log('Issue: This is DSIL Design income, NOT a reimbursement\n');

  // Remove the incorrect tag
  const { error } = await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', transactionId)
    .eq('tag_id', reimbursementTagId);

  if (error) {
    console.error('❌ Error removing tag:', error.message);
    process.exit(1);
  }

  console.log('✅ Successfully removed incorrect Reimbursement tag');
  console.log('\n==================================================');
  console.log('TAG CORRECTION COMPLETE');
  console.log('==================================================\n');
  console.log('Expected tag count: 22 Reimbursements (was incorrectly 23)');
  console.log('\nNext step: Re-run validation to verify all sections pass');
}

removeIncorrectTag().catch(console.error);
