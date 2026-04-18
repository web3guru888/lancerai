/**
 * Run all tests sequentially
 */

import 'dotenv/config';

const tests = [
  { name: 'Wallet', file: './test-wallet.js' },
  { name: 'Wrapped APIs', file: './test-wrapped.js' },
  { name: 'x402', file: './test-x402.js' },
  { name: 'Checkout', file: './test-checkout.js' },
  { name: 'Tasks', file: './test-tasks.js' },
];

async function runAll() {
  console.log('═══════════════════════════════════');
  console.log('  PAYGENTIC — Test Suite');
  console.log('═══════════════════════════════════\n');

  for (const test of tests) {
    console.log(`\n${'═'.repeat(40)}`);
    console.log(`  Running: ${test.name}`);
    console.log(`${'═'.repeat(40)}\n`);
    
    try {
      await import(test.file);
    } catch (err: any) {
      console.error(`  ❌ ${test.name} FAILED: ${err.message}`);
    }
    
    console.log('');
  }
  
  console.log('\n═══════════════════════════════════');
  console.log('  All tests complete!');
  console.log('═══════════════════════════════════');
}

runAll().catch(console.error);
