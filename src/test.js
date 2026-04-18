#!/usr/bin/env node
/**
 * LancerAI — Quick integration test
 * Tests Locus API connectivity and BuildWithLocus auth
 */

const API_KEY = process.env.LOCUS_API_KEY;
const LOCUS_BASE = process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api';
const BUILD_API = process.env.BUILD_API_URL || 'https://beta-api.buildwithlocus.com/v1';

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${name}`);
    return result;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== LancerAI Integration Tests ===\n');
  
  if (!API_KEY) {
    console.error('Set LOCUS_API_KEY env var first');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Wallet balance
  await test('Locus API — Balance check', async () => {
    const res = await fetch(`${LOCUS_BASE}/pay/balance`, { headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed');
    console.log(`   Balance: $${data.data.usdc_balance} USDC`);
    console.log(`   Wallet: ${data.data.wallet_address}`);
    console.log(`   Workspace: ${data.data.workspace_id}`);
    return data;
  });

  // Test 2: Transaction history
  await test('Locus API — Transaction history', async () => {
    const res = await fetch(`${LOCUS_BASE}/pay/transactions?limit=5`, { headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed');
    console.log(`   ${data.data.transactions?.length || 0} transactions found`);
    return data;
  });

  // Test 3: BuildWithLocus auth
  const buildToken = await test('Build API — Auth exchange', async () => {
    const res = await fetch(`${BUILD_API}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: API_KEY }),
    });
    const data = await res.json();
    if (!data.token) throw new Error(data.error || 'No token');
    console.log(`   Token expires: ${data.expiresIn}`);
    return data.token;
  });

  if (buildToken) {
    const buildHeaders = {
      'Authorization': `Bearer ${buildToken}`,
      'Content-Type': 'application/json',
    };

    // Test 4: Build whoami
    await test('Build API — Whoami', async () => {
      const res = await fetch(`${BUILD_API}/auth/whoami`, { headers: buildHeaders });
      const data = await res.json();
      console.log(`   User: ${data.userId}`);
      console.log(`   Workspace: ${data.workspaceId}`);
      return data;
    });

    // Test 5: Build list projects
    await test('Build API — List projects', async () => {
      const res = await fetch(`${BUILD_API}/projects`, { headers: buildHeaders });
      const data = await res.json();
      console.log(`   ${data.total || data.projects?.length || 0} projects`);
      return data;
    });

    // Test 6: Verify .locusbuild
    await test('Build API — Verify .locusbuild', async () => {
      const res = await fetch(`${BUILD_API}/projects/verify-locusbuild`, {
        method: 'POST',
        headers: buildHeaders,
        body: JSON.stringify({
          locusbuild: {
            services: {
              'web-research': {
                path: 'services/web-research',
                port: 8080,
                healthCheck: '/health',
              },
            },
          },
        }),
      });
      const data = await res.json();
      if (!data.valid) throw new Error(`Invalid: ${data.errors.join(', ')}`);
      console.log(`   Valid! Plan: ${data.plan.services.length} service(s)`);
      return data;
    });
  }

  console.log('\n=== Tests complete ===');
}

main().catch(console.error);
