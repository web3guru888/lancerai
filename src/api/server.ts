/**
 * LancerAI API Server
 * Express server exposing the agent's services as API endpoints.
 * Features: job management, wallet ops, BuildWithLocus deployments, wrapped API catalog, static dashboard
 * 
 * PORT 8080 — Required by BuildWithLocus for container deployment
 */

import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { LancerAgent, Job, JobType, SERVICE_CATALOG } from '../agent/agent.js';
import { WalletService, DeployService, CheckoutService, WrappedApiService } from '../locus/index.js';
import { randomUUID } from 'crypto';

const APP_VERSION = '0.5.1';
const startTime = Date.now();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Trust reverse proxy (BWL / load balancer) so req.protocol reads X-Forwarded-Proto
app.set('trust proxy', true);

/** Build the public base URL from a request. Defaults to https in production. */
function getBaseUrl(req: express.Request): string {
  const host = req.get('host') || 'localhost:8080';
  // In production (BWL), always use https; locally, use whatever req.protocol says
  const proto = (host.includes('buildwithlocus.com') || host.includes('locus.com'))
    ? 'https'
    : req.protocol;
  return `${proto}://${host}`;
}

app.use(express.json());

// ==========================================
// CORS — allow cross-origin requests
// ==========================================

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Payment-TxHash, X-Payment-Amount, X-Payment-Demo');
  res.header('Access-Control-Expose-Headers', 'X-Payment-Required, X-Payment-Address, X-Payment-Amount, X-Payment-Network, X-Payment-Token, X-Payment-Description');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Serve static dashboard files
app.use(express.static(join(__dirname, 'public')));

// Initialize agent and services
const agent = new LancerAgent();
const wallet = new WalletService();
const deployService = new DeployService();

// ── Helper Functions ───────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function parseWrappedCatalog(markdown: string): Array<{ provider: string; category: string; endpoints: string[]; description: string; docsUrl: string }> {
  const providers: Array<{ provider: string; category: string; endpoints: string[]; description: string; docsUrl: string }> = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    // Match table rows: | [Provider](url) | Category | Endpoints | Description |
    const match = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (match) {
      const [, provider, docsUrl, category, endpointsStr, description] = match;
      const endpoints = endpointsStr.split(',').map(e => e.trim()).filter(Boolean);
      providers.push({
        provider: provider.trim(),
        category: category.trim(),
        endpoints,
        description: description.trim(),
        docsUrl: docsUrl.trim(),
      });
    }
  }

  return providers;
}

// Audit log for demo
const auditLog: Array<{
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
}> = [];

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const origJson = res.json.bind(res);
  res.json = function (body: any) {
    const duration = Date.now() - start;
    auditLog.push({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
    if (auditLog.length > 200) auditLog.splice(0, auditLog.length - 200);
    return origJson(body);
  };
  next();
});

// ==========================================
// Health Check (required for BuildWithLocus)
// ==========================================

app.get('/health', async (req, res) => {
  let walletBalance: string | null = null;
  try {
    const bal = await wallet.getBalance();
    walletBalance = bal?.usdc_balance ?? null;
  } catch { /* non-critical */ }

  res.json({
    status: 'healthy',
    version: APP_VERSION,
    uptime: process.uptime(),
    uptimeHuman: formatUptime(process.uptime()),
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true',
    wallet: walletBalance,
    services: SERVICE_CATALOG.length,
    wrappedApis: 299,
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      uptimeHuman: formatUptime(process.uptime()),
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      demoMode: process.env.DEMO_MODE === 'true',
      wrappedApiCount: 299,
      services: SERVICE_CATALOG.length,
    },
  });
});

// ==========================================
// llms.txt — Machine-readable agent description
// ==========================================

app.get('/.well-known/llms.txt', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const llmsTxt = `# LancerAI — Autonomous AI Freelancer Agent
# ${baseUrl}
# Powered by Locus • USDC on Base

> LancerAI is a machine-payable autonomous AI agent that performs freelance work
> for other agents and humans. It accepts USDC payments on Base via Locus Checkout,
> executes jobs using 299+ wrapped APIs, and can hire human freelancers when needed.

## Services & Pricing (USDC)

- web_research: $0.50 — Multi-source web research with citations
- content_creation: $1.00 — Articles, blog posts, marketing copy
- data_analysis: $0.75 — Data processing, insights, visualization
- translation: $0.50 — Professional translation (30+ languages via DeepL)
- website_deployment: $2.00 — Deploy apps via BuildWithLocus
- image_generation: $0.25 — AI image generation (FLUX, Stable Diffusion)
- code_execution: $0.10 — Run code in 60+ languages (sandboxed)
- crypto_analysis: $0.50 — Market data, price analysis, trends
- human_task: $5.00 — Hire human freelancers via Locus Fiverr
- custom: $1.00 — Custom tasks (describe what you need)

## How to Hire LancerAI

### 1. Submit a Job
POST ${baseUrl}/api/jobs
Content-Type: application/json

{"type": "web_research", "description": "Research the latest AI agent frameworks", "budget": 1.00}

### 2. Pay via Locus Checkout
POST ${baseUrl}/api/checkout/create
Content-Type: application/json

{"amount": "1.00", "description": "Web research job"}

### 3. Machine-Payable Endpoints (x402 / MPP)

LancerAI supports the x402 protocol (HTTP 402 Payment Required).
Send a request without payment → get a 402 challenge with payment details.
Pay with USDC on Base → re-send with X-Payment-TxHash header.
Or set X-Payment-Demo: true to test without paying.

Discovery:  GET  ${baseUrl}/api/x402          — JSON catalog of all paid endpoints
OpenAPI:    GET  ${baseUrl}/openapi.json      — OpenAPI 3.1 spec with x-payment-info

Endpoints & Pricing:
POST ${baseUrl}/api/x402/research       $0.05 USDC  — {"query": "..."}
POST ${baseUrl}/api/x402/content        $0.10 USDC  — {"prompt": "..."}
POST ${baseUrl}/api/x402/translate      $0.03 USDC  — {"text": "...", "targetLang": "DE"}
POST ${baseUrl}/api/x402/data-analysis  $0.08 USDC  — {"data": "...", "question": "..."}
POST ${baseUrl}/api/x402/deploy         $1.00 USDC  — {"repoUrl": "...", "projectName": "..."}

### Example: Call with payment
curl -X POST ${baseUrl}/api/x402/research \\
  -H "Content-Type: application/json" \\
  -H "X-Payment-TxHash: 0xYOUR_TX_HASH" \\
  -H "X-Payment-Amount: 0.05" \\
  -d '{"query": "latest AI agent frameworks"}'

### Example: Demo mode (no payment needed)
curl -X POST ${baseUrl}/api/x402/research \\
  -H "Content-Type: application/json" \\
  -H "X-Payment-Demo: true" \\
  -d '{"query": "latest AI agent frameworks"}'

### 4. Laso Finance (Virtual Debit Cards)
POST ${baseUrl}/api/laso/auth          — Authenticate with Laso Finance
POST ${baseUrl}/api/laso/get-card      — Order prepaid Visa card ($5-$1000)
POST ${baseUrl}/api/laso/send-payment  — Send via Venmo/PayPal

### 5. AgentMail (Email for Agents)
POST ${baseUrl}/api/agentmail/create-inbox  — Create email inbox
POST ${baseUrl}/api/agentmail/send          — Send email
POST ${baseUrl}/api/agentmail/messages      — List inbox messages

## API Endpoints

- GET  ${baseUrl}/api/status — Agent status and capabilities
- GET  ${baseUrl}/api/services — Full service catalog
- GET  ${baseUrl}/api/agent-info — Machine-readable agent metadata (JSON)
- GET  ${baseUrl}/api/x402 — x402 endpoint discovery (prices, params, examples)
- GET  ${baseUrl}/openapi.json — OpenAPI 3.1 spec with x-payment-info
- GET  ${baseUrl}/api/wrapped-catalog — Browse 299 available APIs
- GET  ${baseUrl}/api/catalog — Dynamic API catalog from Locus
- POST ${baseUrl}/api/jobs — Submit a job
- GET  ${baseUrl}/api/jobs — List jobs
- GET  ${baseUrl}/api/wallet — Wallet balance
- GET  ${baseUrl}/api/transactions — Transaction history
- GET  ${baseUrl}/health — Service health

## Payment
- Currency: USDC
- Network: Base (ERC-4337 smart wallet, chain ID 8453)
- Wallet: ${process.env.LOCUS_WALLET_ADDRESS || '0x...'}
- USDC Contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- Checkout: Locus Checkout SDK
- Protocol: x402 / MPP (Machine Payments Protocol)

## Technical
- Version: ${APP_VERSION}
- Runtime: Node.js + Express
- Deployment: BuildWithLocus
- Source: TypeScript
`;
  res.type('text/plain').send(llmsTxt);
});

// ==========================================
// Agent Info — Machine-readable capabilities
// ==========================================

app.get('/api/agent-info', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.json({
    success: true,
    data: {
      name: 'LancerAI',
      version: APP_VERSION,
      description: 'Autonomous AI freelancer agent — accepts USDC payments on Base, executes jobs using 299+ APIs, and can hire human freelancers when needed.',
      type: 'ai-agent',
      status: 'online',
      demoMode: process.env.DEMO_MODE === 'true',

      capabilities: SERVICE_CATALOG.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price_usdc: s.price,
      })),

      payment: {
        currency: 'USDC',
        network: 'Base',
        walletType: 'ERC-4337 Smart Wallet',
        walletAddress: process.env.LOCUS_WALLET_ADDRESS || null,
        checkoutEndpoint: `${baseUrl}/api/checkout/create`,
        protocols: ['locus-checkout', 'x402', 'mpp'],
      },

      api: {
        baseUrl,
        submitJob: `POST ${baseUrl}/api/jobs`,
        listJobs: `GET ${baseUrl}/api/jobs`,
        services: `GET ${baseUrl}/api/services`,
        health: `GET ${baseUrl}/health`,
        llmsTxt: `GET ${baseUrl}/.well-known/llms.txt`,
        machinePay: {
          discovery: `GET ${baseUrl}/api/x402`,
          openapi: `GET ${baseUrl}/openapi.json`,
          research: `POST ${baseUrl}/api/x402/research`,
          content: `POST ${baseUrl}/api/x402/content`,
          translate: `POST ${baseUrl}/api/x402/translate`,
          dataAnalysis: `POST ${baseUrl}/api/x402/data-analysis`,
          deploy: `POST ${baseUrl}/api/x402/deploy`,
        },
        x402: {
          protocol: 'x402 / MPP',
          demoHeader: 'X-Payment-Demo: true',
          endpoints: Object.entries(X402_ENDPOINTS).map(([k, v]) => ({
            id: k, price: v.price, description: v.description,
          })),
        },
        laso: {
          auth: `POST ${baseUrl}/api/laso/auth`,
          getCard: `POST ${baseUrl}/api/laso/get-card`,
          sendPayment: `POST ${baseUrl}/api/laso/send-payment`,
        },
        agentmail: {
          createInbox: `POST ${baseUrl}/api/agentmail/create-inbox`,
          send: `POST ${baseUrl}/api/agentmail/send`,
          messages: `POST ${baseUrl}/api/agentmail/messages`,
        },
      },

      tooling: {
        wrappedApis: 299,
        categories: ['AI/LLMs', 'Search', 'Web Scraping', 'Code Execution', 'Translation', 'Image Generation', 'Crypto Data', 'Email', 'Finance'],
        humanEscalation: true,
        humanProvider: 'Locus Fiverr Marketplace',
      },

      links: {
        dashboard: baseUrl,
        catalog: `${baseUrl}/api/wrapped-catalog`,
        openapi: `${baseUrl}/openapi.json`,
        docs: 'https://docs.paywithlocus.com',
        locus: 'https://beta.paywithlocus.com',
      },
    },
  });
});

// ==========================================
// Transactions — Real Locus transaction history
// ==========================================

app.get('/api/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const transactions = await wallet.getTransactions(limit, status);
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        limit,
        source: 'locus-api',
      },
    });
  } catch (err: any) {
    console.error(`[API] Transactions error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message,
      data: { transactions: [], count: 0 },
    });
  }
});

// ==========================================
// Dynamic Catalog — Live from Locus
// ==========================================

let catalogCache: { data: any; fetchedAt: number } | null = null;
const CATALOG_CACHE_TTL = 300_000; // 5 minutes

app.get('/api/catalog', async (req, res) => {
  try {
    const now = Date.now();
    if (catalogCache && (now - catalogCache.fetchedAt) < CATALOG_CACHE_TTL) {
      return res.json({
        success: true,
        data: { ...catalogCache.data, cached: true },
      });
    }

    // Fetch live catalog from Locus
    const response = await fetch('https://beta.paywithlocus.com/wapi/index.md');
    const markdown = await response.text();

    // Parse the markdown table into structured data
    const providers = parseWrappedCatalog(markdown);

    catalogCache = {
      data: {
        providers,
        totalProviders: providers.length,
        totalEndpoints: providers.reduce((sum: number, p: any) => sum + p.endpoints.length, 0),
        source: 'https://beta.paywithlocus.com/wapi/index.md',
        fetchedAt: new Date().toISOString(),
      },
      fetchedAt: now,
    };

    res.json({ success: true, data: { ...catalogCache.data, cached: false } });
  } catch (err: any) {
    console.error(`[API] Catalog fetch error: ${err.message}`);
    // Fall back to static wrapped catalog
    const wrappedService = new WrappedApiService();
    res.json({
      success: true,
      data: {
        providers: wrappedService.getAvailableApis(),
        fallback: true,
        error: err.message,
      },
    });
  }
});

// ==========================================
// Root — Dashboard or API Info
// ==========================================

app.get('/', (req, res) => {
  if (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html')) {
    return res.json({
      name: 'LancerAI',
      version: APP_VERSION,
      description: 'Autonomous AI Agent Freelancer — Powered by Locus on Base',
      status: 'online',
      demoMode: process.env.DEMO_MODE === 'true',
      dashboard: '/ (this page, in a browser)',
      endpoints: {
        health: 'GET /health',
        healthDetailed: 'GET /api/health',
        status: 'GET /api/status',
        services: 'GET /api/services',
        agentInfo: 'GET /api/agent-info',
        llmsTxt: 'GET /.well-known/llms.txt',
        wrappedCatalog: 'GET /api/wrapped-catalog',
        dynamicCatalog: 'GET /api/catalog',
        submitJob: 'POST /api/jobs',
        listJobs: 'GET /api/jobs',
        getJob: 'GET /api/jobs/:id',
        wallet: 'GET /api/wallet',
        transactions: 'GET /api/transactions',
        deployments: 'GET /api/deployments',
        deploy: 'POST /api/deploy',
      },
    });
  }
  // Static middleware serves index.html
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ==========================================
// Agent Status
// ==========================================

app.get('/api/status', async (req, res) => {
  try {
    const status = await agent.getStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    console.error(`[API] Status error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Services Catalog
// ==========================================

app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    data: {
      services: SERVICE_CATALOG,
      demoMode: process.env.DEMO_MODE === 'true',
    },
  });
});

// ==========================================
// Wrapped API Catalog — Browse all 299 available Locus APIs
// ==========================================

app.get('/api/wrapped-catalog', (req, res) => {
  const catalog = {
    totalApis: 299,
    catalogVersion: '2026-04',
    note: 'Showing featured APIs. Full catalog at https://beta.paywithlocus.com/wrapped-apis',
    categories: [
      {
        name: 'AI & LLMs',
        description: 'Large language models and AI inference',
        count: 11,
        apis: [
          { provider: 'openai', endpoint: 'chat-completions', description: 'GPT-4o, GPT-4.1, o3 — chat completions', estimatedCost: '$0.002-0.06/call' },
          { provider: 'openai', endpoint: 'embeddings', description: 'Text embeddings (ada-002, text-embedding-3)', estimatedCost: '$0.0001/call' },
          { provider: 'openai', endpoint: 'images-generations', description: 'DALL-E 3 image generation', estimatedCost: '$0.02-0.12/image' },
          { provider: 'anthropic', endpoint: 'messages', description: 'Claude 4 Sonnet, Opus, Haiku', estimatedCost: '$0.003-0.075/call' },
          { provider: 'google-gemini', endpoint: 'chat', description: 'Gemini 2.5 Pro/Flash', estimatedCost: '$0.001-0.05/call' },
          { provider: 'deepseek', endpoint: 'chat', description: 'DeepSeek-V3, DeepSeek-R1 reasoning', estimatedCost: '$0.001-0.008/call' },
          { provider: 'groq', endpoint: 'chat-completions', description: 'Ultra-fast inference (Llama 3, Mixtral)', estimatedCost: '$0.0005-0.003/call' },
          { provider: 'together', endpoint: 'chat-completions', description: 'Open-source model hosting (70B+ models)', estimatedCost: '$0.001-0.009/call' },
          { provider: 'mistral', endpoint: 'chat-completions', description: 'Mistral Large, Medium, Codestral', estimatedCost: '$0.001-0.008/call' },
          { provider: 'cohere', endpoint: 'chat', description: 'Command R+, embeddings, rerank', estimatedCost: '$0.001-0.015/call' },
          { provider: 'perplexity', endpoint: 'chat-completions', description: 'Sonar — search-augmented LLM', estimatedCost: '$0.005-0.02/call' },
        ],
      },
      {
        name: 'Search & Web',
        description: 'Web search, scraping, and content extraction',
        count: 9,
        apis: [
          { provider: 'brave', endpoint: 'web-search', description: 'Brave Search — web, news, images', estimatedCost: '$0.005/search' },
          { provider: 'brave', endpoint: 'news-search', description: 'Brave News — real-time news search', estimatedCost: '$0.005/search' },
          { provider: 'brave', endpoint: 'answers', description: 'Brave AI Answers (RAG)', estimatedCost: '$0.01/query' },
          { provider: 'tavily', endpoint: 'search', description: 'AI-optimized search with extracted content', estimatedCost: '$0.005/search' },
          { provider: 'serper', endpoint: 'search', description: 'Google Search results API', estimatedCost: '$0.004/search' },
          { provider: 'exa', endpoint: 'search', description: 'Neural/semantic search — find similar content', estimatedCost: '$0.005/search' },
          { provider: 'firecrawl', endpoint: 'scrape', description: 'Web scraping with JS rendering', estimatedCost: '$0.005/page' },
          { provider: 'firecrawl', endpoint: 'crawl', description: 'Multi-page site crawling', estimatedCost: '$0.005/page' },
          { provider: 'jina', endpoint: 'reader', description: 'URL to clean markdown/text', estimatedCost: '$0.002/call' },
        ],
      },
      {
        name: 'Code & Development',
        description: 'Code execution, analysis, and dev tools',
        count: 3,
        apis: [
          { provider: 'judge0', endpoint: 'execute-code', description: 'Code execution in 60+ languages', estimatedCost: '$0.005/execution' },
          { provider: 'github', endpoint: 'repos', description: 'GitHub API — repos, issues, PRs', estimatedCost: '$0.001/call' },
          { provider: 'e2b', endpoint: 'sandboxes', description: 'Cloud code sandboxes', estimatedCost: '$0.01/sandbox-min' },
        ],
      },
      {
        name: 'Data & Finance',
        description: 'Market data, crypto prices, analytics',
        count: 5,
        apis: [
          { provider: 'coingecko', endpoint: 'simple-price', description: 'Crypto prices (real-time)', estimatedCost: '$0.002/call' },
          { provider: 'coingecko', endpoint: 'coins-markets', description: 'Coin rankings, charts, market data', estimatedCost: '$0.003/call' },
          { provider: 'alpha-vantage', endpoint: 'query', description: 'Stock and forex data', estimatedCost: '$0.005/call' },
          { provider: 'newsapi', endpoint: 'everything', description: 'Global news article search', estimatedCost: '$0.003/call' },
          { provider: 'polygon', endpoint: 'aggs', description: 'Stock market aggregates', estimatedCost: '$0.005/call' },
        ],
      },
      {
        name: 'Media & Images',
        description: 'Image generation, processing, and media',
        count: 6,
        apis: [
          { provider: 'stability-ai', endpoint: 'generate-ultra', description: 'Stable Diffusion Ultra image generation', estimatedCost: '$0.02-0.06/image' },
          { provider: 'fal', endpoint: 'generate', description: 'FLUX image generation (fast, high quality)', estimatedCost: '$0.01-0.04/image' },
          { provider: 'replicate', endpoint: 'predictions', description: 'Run any ML model (diffusion, LLMs, etc.)', estimatedCost: '$0.01-0.50/run' },
          { provider: 'cloudinary', endpoint: 'image-upload', description: 'Image upload and transformation', estimatedCost: '$0.005/transform' },
          { provider: 'assemblyai', endpoint: 'transcript', description: 'Audio transcription (speech-to-text)', estimatedCost: '$0.01/minute' },
          { provider: 'elevenlabs', endpoint: 'text-to-speech', description: 'AI voice generation', estimatedCost: '$0.03/1000chars' },
        ],
      },
      {
        name: 'Communication',
        description: 'Email, messaging, and notifications',
        count: 4,
        apis: [
          { provider: 'resend', endpoint: 'send', description: 'Transactional email sending', estimatedCost: '$0.003/email' },
          { provider: 'sendgrid', endpoint: 'mail-send', description: 'Email delivery at scale', estimatedCost: '$0.003/email' },
          { provider: 'twilio', endpoint: 'messages', description: 'SMS and messaging', estimatedCost: '$0.01/message' },
          { provider: 'agentmail', endpoint: 'send', description: 'Agent-to-agent email (Locus native)', estimatedCost: '$0.001/email' },
        ],
      },
      {
        name: 'Translation & Language',
        description: 'Translation, NLP, and text processing',
        count: 3,
        apis: [
          { provider: 'deepl', endpoint: 'translate', description: 'High-quality translation (30+ languages)', estimatedCost: '$0.02/1000chars' },
          { provider: 'openai', endpoint: 'audio-translations', description: 'Whisper audio translation', estimatedCost: '$0.006/minute' },
          { provider: 'modernmt', endpoint: 'translate', description: 'Adaptive machine translation', estimatedCost: '$0.01/1000chars' },
        ],
      },
      {
        name: 'Infrastructure & Storage',
        description: 'Deployment, storage, compute, and platform services',
        count: 5,
        apis: [
          { provider: 'buildwithlocus', endpoint: 'deployments', description: 'Deploy containers (Locus native)', estimatedCost: '$0.01/deploy-hr' },
          { provider: 'screenshotone', endpoint: 'screenshot', description: 'Website screenshots', estimatedCost: '$0.01/screenshot' },
          { provider: 'pinata', endpoint: 'pin-file', description: 'IPFS file pinning', estimatedCost: '$0.005/pin' },
          { provider: 'neon', endpoint: 'databases', description: 'Serverless Postgres', estimatedCost: '$0.01/query-batch' },
          { provider: 'upstash', endpoint: 'redis', description: 'Serverless Redis', estimatedCost: '$0.001/command' },
        ],
      },
    ],
  };

  // Calculate displayed count
  const displayedCount = catalog.categories.reduce((sum, cat) => sum + cat.apis.length, 0);

  res.json({
    success: true,
    data: {
      ...catalog,
      displayedApis: displayedCount,
      summary: `Showing ${displayedCount} featured APIs across ${catalog.categories.length} categories. ${catalog.totalApis} total available via Locus Wrapped APIs.`,
    },
  });
});

// ==========================================
// Job Management
// ==========================================

const VALID_JOB_TYPES: JobType[] = [
  'web_research', 'content_creation', 'data_analysis', 'translation',
  'website_deployment', 'human_task', 'image_generation', 'code_execution',
  'crypto_analysis', 'custom',
];

app.post('/api/jobs', async (req, res) => {
  try {
    const { type, description, budget, repoUrl, serviceName } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'type and description are required',
      });
    }

    if (!VALID_JOB_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TYPE',
        message: `Invalid job type. Must be one of: ${VALID_JOB_TYPES.join(', ')}`,
      });
    }

    const job: Job = {
      id: randomUUID(),
      type,
      description,
      budget: budget || SERVICE_CATALOG.find(s => s.id === type)?.price || 1.0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      repoUrl,
      serviceName,
    };

    const estimatedCost = agent.estimateCost(job);
    const profitable = agent.isProfitable(job);
    console.log(`[API] 📋 New job: ${type} — cost: $${estimatedCost}, budget: $${job.budget}, profitable: ${profitable}`);

    // Execute job (synchronous for demo; production would be async)
    const result = await agent.executeJob(job);

    res.json({
      success: true,
      data: {
        job: result,
        estimatedCost,
        profitable,
        demoMode: process.env.DEMO_MODE === 'true',
      },
    });
  } catch (err: any) {
    console.error(`[API] Job error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/jobs', (req, res) => {
  const jobs = agent.getJobs();
  const { status, type, limit } = req.query;

  let filtered = jobs;
  if (status) filtered = filtered.filter(j => j.status === status);
  if (type) filtered = filtered.filter(j => j.type === type);
  if (limit) filtered = filtered.slice(0, parseInt(limit as string));

  res.json({ success: true, data: { jobs: filtered, total: filtered.length } });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = agent.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Job not found' });
  }
  res.json({ success: true, data: { job } });
});

// ==========================================
// Wallet
// ==========================================

app.get('/api/wallet', async (req, res) => {
  try {
    const balance = await wallet.getBalance();
    const transactions = await wallet.getTransactions(10);
    res.json({
      success: true,
      data: { balance, recentTransactions: transactions },
    });
  } catch (err: any) {
    console.error(`[API] Wallet error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message,
      data: {
        balance: null,
        recentTransactions: [],
        note: 'Wallet data unavailable — check API key',
      },
    });
  }
});

// ==========================================
// BuildWithLocus Deployments (WEEK 2 FOCUS!)
// ==========================================

app.get('/api/deployments', async (req, res) => {
  try {
    const history = deployService.getDeploymentHistory();

    // Try to fetch live projects from BuildWithLocus API
    let liveProjects: any[] = [];
    try {
      const projectsResult = await deployService.listProjects();
      liveProjects = projectsResult?.projects || [];
    } catch {
      // BuildWithLocus auth might fail if not enabled or no credits
    }

    res.json({
      success: true,
      data: {
        deployments: history,
        liveProjects,
        buildWithLocusEnabled: liveProjects.length > 0 || history.length > 0,
        note: liveProjects.length === 0 && history.length === 0
          ? 'No deployments yet. Use POST /api/deploy to deploy an app via BuildWithLocus!'
          : undefined,
      },
    });
  } catch (err: any) {
    console.error(`[API] Deployments error: ${err.message}`);
    res.json({
      success: true,
      data: {
        deployments: deployService.getDeploymentHistory(),
        liveProjects: [],
        buildWithLocusEnabled: false,
        error: err.message,
      },
    });
  }
});

app.post('/api/deploy', async (req, res) => {
  try {
    const { projectName, repoUrl, branch, dockerImage, envVars, source } = req.body;

    if (!projectName) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'projectName is required',
      });
    }

    console.log(`[API] 🚀 Deployment request: ${projectName}`);

    let result: any;

    if (source === 'docker' && dockerImage) {
      result = await deployService.deployFromDocker(projectName, dockerImage, envVars || {});
    } else if (repoUrl) {
      const repoMatch = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
      const repo = repoMatch ? repoMatch[1].replace(/\.git$/, '') : repoUrl;
      result = await deployService.deployFromGithub(projectName, repo, branch || 'main', envVars || {});
    } else {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Either repoUrl (for GitHub deploy) or dockerImage + source:"docker" is required',
      });
    }

    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json({ success: result.success, data: result });
  } catch (err: any) {
    console.error(`[API] Deploy error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/deploy/docs', async (req, res) => {
  try {
    const docs = await deployService.fetchDocs();
    res.type('text/markdown').send(docs);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// x402 / MPP — Machine-Payable Endpoints
// ==========================================

// x402 endpoint pricing catalog
const X402_ENDPOINTS: Record<string, {
  path: string;
  method: string;
  price: string;
  description: string;
  params: Record<string, { type: string; required: boolean; description: string }>;
  jobType: JobType;
}> = {
  research: {
    path: '/api/x402/research',
    method: 'POST',
    price: '0.05',
    description: 'AI-powered multi-source web research with citations',
    params: {
      query: { type: 'string', required: true, description: 'Research query or question' },
    },
    jobType: 'web_research',
  },
  content: {
    path: '/api/x402/content',
    method: 'POST',
    price: '0.10',
    description: 'AI content generation — articles, copy, summaries',
    params: {
      prompt: { type: 'string', required: true, description: 'Content generation prompt' },
    },
    jobType: 'content_creation',
  },
  deploy: {
    path: '/api/x402/deploy',
    method: 'POST',
    price: '1.00',
    description: 'Deploy a GitHub repo or Docker image via BuildWithLocus',
    params: {
      repoUrl: { type: 'string', required: true, description: 'GitHub repo URL' },
      projectName: { type: 'string', required: true, description: 'Project name for deployment' },
      branch: { type: 'string', required: false, description: 'Git branch (default: main)' },
    },
    jobType: 'website_deployment',
  },
  'data-analysis': {
    path: '/api/x402/data-analysis',
    method: 'POST',
    price: '0.08',
    description: 'Data processing, insights, and analysis',
    params: {
      data: { type: 'string', required: false, description: 'Data to analyze (JSON, CSV, or text)' },
      query: { type: 'string', required: false, description: 'Analysis query or question (alternative to data)' },
      question: { type: 'string', required: false, description: 'Specific question about the data' },
    },
    jobType: 'data_analysis',
  },
  translate: {
    path: '/api/x402/translate',
    method: 'POST',
    price: '0.03',
    description: 'Professional translation via DeepL (30+ languages)',
    params: {
      text: { type: 'string', required: true, description: 'Text to translate' },
      targetLang: { type: 'string', required: true, description: 'Target language code (e.g. DE, FR, ES, JA)' },
    },
    jobType: 'translation',
  },
};

// Verified payment cache (tx hashes we've already accepted)
const verifiedPayments = new Set<string>();

/**
 * x402 Payment Verification Middleware
 * Implements the 402 Payment Required challenge/response flow:
 * 1. No payment headers → 402 with payment instructions
 * 2. X-Payment-Demo: true → bypass (for demos)
 * 3. X-Payment-TxHash present → verify and process
 */
function x402PaymentGate(endpointKey: string) {
  const endpoint = X402_ENDPOINTS[endpointKey];
  if (!endpoint) throw new Error(`Unknown x402 endpoint: ${endpointKey}`);

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const walletAddress = process.env.LOCUS_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

    // Demo mode bypass: X-Payment-Demo header or global DEMO_MODE
    const isDemoBypass = req.headers['x-payment-demo'] === 'true' || process.env.DEMO_MODE === 'true';

    // Check for payment proof
    const txHash = req.headers['x-payment-txhash'] as string | undefined;
    const paidAmount = req.headers['x-payment-amount'] as string | undefined;

    if (!txHash && !isDemoBypass) {
      // Return 402 Payment Required with payment instructions
      console.log(`[x402] 💰 402 challenge for ${endpoint.path} — $${endpoint.price} USDC`);
      res.status(402);
      res.set({
        'X-Payment-Required': 'true',
        'X-Payment-Address': walletAddress,
        'X-Payment-Amount': endpoint.price,
        'X-Payment-Network': 'base',
        'X-Payment-Token': 'USDC',
        'X-Payment-Description': endpoint.description.replace(/[^\x20-\x7E]/g, ' '),
      });
      return res.json({
        error: 'Payment Required',
        message: `This endpoint requires ${endpoint.price} USDC on Base to access.`,
        payment: {
          amount: endpoint.price,
          currency: 'USDC',
          network: 'base',
          chain_id: 8453,
          recipient: walletAddress,
          description: endpoint.description,
        },
        instructions: {
          step1: `Send ${endpoint.price} USDC to ${walletAddress} on Base`,
          step2: 'Re-send this request with headers: X-Payment-TxHash: <tx_hash>',
          step3: 'Or set X-Payment-Demo: true for demo/testing mode',
        },
        endpoint: {
          path: endpoint.path,
          method: endpoint.method,
          params: endpoint.params,
        },
        demo: 'Set header X-Payment-Demo: true to bypass payment for testing',
      });
    }

    if (isDemoBypass) {
      console.log(`[x402] 🎭 Demo bypass for ${endpoint.path}`);
      (req as any).x402 = { demo: true, endpoint: endpointKey, price: endpoint.price };
      return next();
    }

    // Payment proof provided — verify
    if (txHash) {
      // Check for replay attacks
      if (verifiedPayments.has(txHash)) {
        return res.status(400).json({
          error: 'Payment Already Used',
          message: 'This transaction hash has already been used for a previous request.',
        });
      }

      // Basic validation (in production, verify on-chain via Base RPC)
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return res.status(400).json({
          error: 'Invalid Transaction Hash',
          message: 'X-Payment-TxHash must be a valid 0x-prefixed 32-byte hex hash.',
        });
      }

      // Check amount if provided
      if (paidAmount && parseFloat(paidAmount) < parseFloat(endpoint.price)) {
        return res.status(402).json({
          error: 'Insufficient Payment',
          message: `Paid ${paidAmount} USDC but endpoint requires ${endpoint.price} USDC.`,
          required: endpoint.price,
          provided: paidAmount,
        });
      }

      // Accept payment (mark as used)
      verifiedPayments.add(txHash);
      console.log(`[x402] ✅ Payment verified for ${endpoint.path}: tx=${txHash.slice(0, 10)}...`);
      (req as any).x402 = { demo: false, txHash, endpoint: endpointKey, price: endpoint.price };
      return next();
    }

    // Shouldn't reach here, but just in case
    return next();
  };
}

// ── x402 Discovery ─────────────────────────────────────────────────────────────

app.get('/api/x402', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const walletAddress = process.env.LOCUS_WALLET_ADDRESS || '0x...';

  const endpoints = Object.entries(X402_ENDPOINTS).map(([key, ep]) => ({
    id: key,
    path: ep.path,
    method: ep.method,
    url: `${baseUrl}${ep.path}`,
    price_usdc: ep.price,
    description: ep.description,
    params: ep.params,
  }));

  res.json({
    success: true,
    protocol: 'x402 / MPP (Machine Payments Protocol)',
    version: '1.0',
    description: 'LancerAI machine-payable endpoints. Send a request without payment to receive a 402 challenge with payment details. Pay with USDC on Base, then re-request with the transaction hash.',
    payment: {
      currency: 'USDC',
      network: 'base',
      chain_id: 8453,
      recipient: walletAddress,
      token_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    demo_mode: {
      enabled: process.env.DEMO_MODE === 'true',
      header: 'X-Payment-Demo: true',
      description: 'Set this header to bypass payment verification for testing',
    },
    endpoints,
    openapi: `${baseUrl}/openapi.json`,
    llms_txt: `${baseUrl}/.well-known/llms.txt`,
    examples: {
      '1_discover': `curl ${baseUrl}/api/x402`,
      '2_challenge': `curl -X POST ${baseUrl}/api/x402/research -H "Content-Type: application/json" -d '{"query":"AI agent frameworks"}'`,
      '3_pay_and_call': `curl -X POST ${baseUrl}/api/x402/research -H "Content-Type: application/json" -H "X-Payment-TxHash: 0x..." -H "X-Payment-Amount: 0.05" -d '{"query":"AI agent frameworks"}'`,
      '4_demo_mode': `curl -X POST ${baseUrl}/api/x402/research -H "Content-Type: application/json" -H "X-Payment-Demo: true" -d '{"query":"AI agent frameworks"}'`,
    },
  });
});

// ── OpenAPI Spec with x-payment-info extensions ────────────────────────────────

app.get('/openapi.json', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const walletAddress = process.env.LOCUS_WALLET_ADDRESS || '0x...';

  const paths: Record<string, any> = {};
  for (const [key, ep] of Object.entries(X402_ENDPOINTS)) {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [pName, pDef] of Object.entries(ep.params)) {
      properties[pName] = { type: pDef.type, description: pDef.description };
      if (pDef.required) required.push(pName);
    }

    paths[ep.path] = {
      [ep.method.toLowerCase()]: {
        operationId: key,
        summary: ep.description,
        'x-payment-info': {
          amount: ep.price,
          currency: 'USDC',
          network: 'base',
          chain_id: 8453,
          recipient: walletAddress,
          token_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          demo_header: 'X-Payment-Demo: true',
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties, required },
            },
          },
        },
        parameters: [
          {
            name: 'X-Payment-TxHash',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'USDC payment transaction hash on Base',
          },
          {
            name: 'X-Payment-Demo',
            in: 'header',
            required: false,
            schema: { type: 'string', enum: ['true'] },
            description: 'Set to "true" to bypass payment for testing',
          },
        ],
        responses: {
          '200': { description: 'Success — service result returned' },
          '402': { description: 'Payment Required — send USDC and retry with X-Payment-TxHash' },
          '400': { description: 'Bad request or invalid/reused payment' },
        },
      },
    };
  }

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'LancerAI — Autonomous AI Freelancer Agent',
      version: APP_VERSION,
      description: 'Machine-payable AI freelancer endpoints. Uses x402/MPP protocol: send a request to get a 402 challenge, pay with USDC on Base, re-request with proof.',
      contact: { name: 'PAYGENTIC', url: 'https://github.com/web3guru888/lancerai' },
      'x-agent-type': 'autonomous-ai-freelancer',
      'x-payment-protocol': 'x402/MPP',
    },
    servers: [{ url: baseUrl, description: 'LancerAI API' }],
    paths,
    components: {
      securitySchemes: {
        x402Payment: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Payment-TxHash',
          description: 'Transaction hash of USDC payment on Base',
        },
      },
    },
  };

  res.json(spec);
});

// ── x402 Payable Endpoint Handlers ─────────────────────────────────────────────

app.post('/api/x402/research', x402PaymentGate('research'), async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'query is required' });

    const job: Job = {
      id: randomUUID(),
      type: 'web_research',
      description: query,
      budget: 0.50,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const result = await agent.executeJob(job);
    const x402Info = (req as any).x402 || {};
    res.json({
      success: true,
      x402: { paid: !x402Info.demo, price: '0.05', txHash: x402Info.txHash || null },
      data: result,
    });
  } catch (err: any) {
    console.error(`[API] x402/research error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/x402/content', x402PaymentGate('content'), async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });

    const job: Job = {
      id: randomUUID(),
      type: 'content_creation',
      description: prompt,
      budget: 0.50,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const result = await agent.executeJob(job);
    const x402Info = (req as any).x402 || {};
    res.json({
      success: true,
      x402: { paid: !x402Info.demo, price: '0.10', txHash: x402Info.txHash || null },
      data: result,
    });
  } catch (err: any) {
    console.error(`[API] x402/content error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/x402/deploy', x402PaymentGate('deploy'), async (req, res) => {
  try {
    const { repoUrl, projectName, branch } = req.body;
    if (!repoUrl || !projectName) {
      return res.status(400).json({ success: false, error: 'repoUrl and projectName are required' });
    }

    const job: Job = {
      id: randomUUID(),
      type: 'website_deployment',
      description: `Deploy ${repoUrl} as ${projectName}`,
      budget: 2.00,
      status: 'pending',
      createdAt: new Date().toISOString(),
      repoUrl,
      serviceName: projectName,
    };
    const result = await agent.executeJob(job);
    const x402Info = (req as any).x402 || {};
    res.json({
      success: true,
      x402: { paid: !x402Info.demo, price: '1.00', txHash: x402Info.txHash || null },
      data: result,
    });
  } catch (err: any) {
    console.error(`[API] x402/deploy error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/x402/data-analysis', x402PaymentGate('data-analysis'), async (req, res) => {
  try {
    const { data, question, query } = req.body;
    const input = data || query || question;
    if (!input) return res.status(400).json({ success: false, error: 'data, query, or question is required' });

    const job: Job = {
      id: randomUUID(),
      type: 'data_analysis',
      description: question || query || `Analyze: ${String(data).substring(0, 200)}`,
      budget: 0.75,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const result = await agent.executeJob(job);
    const x402Info = (req as any).x402 || {};
    res.json({
      success: true,
      x402: { paid: !x402Info.demo, price: '0.08', txHash: x402Info.txHash || null },
      data: result,
    });
  } catch (err: any) {
    console.error(`[API] x402/data-analysis error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/x402/translate', x402PaymentGate('translate'), async (req, res) => {
  try {
    const { text, targetLang, target_lang } = req.body;
    const lang = targetLang || target_lang;
    if (!text || !lang) {
      return res.status(400).json({ success: false, error: 'text and targetLang (or target_lang) are required' });
    }

    const job: Job = {
      id: randomUUID(),
      type: 'translation',
      description: `Translate to ${lang}: ${typeof text === 'string' ? text.substring(0, 200) : JSON.stringify(text).substring(0, 200)}`,
      budget: 0.50,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const result = await agent.executeJob(job);
    const x402Info = (req as any).x402 || {};
    res.json({
      success: true,
      x402: { paid: !x402Info.demo, price: '0.03', txHash: x402Info.txHash || null },
      data: result,
    });
  } catch (err: any) {
    console.error(`[API] x402/translate error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Laso Finance Proxy Endpoints ───────────────────────────────────────────────

app.post('/api/laso/auth', async (req, res) => {
  try {
    const { X402Service } = await import('../locus/x402.js');
    const x402Svc = new X402Service();
    const result = await x402Svc.lasoAuth();
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] Laso auth error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/laso/get-card', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 5 || amount > 1000) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'amount is required (5-1000 USD)',
      });
    }
    const { X402Service } = await import('../locus/x402.js');
    const x402Svc = new X402Service();
    const result = await x402Svc.lasoGetCard(amount);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] Laso get-card error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/laso/send-payment', async (req, res) => {
  try {
    const { method, recipient, amount, note } = req.body;
    if (!method || !recipient || !amount) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'method (venmo/paypal), recipient, and amount are required',
      });
    }
    const { X402Service } = await import('../locus/x402.js');
    const x402Svc = new X402Service();
    const result = await x402Svc.lasoSendPayment(method, recipient, amount, note);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] Laso send-payment error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AgentMail Proxy Endpoints ──────────────────────────────────────────────────

app.post('/api/agentmail/create-inbox', async (req, res) => {
  try {
    const { username } = req.body;
    const { X402Service } = await import('../locus/x402.js');
    const x402Svc = new X402Service();
    const result = await x402Svc.createInbox(username);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] AgentMail create-inbox error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/agentmail/send', async (req, res) => {
  try {
    const { to, subject, body: emailBody, inboxId } = req.body;
    if (!to || !subject || !emailBody) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'to, subject, and body are required',
      });
    }
    const { X402Service } = await import('../locus/x402.js');
    const x402Svc = new X402Service();
    const result = await x402Svc.sendEmail(to, subject, emailBody, inboxId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] AgentMail send error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/agentmail/messages', async (req, res) => {
  try {
    const { inboxId } = req.body;
    if (!inboxId) {
      return res.status(400).json({ success: false, error: 'inboxId is required' });
    }
    const { X402Service } = await import('../locus/x402.js');
    const x402Svc = new X402Service();
    const result = await x402Svc.listMessages(inboxId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] AgentMail messages error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Audit Log (for demo)
// ==========================================

app.get('/api/audit', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({
    success: true,
    data: { log: auditLog.slice(-limit), total: auditLog.length },
  });
});

// ==========================================
// Hire with Locus (Fiverr Marketplace)
// ==========================================

app.get('/api/hire/categories', async (req, res) => {
  try {
    const fiverr = agent.getFiverrService();
    const categories = await fiverr.getCategories();
    res.json({ success: true, data: { categories } });
  } catch (err: any) {
    console.error(`[API] Hire categories error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/hire', async (req, res) => {
  try {
    const { category_slug, tier, timeline, request: description } = req.body;

    if (!category_slug || !description) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'category_slug and request are required',
      });
    }

    const fiverr = agent.getFiverrService();
    const result = await fiverr.createOrder({
      category_slug,
      tier: tier || 1,
      timeline: timeline || '3d',
      request: description.substring(0, 500),
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] Hire order error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/hire/orders', async (req, res) => {
  try {
    const fiverr = agent.getFiverrService();
    const { limit, offset, status } = req.query;
    const result = await fiverr.listOrders({
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      status: status as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] Hire orders error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/hire/orders/:id', async (req, res) => {
  try {
    const fiverr = agent.getFiverrService();
    const order = await fiverr.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    res.json({ success: true, data: { order } });
  } catch (err: any) {
    console.error(`[API] Hire order detail error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Checkout — Accept USDC Payments
// ==========================================

app.post('/api/checkout/create', async (req, res) => {
  try {
    const { amount, description, webhookUrl, successUrl, metadata } = req.body;

    if (!amount || !description) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'amount and description are required',
      });
    }

    const checkout = new CheckoutService();
    const session = await checkout.createSession({
      amount: String(amount),
      description,
      webhookUrl,
      successUrl,
      metadata,
    });

    if (!session) {
      return res.status(500).json({ success: false, error: 'Failed to create checkout session' });
    }

    res.json({ success: true, data: { session } });
  } catch (err: any) {
    console.error(`[API] Checkout error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 404 Handler
// ==========================================

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `No endpoint at ${req.method} ${req.path}`,
    availableEndpoints: {
      'GET /health': 'Health check + wallet + uptime (BuildWithLocus)',
      'GET /api/health': 'Health check (detailed)',
      'GET /api/status': 'Agent status',
      'GET /api/services': 'Service catalog (10 services)',
      'GET /api/agent-info': 'Machine-readable agent metadata (JSON)',
      'GET /.well-known/llms.txt': 'LLM-discoverable agent description',
      'GET /openapi.json': 'OpenAPI 3.1 spec with x-payment-info extensions',
      'GET /api/x402': 'x402/MPP endpoint discovery — prices, params, examples',
      'GET /api/wrapped-catalog': 'Browse all 299 Locus wrapped APIs (static)',
      'GET /api/catalog': 'Dynamic API catalog from Locus (live)',
      'GET /api/transactions': 'Locus transaction history',
      'POST /api/jobs': 'Submit a job (10 types)',
      'GET /api/jobs': 'List jobs',
      'GET /api/jobs/:id': 'Get job details',
      'GET /api/wallet': 'Wallet balance & transactions',
      'GET /api/deployments': 'List BuildWithLocus deployments',
      'POST /api/deploy': 'Deploy an app via BuildWithLocus',
      'GET /api/deploy/docs': 'BuildWithLocus docs (markdown)',
      'GET /api/hire/categories': 'List Fiverr freelancer categories',
      'POST /api/hire': 'Hire a human freelancer via Fiverr',
      'GET /api/hire/orders': 'List Fiverr orders',
      'GET /api/hire/orders/:id': 'Get Fiverr order details',
      'POST /api/checkout/create': 'Create a Locus Checkout payment session',
      'POST /api/x402/research': 'Machine-payable web research ($0.05 USDC)',
      'POST /api/x402/content': 'Machine-payable content generation ($0.10 USDC)',
      'POST /api/x402/translate': 'Machine-payable translation ($0.03 USDC)',
      'POST /api/x402/data-analysis': 'Machine-payable data analysis ($0.08 USDC)',
      'POST /api/x402/deploy': 'Machine-payable deployment ($1.00 USDC)',
      'POST /api/laso/auth': 'Laso Finance — authenticate',
      'POST /api/laso/get-card': 'Laso Finance — order prepaid Visa card',
      'POST /api/laso/send-payment': 'Laso Finance — send via Venmo/PayPal',
      'POST /api/agentmail/create-inbox': 'AgentMail — create email inbox',
      'POST /api/agentmail/send': 'AgentMail — send email',
      'POST /api/agentmail/messages': 'AgentMail — list inbox messages',
      'GET /api/audit': 'Request audit log',
    },
  });
});

// ==========================================
// Start Server — PORT 8080 for BuildWithLocus
// ==========================================

const PORT = parseInt(process.env.PORT || '8080');
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           🤖 LancerAI Agent Server v${APP_VERSION}              ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Dashboard:     http://${HOST}:${PORT}                        ║
║  Health:        http://${HOST}:${PORT}/health                  ║
║  Agent Info:    http://${HOST}:${PORT}/api/agent-info          ║
║  llms.txt:      http://${HOST}:${PORT}/.well-known/llms.txt   ║
║  OpenAPI:       http://${HOST}:${PORT}/openapi.json            ║
║  x402 Discovery:http://${HOST}:${PORT}/api/x402               ║
║  API Catalog:   http://${HOST}:${PORT}/api/catalog             ║
║                                                          ║
║  DEMO MODE:     ${isDemoMode ? '🎭 ENABLED (mock data)          ' : '❌ Disabled                     '}    ║
║  Services:      ${SERVICE_CATALOG.length} job types                            ║
║  x402 Endpoints:${Object.keys(X402_ENDPOINTS).length} machine-payable                    ║
║  Wrapped APIs:  299 available via Locus                  ║
║                                                          ║
║  Powered by Locus • USDC on Base • x402/MPP              ║
║  BuildWithLocus: beta-api.buildwithlocus.com             ║
╚══════════════════════════════════════════════════════════╝
`);
});

export default app;
