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
import { WalletService, DeployService, CheckoutService } from '../locus/index.js';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// ==========================================
// CORS — allow cross-origin requests
// ==========================================

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '0.3.0',
      environment: process.env.NODE_ENV || 'development',
      demoMode: process.env.DEMO_MODE === 'true',
      wrappedApiCount: 299,
      services: SERVICE_CATALOG.length,
    },
  });
});

// ==========================================
// Root — Dashboard or API Info
// ==========================================

app.get('/', (req, res) => {
  if (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html')) {
    return res.json({
      name: 'LancerAI',
      version: '0.3.0',
      description: 'Autonomous AI Agent Freelancer — Powered by Locus on Base',
      status: 'online',
      demoMode: process.env.DEMO_MODE === 'true',
      dashboard: '/ (this page, in a browser)',
      endpoints: {
        health: 'GET /api/health',
        status: 'GET /api/status',
        services: 'GET /api/services',
        wrappedCatalog: 'GET /api/wrapped-catalog',
        submitJob: 'POST /api/jobs',
        listJobs: 'GET /api/jobs',
        getJob: 'GET /api/jobs/:id',
        wallet: 'GET /api/wallet',
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
// x402 Machine-Payable Endpoints
// ==========================================

app.post('/api/x402/research', async (req, res) => {
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
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] x402/research error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/x402/content', async (req, res) => {
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
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] x402/content error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/x402/deploy', async (req, res) => {
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
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] x402/deploy error: ${err.message}`);
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
      'GET /health': 'Health check (BuildWithLocus)',
      'GET /api/health': 'Health check (detailed)',
      'GET /api/status': 'Agent status',
      'GET /api/services': 'Service catalog (10 services)',
      'GET /api/wrapped-catalog': 'Browse all 299 Locus wrapped APIs',
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
      'POST /api/x402/research': 'Machine-payable web research',
      'POST /api/x402/content': 'Machine-payable content generation',
      'POST /api/x402/deploy': 'Machine-payable deployment',
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
╔══════════════════════════════════════════════════════╗
║           🤖 LancerAI Agent Server v0.3.0           ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Dashboard:     http://${HOST}:${PORT}                    ║
║  Health:        http://${HOST}:${PORT}/health              ║
║  API Status:    http://${HOST}:${PORT}/api/status         ║
║  Services:      http://${HOST}:${PORT}/api/services       ║
║  API Catalog:   http://${HOST}:${PORT}/api/wrapped-catalog║
║  Deployments:   http://${HOST}:${PORT}/api/deployments    ║
║                                                      ║
║  DEMO MODE:     ${isDemoMode ? '🎭 ENABLED (mock data)          ' : '❌ Disabled                     '}║
║  Services:      ${SERVICE_CATALOG.length} job types                        ║
║  Wrapped APIs:  299 available via Locus              ║
║                                                      ║
║  Powered by Locus • USDC on Base                     ║
║  BuildWithLocus: beta-api.buildwithlocus.com         ║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
