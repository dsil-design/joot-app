#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Authentication Test Suite\n');

const testSuite = [
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    description: 'Testing individual components and functions'
  },
  {
    name: 'Integration Tests', 
    command: 'npm run test:integration',
    description: 'Testing complete authentication flows'
  },
  {
    name: 'Accessibility Tests',
    command: 'npm run test:accessibility', 
    description: 'Testing WCAG compliance and screen reader support'
  },
  {
    name: 'Performance Tests',
    command: 'npm run test:performance',
    description: 'Testing render performance and Core Web Vitals'
  }
];

const results = [];

for (const test of testSuite) {
  console.log(`\n📋 Running ${test.name}...`);
  console.log(`   ${test.description}\n`);
  
  try {
    const start = Date.now();
    execSync(test.command, { stdio: 'inherit', cwd: process.cwd() });
    const duration = Date.now() - start;
    
    results.push({
      name: test.name,
      status: 'PASSED',
      duration,
      description: test.description
    });
    
    console.log(`\n✅ ${test.name} completed in ${duration}ms\n`);
  } catch (error) {
    const duration = Date.now() - start;
    
    results.push({
      name: test.name,
      status: 'FAILED',
      duration,
      description: test.description,
      error: error.message
    });
    
    console.log(`\n❌ ${test.name} failed after ${duration}ms\n`);
  }
}

// Generate test report
console.log('\n📊 Test Suite Summary\n');
console.log('='.repeat(60));

let totalDuration = 0;
let passedTests = 0;
let failedTests = 0;

results.forEach(result => {
  const status = result.status === 'PASSED' ? '✅' : '❌';
  const duration = `${result.duration}ms`;
  
  console.log(`${status} ${result.name.padEnd(20)} ${duration.padStart(8)}`);
  console.log(`   ${result.description}`);
  
  if (result.error) {
    console.log(`   Error: ${result.error.substring(0, 100)}...`);
  }
  
  console.log('');
  
  totalDuration += result.duration;
  if (result.status === 'PASSED') {
    passedTests++;
  } else {
    failedTests++;
  }
});

console.log('='.repeat(60));
console.log(`Total Duration: ${totalDuration}ms`);
console.log(`Passed: ${passedTests}, Failed: ${failedTests}`);
console.log(`Success Rate: ${Math.round((passedTests / results.length) * 100)}%`);

// Save detailed report
const reportPath = path.join(process.cwd(), 'test-results', 'summary.json');
const reportDir = path.dirname(reportPath);

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const report = {
  timestamp: new Date().toISOString(),
  totalDuration,
  passedTests,
  failedTests,
  successRate: Math.round((passedTests / results.length) * 100),
  results
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Detailed report saved to: ${reportPath}`);

console.log('\n🎯 Ready for Multi-User Testing!');
console.log('\nNext Steps:');
console.log('1. Run E2E tests: npm run test:e2e');
console.log('2. Deploy to staging environment');
console.log('3. Coordinate with friends/family for multi-user testing');
console.log('4. Monitor performance in production\n');

// Exit with error code if any tests failed
process.exit(failedTests > 0 ? 1 : 0);