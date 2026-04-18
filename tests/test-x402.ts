/**
 * Test: x402 Endpoints
 * Fetches catalog and tests available endpoints
 */

import 'dotenv/config';
import { X402Service } from '../src/locus/index.js';

async function main() {
  console.log('🧪 Testing x402 Endpoints...\n');
  
  const x402 = new X402Service();

  // Test 1: Fetch catalog
  console.log('Test 1: Fetch x402 Catalog');
  const catalog = await x402.getCatalog();
  console.log(`  ✅ Catalog fetched (${catalog.length} chars)`);
  // Show first few lines
  const lines = catalog.split('\n').slice(0, 10);
  for (const line of lines) {
    if (line.trim()) console.log(`    ${line.trim()}`);
  }

  // Test 2: List transactions
  console.log('\nTest 2: x402 Transaction History');
  const txns = await x402.getTransactions(5);
  console.log(`  ✅ Found ${txns.length} x402 transactions`);

  console.log('\n✅ x402 tests complete!');
}

main().catch(console.error);
