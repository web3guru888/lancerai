#!/usr/bin/env node
/**
 * Check Locus wallet balance and status
 */

const LocusClient = require('../utils/locus');

async function main() {
  const client = new LocusClient();
  
  console.log('=== LancerAI Wallet Status ===\n');
  
  try {
    const balance = await client.getBalance();
    console.log(`Wallet Address: ${balance.data.wallet_address}`);
    console.log(`USDC Balance:   $${balance.data.usdc_balance}`);
    console.log(`Promo Credits:  $${balance.data.promo_credit_balance || '0'}`);
    console.log(`Allowance:      $${balance.data.allowance}`);
    console.log(`Max TX Size:    $${balance.data.max_transaction_size}`);
    console.log(`Chain:          ${balance.data.chain}`);
    console.log(`Workspace:      ${balance.data.workspace_id}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (err.status === 401) {
      console.error('Invalid API key. Check LOCUS_API_KEY.');
    }
  }
}

main();
