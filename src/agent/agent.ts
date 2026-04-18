/**
 * LancerAI Agent Core
 * The autonomous AI freelancer agent that accepts jobs, does work, and gets paid.
 * Supports: web_research, content_creation, data_analysis, translation, website_deployment,
 *           human_task, image_generation, code_execution, crypto_analysis, custom
 */

import { WalletService, WrappedApiService, CheckoutService, X402Service, TasksService, DeployService, FiverrService } from '../locus/index.js';

export type JobType =
  | 'web_research'
  | 'content_creation'
  | 'data_analysis'
  | 'translation'
  | 'website_deployment'
  | 'human_task'
  | 'image_generation'
  | 'code_execution'
  | 'crypto_analysis'
  | 'custom';

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
  description: 'Autonomous AI freelancer agent — deploys apps, researches the web, creates content, generates images, executes code, and more. Powered by Locus on Base.',
  version: '0.4.0',
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
    id: 'image_generation' as JobType,
    name: 'AI Image Generation',
    description: 'Generate stunning images from text prompts using Flux/Stable Diffusion via Locus',
    price: 1.00,
    priceLabel: '1.00 USDC',
    estimatedTime: '30 seconds',
    icon: '🎨',
  },
  {
    id: 'code_execution' as JobType,
    name: 'Code Execution',
    description: 'Execute code in 60+ languages with sandboxed runtime (Python, JS, Rust, Go, etc.)',
    price: 0.25,
    priceLabel: '0.25 USDC',
    estimatedTime: '10 seconds',
    icon: '💻',
  },
  {
    id: 'crypto_analysis' as JobType,
    name: 'Crypto Market Analysis',
    description: 'Real-time crypto market data from CoinGecko + AI-powered analysis and insights',
    price: 0.75,
    priceLabel: '0.75 USDC',
    estimatedTime: '20 seconds',
    icon: '📈',
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

    if (process.env.DEMO_MODE === 'true') {
      console.log('[Agent] 🎭 Running in DEMO MODE — mock data will be used for all API calls');
    }
  }

  /** Get agent status */
  async getStatus() {
    const isDemoMode = process.env.DEMO_MODE === 'true';
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
      demoMode: isDemoMode,
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
    const isDemoMode = process.env.DEMO_MODE === 'true';
    console.log(`[Agent] 📋 Executing job: ${job.type} — ${job.description}${isDemoMode ? ' [DEMO MODE]' : ''}`);
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
        case 'image_generation':
          result = await this.doImageGeneration(job.description);
          break;
        case 'code_execution':
          result = await this.doCodeExecution(job.description);
          break;
        case 'crypto_analysis':
          result = await this.doCryptoAnalysis(job.description);
          break;
        default:
          result = await this.doCustomJob(job.description);
      }

      job.status = 'completed';
      job.result = result;
      job.cost = this.estimateCost(job);
      job.profit = job.budget - (job.cost || 0);
      job.completedAt = new Date().toISOString();
      console.log(`[Agent] ✅ Job completed: ${job.id} (cost: $${job.cost}, profit: $${job.profit})${isDemoMode ? ' [DEMO]' : ''}`);
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
      _mock: searchResult._mock || false,
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
      _mock: result._mock || false,
    };
  }

  /** Data Analysis: Process and analyze data */
  private async doDataAnalysis(query: string): Promise<any> {
    // Search for relevant data
    const searchResult = await this.wrapped.braveSearch(query, 3);
    
    // Use Gemini to analyze
    const analysisResult = await this.wrapped.geminiChat(
      `You are a data analyst. Analyze the following topic and provide structured insights with key statistics, trends, and conclusions:\n\n${query}\n\nSearch context: ${JSON.stringify(searchResult.data?.web?.results?.slice(0, 3) || []).substring(0, 2000)}`
    );

    return {
      query,
      searchData: searchResult.data,
      analysis: analysisResult.data,
      _mock: searchResult._mock || false,
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
      _mock: result._mock || false,
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
      _mock: result._mock || false,
    };
  }

  // ==========================================
  // NEW: Image Generation
  // ==========================================

  /** AI Image Generation: Create images from text prompts */
  private async doImageGeneration(prompt: string): Promise<any> {
    console.log(`[Agent] 🎨 Generating image for prompt: "${prompt.substring(0, 80)}..."`);
    
    const imageResult = await this.wrapped.generateImage(prompt);
    
    if (!imageResult.success) {
      throw new Error(`Image generation failed: ${imageResult.message}`);
    }

    return {
      prompt,
      images: imageResult.data?.images || [],
      model: imageResult.data?.model || 'fal-ai/flux/schnell',
      parameters: imageResult.data?.parameters || {},
      timings: imageResult.data?.timings || {},
      _mock: imageResult._mock || false,
    };
  }

  // ==========================================
  // NEW: Code Execution
  // ==========================================

  /** Code Execution: Run code in sandboxed environment */
  private async doCodeExecution(description: string): Promise<any> {
    console.log(`[Agent] 💻 Executing code from description`);
    
    // Parse language and code from description
    let language = 'python';
    let code = description;

    const langMatch = description.match(/language:\s*(\w+)/i);
    if (langMatch) {
      language = langMatch[1].toLowerCase();
    }

    const codeMatch = description.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (codeMatch) {
      code = codeMatch[1].trim();
    } else {
      // Try to extract code after the language line
      const lines = description.split('\n');
      const langLineIdx = lines.findIndex(l => /language:/i.test(l));
      if (langLineIdx >= 0) {
        code = lines.slice(langLineIdx + 1).join('\n').trim();
      }
    }

    const execResult = await this.wrapped.executeCode(code, language);
    
    if (!execResult.success) {
      throw new Error(`Code execution failed: ${execResult.message}`);
    }

    return {
      language,
      code,
      output: execResult.data?.stdout || '',
      stderr: execResult.data?.stderr || '',
      exitCode: execResult.data?.exitCode ?? 0,
      executionTime: execResult.data?.time || null,
      memory: execResult.data?.memory || null,
      _mock: execResult._mock || false,
    };
  }

  // ==========================================
  // NEW: Crypto Market Analysis
  // ==========================================

  /** Crypto Analysis: Market data + AI insights */
  private async doCryptoAnalysis(query: string): Promise<any> {
    console.log(`[Agent] 📈 Running crypto analysis for: "${query.substring(0, 80)}"`);
    
    // Step 1: Get market data
    const marketData = await this.wrapped.getCryptoMarkets();
    
    if (!marketData.success) {
      throw new Error(`Market data fetch failed: ${marketData.message}`);
    }

    // Step 2: Use Gemini to analyze the data
    const markets = marketData.data?.markets || [];
    const analysisPrompt = `You are a crypto market analyst. Analyze the following cryptocurrency market data and answer this question: "${query}"

Market Data:
${JSON.stringify(markets.slice(0, 10), null, 2).substring(0, 3000)}

Provide a concise analysis with:
1. Key market observations
2. Notable trends and price movements
3. Risk assessment
4. Actionable insights`;

    const analysis = await this.wrapped.geminiChat(analysisPrompt);

    return {
      query,
      marketData: {
        topCoins: markets.slice(0, 10).map((c: any) => ({
          name: c.name,
          symbol: c.symbol,
          price: c.current_price,
          change24h: c.price_change_percentage_24h,
          change7d: c.price_change_percentage_7d,
          marketCap: c.market_cap,
        })),
        fetchedAt: marketData.data?.fetchedAt || new Date().toISOString(),
      },
      analysis: analysis.data?.candidates?.[0]?.content?.parts?.[0]?.text
        || analysis.data?.choices?.[0]?.message?.content
        || JSON.stringify(analysis.data),
      _mock: marketData._mock || false,
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

  /** Get the wrapped API service instance */
  getWrappedService(): WrappedApiService {
    return this.wrapped;
  }
}
