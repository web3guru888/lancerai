/**
 * LancerAI API Server
 * Express server exposing the agent's services as API endpoints.
 * Features: job management, wallet ops, BuildWithLocus deployments, static dashboard
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
      version: '0.2.0',
      environment: process.env.NODE_ENV || 'development',
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
      version: '0.2.0',
      description: 'Autonomous AI Agent Freelancer — Powered by Locus on Base',
      status: 'online',
      dashboard: '/ (this page, in a browser)',
      endpoints: {
        health: 'GET /api/health',
        status: 'GET /api/status',
        services: 'GET /api/services',
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
    data: { services: SERVICE_CATALOG },
  });
});

// ==========================================
// Job Management
// ==========================================

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

    const validTypes: JobType[] = ['web_research', 'content_creation', 'data_analysis', 'translation', 'website_deployment', 'human_task', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TYPE',
        message: `Invalid job type. Must be one of: ${validTypes.join(', ')}`,
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
      data: { job: result, estimatedCost, profitable },
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
});

app.post('/api/x402/content', async (req, res) => {
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
});

app.post('/api/x402/deploy', async (req, res) => {
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
      'GET /api/services': 'Service catalog',
      'POST /api/jobs': 'Submit a job',
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
  console.log(`
╔══════════════════════════════════════════════════╗
║           🤖 LancerAI Agent Server              ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  Dashboard:   http://${HOST}:${PORT}                  ║
║  Health:      http://${HOST}:${PORT}/health            ║
║  API Status:  http://${HOST}:${PORT}/api/status       ║
║  Services:    http://${HOST}:${PORT}/api/services     ║
║  Deployments: http://${HOST}:${PORT}/api/deployments  ║
║                                                  ║
║  Powered by Locus • USDC on Base                 ║
║  BuildWithLocus: beta-api.buildwithlocus.com     ║
╚══════════════════════════════════════════════════╝
`);
});

export default app;
