/**
 * LancerAI Agent Core
 * The autonomous AI freelancer agent that accepts jobs, does work, and gets paid.
 * Supports: web_research, content_creation, data_analysis, translation, website_deployment, custom
 */

import { WalletService, WrappedApiService, CheckoutService, X402Service, TasksService, DeployService, FiverrService } from '../locus/index.js';

export type JobType = 'web_research' | 'content_creation' | 'data_analysis' | 'translation' | 'website_deployment' | 'human_task' | 'custom';

export interface Job {
  id: string;
  type: JobType;
  description: string;
  budget: number; // USDC
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  cost?: number;
  profit?: number;
  createdAt: string;
  completedAt?: string;
  // website_deployment specific
  repoUrl?: string;
  serviceName?: string;
  deployedUrl?: string;
  // escalation tracking
  escalatedTo?: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  version: string;
  minProfitMargin: number; // minimum profit % to accept a job
  maxBudgetPerJob: number; // max USDC to spend on a single job
}

const DEFAULT_CONFIG: AgentConfig = {
  name: 'LancerAI',
  description: 'Autonomous AI freelancer agent — deploys apps, researches the web, creates content, and more. Powered by Locus on Base.',
  version: '0.2.0',
  minProfitMargin: 0.2, // 20% minimum profit
  maxBudgetPerJob: 5.0,  // $5 max spend per job
};

export const SERVICE_CATALOG = [
  {
    id: 'web_research' as JobType,
    name: 'Web Research',
    description: 'Search the web, scrape relevant pages, and provide a structured summary',
    price: 0.50,
    priceLabel: '0.50 USDC',
    estimatedTime: '30 seconds',
    icon: '🔍',
  },
  {
    id: 'content_creation' as JobType,
    name: 'Content Creation',
    description: 'Generate high-quality written content using AI',
    price: 0.50,
    priceLabel: '0.50 USDC',
    estimatedTime: '20 seconds',
    icon: '✍️',
  },
  {
    id: 'data_analysis' as JobType,
    name: 'Data Analysis',
    description: 'Analyze data, compute statistics, and answer complex questions',
    price: 1.00,
    priceLabel: '1.00 USDC',
    estimatedTime: '45 seconds',
    icon: '📊',
  },
  {
    id: 'translation' as JobType,
    name: 'Translation',
    description: 'Professional-quality translation between 30+ languages',
    price: 0.25,
    priceLabel: '0.25 USDC',
    estimatedTime: '15 seconds',
    icon: '🌐',
  },
  {
    id: 'website_deployment' as JobType,
    name: 'Website Deployment',
    description: 'Deploy a website or app from a GitHub repo via BuildWithLocus (Railway-powered). Returns a live public URL.',
    price: 2.00,
    priceLabel: '2.00 USDC',
    estimatedTime: '2-5 minutes',
    icon: '🚀',
  },
  {
    id: 'human_task' as JobType,
    name: 'Hire a Human',
    description: 'Escalate to a human freelancer via Locus Fiverr for tasks AI cannot do (design, review, specialized work)',
    price: 15.00,
    priceLabel: 'from 15 USDC',
    estimatedTime: '1-7 days',
    icon: '👤',
  },
  {
    id: 'custom' as JobType,
    name: 'Custom Task',
    description: 'Describe what you need — the agent will figure it out',
    price: 1.00,
    priceLabel: 'varies',
    estimatedTime: 'varies',
    icon: '🤖',
  },
];

export class LancerAgent {
  private config: AgentConfig;
  private wallet: WalletService;
  private wrapped: WrappedApiService;
  private checkout: CheckoutService;
  private x402: X402Service;
  private tasks: TasksService;
  private deploy: DeployService;
  private fiverr: FiverrService;
  private jobs: Map<string, Job> = new Map();
  private startTime: number;

  constructor(config?: Partial<AgentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.wallet = new WalletService();
    this.wrapped = new WrappedApiService();
    this.checkout = new CheckoutService();
    this.x402 = new X402Service();
    this.tasks = new TasksService();
    this.deploy = new DeployService();
    this.fiverr = new FiverrService();
    this.startTime = Date.now();
  }

  /** Get agent status */
  async getStatus() {
    let walletData: any = null;
    try {
      const balance = await this.wallet.getBalance();
      walletData = balance ? {
        address: balance.wallet_address,
        balance: balance.usdc_balance,
        promoCredits: balance.promo_credit_balance,
        chain: balance.chain,
        allowance: balance.allowance,
        maxTxSize: balance.max_transaction_size,
      } : null;
    } catch (err: any) {
      console.error(`[Agent] Wallet status fetch failed: ${err.message}`);
      walletData = { error: 'Could not fetch wallet status' };
    }

    const jobs = [...this.jobs.values()];
    return {
      agent: this.config.name,
      version: this.config.version,
      description: this.config.description,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      wallet: walletData,
      jobs: {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        inProgress: jobs.filter(j => j.status === 'in_progress').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
      },
      services: SERVICE_CATALOG.length,
      deployments: this.deploy.getTrackedDeployments().size,
    };
  }

  /** Estimate cost of a job */
  estimateCost(job: Partial<Job>): number {
    const service = SERVICE_CATALOG.find(s => s.id === job.type);
    return service?.price || 0.20;
  }

  /** Check if a job is profitable */
  isProfitable(job: Partial<Job>): boolean {
    const cost = this.estimateCost(job);
    const budget = job.budget || 0;
    if (budget <= 0) return false;
    const margin = (budget - cost) / budget;
    return margin >= this.config.minProfitMargin;
  }

  /** Accept and execute a job */
  async executeJob(job: Job): Promise<Job> {
    console.log(`[Agent] 📋 Executing job: ${job.type} — ${job.description}`);
    job.status = 'in_progress';
    job.createdAt = job.createdAt || new Date().toISOString();
    this.jobs.set(job.id, job);

    try {
      let result: any;

      switch (job.type) {
        case 'web_research':
          result = await this.doWebResearch(job.description);
          break;
        case 'content_creation':
          result = await this.doContentCreation(job.description);
          break;
        case 'data_analysis':
          result = await this.doDataAnalysis(job.description);
          break;
        case 'translation':
          result = await this.doTranslation(job.description);
          break;
        case 'website_deployment':
          result = await this.doWebsiteDeployment(job);
          break;
        case 'human_task':
          result = await this.doHumanTask(job);
          break;
        default:
          result = await this.doCustomJob(job.description);
      }

      job.status = 'completed';
      job.result = result;
      job.cost = this.estimateCost(job);
      job.profit = job.budget - (job.cost || 0);
      job.completedAt = new Date().toISOString();
      console.log(`[Agent] ✅ Job completed: ${job.id} (cost: $${job.cost}, profit: $${job.profit})`);
    } catch (err: any) {
      job.status = 'failed';
      job.result = { error: err.message };
      job.completedAt = new Date().toISOString();
      console.error(`[Agent] ❌ Job failed: ${err.message}`);

      // Attempt automatic escalation to human freelancer for non-network errors
      if (job.type !== 'human_task' && !err.message.includes('NETWORK_ERROR')) {
        try {
          console.log(`[Agent] 🔄 Auto-escalating failed job to human freelancer...`);
          const escalation = await this.doHumanTask(job);
          job.result = {
            originalError: err.message,
            escalated: true,
            escalation,
          };
          job.status = 'in_progress'; // Reset — human is working on it
          job.escalatedTo = 'fiverr';
          console.log(`[Agent] ✅ Job escalated to Fiverr`);
        } catch (escErr: any) {
          console.error(`[Agent] ❌ Escalation also failed: ${escErr.message}`);
        }
      }
    }

    this.jobs.set(job.id, job);
    return job;
  }

  // ==========================================
  // Service implementations
  // ==========================================

  /** Web Research: Search and summarize */
  private async doWebResearch(query: string): Promise<any> {
    const searchResult = await this.wrapped.braveSearch(query, 5);
    
    if (!searchResult.success) {
      throw new Error(`Search failed: ${searchResult.message}`);
    }

    const results = searchResult.data?.web?.results || [];
    const summaries: any[] = [];

    for (const result of results.slice(0, 3)) {
      try {
        const scraped = await this.wrapped.scrapeUrl(result.url, ['markdown']);
        if (scraped.success) {
          summaries.push({
            url: result.url,
            title: result.title,
            content: scraped.data?.markdown?.substring(0, 1000) || 'No content',
          });
        }
      } catch {
        // Skip failed scrapes
      }
    }

    return {
      query,
      resultsFound: results.length,
      summaries,
    };
  }

  /** Content Creation: Generate content using AI */
  private async doContentCreation(prompt: string): Promise<any> {
    const result = await this.wrapped.geminiChat(
      `You are a professional content creator. Create high-quality content for the following request:\n\n${prompt}`
    );
    
    if (!result.success) {
      throw new Error(`Content generation failed: ${result.message}`);
    }

    return {
      prompt,
      content: result.data,
    };
  }

  /** Data Analysis: Process and analyze data */
  private async doDataAnalysis(query: string): Promise<any> {
    const searchResult = await this.wrapped.braveSearch(query, 3);
    return {
      query,
      analysis: searchResult.data,
    };
  }

  /** Translation: Translate text */
  private async doTranslation(request: string): Promise<any> {
    const result = await this.wrapped.call('deepl', 'translate', {
      text: [request],
      target_lang: 'EN',
    });
    return {
      request,
      translation: result.data,
    };
  }

  /** Website Deployment: Deploy via BuildWithLocus */
  private async doWebsiteDeployment(job: Job): Promise<any> {
    const repoUrl = job.repoUrl || this.extractRepoUrl(job.description);
    const serviceName = job.serviceName || this.extractServiceName(job.description);

    if (!repoUrl) {
      throw new Error('No GitHub repository URL provided. Include a repo URL in the description or set repoUrl field.');
    }

    console.log(`[Agent] 🚀 Deploying: ${repoUrl} as "${serviceName}"`);

    // Parse GitHub URL
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
    const repo = repoMatch ? repoMatch[1].replace(/\.git$/, '') : repoUrl;

    // Use DeployService for the full flow
    const result = await this.deploy.deployGithubRepo(serviceName, repo, 'main', {
      PORT: '3000',
    });

    if (result.success && result.serviceUrl) {
      job.deployedUrl = result.serviceUrl;
    }

    return result;
  }

  /** Custom: Flexible job execution */
  private async doCustomJob(description: string): Promise<any> {
    const result = await this.wrapped.geminiChat(
      `You are an AI agent assistant. Help with this task:\n\n${description}\n\nProvide a clear, structured response.`
    );
    return {
      description,
      result: result.data,
    };
  }

  // ==========================================
  // Human Task Escalation (Fiverr)
  // ==========================================

  /** Human Task: Escalate to a human freelancer via Locus Fiverr */
  private async doHumanTask(job: Job): Promise<any> {
    // Parse category and tier from description, or use defaults
    const category = this.extractCategory(job.description) || 'blog_writing';
    const tier = this.extractTier(job.description) || 1;
    const timeline = this.extractTimeline(job.description) || '3d';

    console.log(`[Agent] 👤 Escalating to human: category=${category}, tier=${tier}, timeline=${timeline}`);

    const orderResult = await this.fiverr.createOrder({
      category_slug: category,
      tier,
      timeline: timeline as '1d' | '3d' | '7d',
      request: job.description.substring(0, 500),
    });

    return {
      escalated: true,
      description: job.description,
      fiverr_order: orderResult,
      note: 'Task has been escalated to a human freelancer via Locus Fiverr. Check order status for deliverables.',
    };
  }

  private extractCategory(desc: string): string | null {
    const cats = ['logo_design', 'blog_writing', 'web_design', 'video_editing', 'social_media', 'data_entry'];
    for (const cat of cats) {
      if (desc.toLowerCase().includes(cat.replace('_', ' '))) return cat;
    }
    return null;
  }

  private extractTier(desc: string): number {
    const match = desc.match(/tier\s*(\d)/i);
    return match ? parseInt(match[1]) : 1;
  }

  private extractTimeline(desc: string): string {
    if (desc.toLowerCase().includes('urgent') || desc.toLowerCase().includes('1 day')) return '1d';
    if (desc.toLowerCase().includes('1 week') || desc.toLowerCase().includes('7 day')) return '7d';
    return '3d';
  }

  // ==========================================
  // Helper methods
  // ==========================================

  private extractRepoUrl(description: string): string | null {
    const match = description.match(/https?:\/\/github\.com\/[^\s]+/i);
    return match ? match[0] : null;
  }

  private extractServiceName(description: string): string {
    // Try to extract from "deploy X" or "called X" or "named X"
    const patterns = [
      /(?:deploy|name[d]?|call[ed]*)\s+["']?([a-zA-Z0-9_-]+)["']?/i,
      /(?:service|project|app)\s+["']?([a-zA-Z0-9_-]+)["']?/i,
    ];
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) return match[1].toLowerCase();
    }
    return `lancerai-deploy-${Date.now()}`;
  }

  /** Get all jobs */
  getJobs(): Job[] {
    return [...this.jobs.values()].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  /** Get a specific job */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Get agent config */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /** Get deployment history */
  getDeployments() {
    return this.deploy.getTrackedDeployments();
  }

  /** Get the deploy service instance */
  getDeployService(): DeployService {
    return this.deploy;
  }

  /** Get the Fiverr service instance */
  getFiverrService(): FiverrService {
    return this.fiverr;
  }
}
