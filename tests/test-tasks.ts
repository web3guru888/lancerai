/**
 * Test: Tasks Service
 * Tests human task creation (Hire with Locus)
 */

import 'dotenv/config';
import { TasksService } from '../src/locus/index.js';

async function main() {
  console.log('🧪 Testing Tasks Service...\n');
  
  const tasks = new TasksService();

  // Test 1: Fetch app docs
  console.log('Test 1: Fetch Tasks/Apps Documentation');
  const docs = await tasks.fetchDocs();
  console.log(`  ✅ Apps docs fetched (${docs.length} chars)`);
  // Show first few lines
  const lines = docs.split('\n').slice(0, 8);
  for (const line of lines) {
    if (line.trim()) console.log(`    ${line.trim()}`);
  }

  // Test 2: List tasks (may be empty or endpoint may differ)
  console.log('\nTest 2: List Tasks');
  const taskList = await tasks.listTasks();
  console.log(`  Found ${taskList.length} tasks`);

  console.log('\n✅ Tasks tests complete!');
  console.log('Note: Actual task creation requires USDC balance and correct endpoint discovery.');
}

main().catch(console.error);
