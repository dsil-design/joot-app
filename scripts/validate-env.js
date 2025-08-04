#!/usr/bin/env node

// Environment variable validation script for Vercel deployment
require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

console.log('🔍 Validating environment variables...\n');

let hasErrors = false;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  
  if (!value) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`);
  }
});

console.log('\n🔧 Additional environment variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('SUPABASE_'))
  .forEach(key => {
    const value = process.env[key];
    console.log(`   ${key}: ${value ? value.substring(0, 20) + '...' : 'undefined'}`);
  });

if (hasErrors) {
  console.error('\n❌ Environment validation failed!');
  console.error('Please ensure all required environment variables are set in your Vercel project settings.');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables are properly configured!');
}