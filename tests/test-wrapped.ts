/**
 * Test: Wrapped API Operations
 * Tests calling paid APIs through Locus
 */

import 'dotenv/config';
import { WrappedApiService } from '../src/locus/index.js';

async function main() {
  console.log('🧪 Testing Wrapped API Operations...\n');
  
  const wrapped = new WrappedApiService();

  // Test 1: Brave search (cheap, good for testing)
  console.log('Test 1: Brave Web Search');
  const searchResult = await wrapped.braveSearch('AI agent autonomous payments USDC', 3);
  if (searchResult.success) {
    console.log('  ✅ Brave search succeeded');
    const results = searchResult.data?.web?.results || searchResult.data?.results || [];
    console.log(`  Found ${results.length || 'N/A'} results`);
    if (results.length > 0) {
      console.log(`  First result: ${results[0]?.title || 'N/A'}`);
    }
  } else {
    console.log(`  ⚠️ Brave search: ${searchResult.message}`);
  }

  // Test 2: Try Firecrawl scrape
  console.log('\nTest 2: Firecrawl Scrape');
  const scrapeResult = await wrapped.scrapeUrl('https://paywithlocus.com', ['markdown']);
  if (scrapeResult.success) {
    console.log('  ✅ Firecrawl scrape succeeded');
    const content = scrapeResult.data?.markdown || scrapeResult.data?.content || '';
    console.log(`  Content length: ${typeof content === 'string' ? content.length : 'N/A'} chars`);
  } else {
    console.log(`  ⚠️ Firecrawl scrape: ${scrapeResult.message}`);
  }

  console.log('\n✅ Wrapped API tests complete!');
}

main().catch(console.error);
