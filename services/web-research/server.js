/**
 * LancerAI Web Research Service
 * A microservice deployed via BuildWithLocus that performs web research
 * using Locus Wrapped APIs (Firecrawl + Exa + OpenAI)
 */

const http = require('http');

const PORT = process.env.PORT || 8080;
const LOCUS_API_KEY = process.env.LOCUS_API_KEY;
const LOCUS_BASE_URL = process.env.LOCUS_BASE_URL || 'https://beta-api.paywithlocus.com/api';

// ── Locus API helpers ──

async function locusRequest(method, path, body = null) {
  const url = `${LOCUS_BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${LOCUS_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  return res.json();
}

async function firecrawlSearch(query) {
  return locusRequest('POST', '/wrapped/firecrawl/search', { query });
}

async function exaSearch(query, numResults = 5) {
  return locusRequest('POST', '/wrapped/exa/search', { query, numResults });
}

async function openaiChat(messages, model = 'gpt-4o-mini') {
  return locusRequest('POST', '/wrapped/openai/chat', { model, messages });
}

// ── Research Logic ──

async function doResearch(query) {
  const startTime = Date.now();
  const results = { query, sources: [], analysis: '', cost: 0 };

  // Step 1: Search with Exa
  try {
    const exaResult = await exaSearch(query, 5);
    if (exaResult.success && exaResult.data?.results) {
      results.sources.push(...exaResult.data.results.map(r => ({
        title: r.title,
        url: r.url,
        source: 'exa',
      })));
      results.cost += 0.010;
    }
  } catch (err) {
    console.error('[RESEARCH] Exa search failed:', err.message);
  }

  // Step 2: Search with Firecrawl
  try {
    const fcResult = await firecrawlSearch(query);
    if (fcResult.success && fcResult.data?.data) {
      results.sources.push(...fcResult.data.data.slice(0, 3).map(r => ({
        title: r.metadata?.title || r.url,
        url: r.url,
        content: r.markdown?.substring(0, 500),
        source: 'firecrawl',
      })));
      results.cost += 0.005;
    }
  } catch (err) {
    console.error('[RESEARCH] Firecrawl search failed:', err.message);
  }

  // Step 3: Analyze with OpenAI
  if (results.sources.length > 0) {
    try {
      const sourceTexts = results.sources.map(s => 
        `- ${s.title} (${s.url})${s.content ? ': ' + s.content : ''}`
      ).join('\n');

      const aiResult = await openaiChat([
        { role: 'system', content: 'You are a research analyst. Synthesize the provided sources into a concise, insightful research report. Include key findings, trends, and actionable insights.' },
        { role: 'user', content: `Research query: "${query}"\n\nSources found:\n${sourceTexts}\n\nProvide a comprehensive research report.` },
      ]);

      if (aiResult.success && aiResult.data?.choices?.[0]) {
        results.analysis = aiResult.data.choices[0].message.content;
        results.cost += 0.003; // approximate
      }
    } catch (err) {
      console.error('[RESEARCH] OpenAI analysis failed:', err.message);
      results.analysis = 'Analysis unavailable — AI processing failed.';
    }
  }

  results.durationMs = Date.now() - startTime;
  results.sourceCount = results.sources.length;
  return results;
}

// ── HTTP Server ──

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      service: 'lancerai-web-research',
      status: 'healthy',
      version: '1.0.0',
      powered_by: 'Locus (paywithlocus.com)',
      endpoints: {
        'POST /research': 'Perform web research on a topic',
        'GET /health': 'Health check',
      },
    }));
  }

  // Research endpoint
  if (req.method === 'POST' && req.url === '/research') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { query } = JSON.parse(body);
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing "query" field' }));
        }

        console.log(`[RESEARCH] Starting research: "${query}"`);
        const results = await doResearch(query);
        console.log(`[RESEARCH] Complete: ${results.sourceCount} sources, $${results.cost.toFixed(3)}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: results }));
      } catch (err) {
        console.error('[RESEARCH] Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[LancerAI] Web Research Service running on port ${PORT}`);
  console.log(`[LancerAI] Powered by Locus Wrapped APIs`);
  if (!LOCUS_API_KEY) {
    console.warn('[LancerAI] WARNING: LOCUS_API_KEY not set — API calls will fail');
  }
});
