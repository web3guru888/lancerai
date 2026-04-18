/**
 * Test: Wallet Operations
 * Verifies balance check, wallet status, and transaction history
 */

import 'dotenv/config';
import { WalletService, getClient } from '../src/locus/index.js';

async function main() {
  console.log('🧪 Testing Wallet Operations...\n');
  
  const wallet = new WalletService();
  
  // Test 1: Check balance
  console.log('Test 1: Check Balance');
  const balance = await wallet.getBalance();
  if (balance) {
    console.log(`  ✅ Balance: $${balance.usdc_balance} USDC`);
    console.log(`  ✅ Wallet: ${balance.wallet_address}`);
    console.log(`  ✅ Chain: ${balance.chain}`);
    console.log(`  ✅ Allowance: $${balance.allowance}`);
    console.log(`  ✅ Max Tx: $${balance.max_transaction_size}`);
  } else {
    console.log('  ❌ Failed to get balance');
  }

  // Test 2: Print summary
  console.log('\nTest 2: Wallet Summary');
  await wallet.printSummary();

  // Test 3: Transaction history (may be empty)
  console.log('Test 3: Transaction History');
  const txns = await wallet.getTransactions(5);
  console.log(`  ✅ Found ${txns.length} transactions`);
  for (const tx of txns) {
    console.log(`    - ${tx.status}: $${tx.amount_usdc} → ${tx.to_address?.slice(0, 10)}...`);
  }

  console.log('\n✅ Wallet tests complete!');
}

main().catch(console.error);
