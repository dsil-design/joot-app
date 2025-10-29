#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnose() {
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  console.log('User ID:', user.id);

  // Check payment methods
  const { data: paymentMethods, error } = await supabase
    .from('payment_methods')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`\nFound ${paymentMethods.length} payment methods:`);
    paymentMethods.forEach(pm => console.log(`  - ${pm.name}`));
  }

  // Try to create "Chase Sapphire Reserve"
  console.log('\n\nTrying to create "Chase Sapphire Reserve"...');
  const { data: newPM, error: createError } = await supabase
    .from('payment_methods')
    .insert({ name: 'Chase Sapphire Reserve', user_id: user.id })
    .select('id')
    .single();

  if (createError) {
    console.error('Create error:', createError);
  } else {
    console.log('Success! Created ID:', newPM.id);
  }
}

diagnose();
