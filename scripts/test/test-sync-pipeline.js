#!/usr/bin/env node

/**
 * Test script for the complete sync pipeline
 * This script tests all the major components without requiring a full deployment
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Exchange Rate Sync Pipeline');
console.log('=====================================');

async function runTest(name, command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`Command: ${command} ${args.join(' ')}`);
    console.log('-'.repeat(50));
    
    const child = spawn(command, args, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${name} - PASSED`);
        resolve();
      } else {
        console.log(`❌ ${name} - FAILED (exit code: ${code})`);
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ ${name} - ERROR:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  const tests = [
    {
      name: 'TypeScript Compilation',
      command: 'npx',
      args: ['tsc', '--noEmit', '--skipLibCheck']
    },
    {
      name: 'Next.js Build',
      command: 'npm',
      args: ['run', 'build']
    },
    {
      name: 'Unit Tests (Services)',
      command: 'npm',
      args: ['test', '--', '--testPathPatterns=services', '--verbose']
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await runTest(test.name, test.command, test.args);
      passed++;
    } catch (error) {
      failed++;
      // Continue with other tests even if one fails
    }
  }
  
  console.log('\n🏁 Test Summary');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The sync pipeline is ready for deployment.');
    console.log('\nNext steps:');
    console.log('1. Deploy to Vercel');
    console.log('2. Set environment variable: CRON_SECRET');
    console.log('3. Test cron endpoint: /api/cron/sync-exchange-rates');
    console.log('4. Check health endpoint: /api/health/exchange-rates');
    console.log('5. Monitor daily sync execution');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please fix issues before deployment.`);
    process.exit(1);
  }
}

// Manual API endpoint tests (commented out for now - would need server running)
function printManualTestInstructions() {
  console.log('\n📋 Manual Test Instructions');
  console.log('===========================');
  console.log('After deployment, test these endpoints:');
  console.log('');
  console.log('1. Health Check:');
  console.log('   curl https://your-domain.vercel.app/api/health/exchange-rates');
  console.log('');
  console.log('2. Detailed Health Check:');
  console.log('   curl https://your-domain.vercel.app/api/health/exchange-rates?detailed=true');
  console.log('');
  console.log('3. Test Cron (requires CRON_SECRET):');
  console.log('   curl -X POST https://your-domain.vercel.app/api/cron/sync-exchange-rates \\');
  console.log('     -H "Authorization: Bearer $CRON_SECRET"');
  console.log('');
  console.log('4. Backfill Status:');
  console.log('   curl https://your-domain.vercel.app/api/admin/backfill-rates');
  console.log('');
  console.log('5. Test Daily Sync (manual):');
  console.log('   curl https://your-domain.vercel.app/api/cron/sync-exchange-rates?test=true');
}

main().catch((error) => {
  console.error('\n💥 Test runner failed:', error.message);
  process.exit(1);
});

printManualTestInstructions();