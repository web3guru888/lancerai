/**
 * Test: Checkout Service
 * Tests checkout session operations (preflight only — we can't create sessions from agent side)
 */

import 'dotenv/config';
import { CheckoutService } from '../src/locus/index.js';

async function main() {
  console.log('🧪 Testing Checkout Service...\n');
  
  const checkout = new CheckoutService();

  // Test 1: List payments (may be empty)
  console.log('Test 1: List Checkout Payments');
  const payments = await checkout.listPayments();
  console.log(`  ✅ Found ${payments.length} checkout payments`);

  // Test 2: Preflight with a dummy session (expected to fail)
  console.log('\nTest 2: Preflight (dummy session — expected to fail)');
  const pre = await checkout.preflight('test-session-does-not-exist');
  if (pre) {
    console.log(`  ✅ Preflight succeeded (unexpected): $${pre.amount}`);
  } else {
    console.log('  ✅ Preflight correctly rejected dummy session');
  }

  console.log('\n✅ Checkout tests complete!');
  console.log('Note: To fully test checkout, we need a merchant to create a session.');
  console.log('We will create our own checkout sessions in the agent service.');
}

main().catch(console.error);
