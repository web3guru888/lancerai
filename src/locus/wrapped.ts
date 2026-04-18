/**
 * Locus Wrapped APIs — Pay-per-use access to third-party services
 * No upstream accounts needed. Locus handles auth and billing.
 * 
 * DEMO_MODE=true → returns realistic mock data (no API calls, no credits needed)
 */

import { LocusClient, getClient } from './client.js';

// ─── Demo Mode Helpers ─────────────────────────────────────────────────────────

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

function demoLog(method: string): void {
  console.log(`[WrappedAPI] 🎭 DEMO MODE — returning mock data for ${method}()`);
}

function mockResponse(data: Record<string, any>): WrappedApiResult {
  return { success: true, data, _mock: true };
}

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface WrappedApiCall {
  provider: string;
  endpoint: string;
  params: Record<string, any>;
}

export interface WrappedApiResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  cost?: number;
  _mock?: boolean;
}

export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  style?: string;
  model?: string;
  negativePrompt?: string;
}

export interface CryptoMarketsOptions {
  vsCurrency?: string;
  order?: string;
  perPage?: number;
  page?: number;
  sparkline?: boolean;
  ids?: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class WrappedApiService {
  private client: LocusClient;

  constructor(client?: LocusClient) {
    this.client = client || getClient();
    if (isDemoMode()) {
      console.log('[WrappedAPI] 🎭 DEMO MODE enabled — all API calls will return mock data');
    }
  }

  // ── Generic call ─────────────────────────────────────────────────────────

  /** Call any wrapped API endpoint */
  async call(provider: string, endpoint: string, params: Record<string, any>): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog(`call(${provider}/${endpoint})`);
      return mockResponse({
        provider,
        endpoint,
        result: { message: `Mock response from ${provider}/${endpoint}`, timestamp: new Date().toISOString() },
        params,
      });
    }

    console.log(`[WrappedAPI] Calling ${provider}/${endpoint}...`);
    const res = await this.client.post(`/wrapped/${provider}/${endpoint}`, params);
    
    if (res.success) {
      console.log(`[WrappedAPI] ✅ ${provider}/${endpoint} succeeded`);
    } else {
      console.log(`[WrappedAPI] ❌ ${provider}/${endpoint} failed: ${res.message}`);
    }
    
    return res as WrappedApiResult;
  }

  // ==========================================
  // Search & Web
  // ==========================================

  /** Brave: Web search */
  async braveSearch(query: string, count = 5): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('braveSearch');
      const slug = query.toLowerCase().replace(/\s+/g, '-');
      return mockResponse({
        query,
        web: {
          totalResults: 142000,
          results: [
            {
              title: `${query} — Complete Guide 2026`,
              url: `https://www.example.com/guide/${slug}`,
              description: `Comprehensive guide covering everything about ${query}. Updated April 2026 with latest insights, best practices, and expert analysis.`,
              age: '2 days ago',
            },
            {
              title: `Understanding ${query}: Expert Analysis`,
              url: `https://www.techinsights.io/${slug}-analysis`,
              description: `In-depth technical analysis of ${query}. Our research team breaks down the key factors, market trends, and future projections.`,
              age: '1 week ago',
            },
            {
              title: `${query} — Wikipedia`,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
              description: `${query} is a widely discussed topic in modern technology and business. This article covers history, applications, and current developments.`,
              age: '3 days ago',
            },
            {
              title: `Top 10 ${query} Tools and Resources`,
              url: `https://www.producthunt.com/lists/${slug}`,
              description: `Curated list of the best tools and resources for ${query}. Reviewed and rated by thousands of professionals.`,
              age: '5 days ago',
            },
            {
              title: `${query}: Latest News and Updates`,
              url: `https://news.ycombinator.com/item?id=39284571`,
              description: `Discussion thread about recent developments in ${query}. 247 comments from the developer community.`,
              age: '12 hours ago',
            },
          ],
        },
      });
    }

    return this.call('brave', 'web-search', { q: query, count });
  }

  /** Brave: News search */
  async braveNewsSearch(query: string, count = 5): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('braveNewsSearch');
      const slug = query.toLowerCase().replace(/\s+/g, '-');
      return mockResponse({
        query,
        results: [
          {
            title: `Breaking: ${query} Sees Major Developments`,
            url: `https://www.reuters.com/technology/${slug}-2026`,
            source: 'Reuters',
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            description: `Major developments in ${query} are reshaping the industry landscape. Experts weigh in on implications.`,
          },
          {
            title: `${query} Market Analysis: What You Need to Know`,
            url: `https://www.bloomberg.com/news/${slug}`,
            source: 'Bloomberg',
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            description: `Market analysts provide comprehensive breakdown of ${query} trends and future outlook.`,
          },
          {
            title: `The Future of ${query}: Industry Report`,
            url: `https://techcrunch.com/2026/04/${slug}`,
            source: 'TechCrunch',
            publishedAt: new Date(Date.now() - 86400000).toISOString(),
            description: `New industry report reveals surprising trends in ${query}. Startups and incumbents alike are taking notice.`,
          },
        ],
      });
    }

    return this.call('brave', 'news-search', { q: query, count });
  }

  /** Brave: AI answers */
  async braveAiAnswer(messages: Array<{ role: string; content: string }>): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('braveAiAnswer');
      const lastMsg = messages[messages.length - 1]?.content || 'general question';
      return mockResponse({
        answer: `Based on multiple authoritative sources, here is a comprehensive answer about "${lastMsg.substring(0, 60)}": This topic encompasses several key areas including technological innovation, market dynamics, and practical applications. Recent developments in 2026 have significantly advanced the field, with notable contributions from leading research institutions and industry players.`,
        sources: [
          { title: 'Primary Source', url: 'https://www.nature.com/articles/example' },
          { title: 'Industry Report', url: 'https://www.mckinsey.com/insights/example' },
        ],
        confidence: 0.89,
      });
    }

    return this.call('brave', 'answers', { messages, model: 'brave-pro' });
  }

  /** Brave: LLM Context (pre-extracted web content for RAG) */
  async braveLlmContext(query: string, maxTokens = 8192): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('braveLlmContext');
      return mockResponse({
        query,
        context: `Relevant context for "${query}": The subject has been extensively documented across academic papers, industry publications, and technical documentation. Key data points include market size ($4.2B as of 2026), growth rate (34% YoY), and adoption metrics across 12 major industries. The technology stack commonly associated with ${query.toLowerCase()} includes modern web frameworks, cloud-native infrastructure, and AI/ML pipelines.`,
        tokens: 847,
      });
    }

    return this.call('brave', 'llm-context', { q: query, maximum_number_of_tokens: maxTokens });
  }

  /** Exa: Semantic search */
  async search(query: string, options?: { numResults?: number; type?: string }): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('search');
      const slug = query.toLowerCase().replace(/\s+/g, '-');
      return mockResponse({
        query,
        results: [
          {
            title: `${query} — Definitive Resource`,
            url: `https://docs.example.com/${slug}`,
            score: 0.97,
            text: `Detailed documentation and guide for ${query}. Covers fundamentals, advanced techniques, and real-world case studies.`,
          },
          {
            title: `${query} Best Practices — 2026 Edition`,
            url: `https://blog.devops.com/${slug}-best-practices`,
            score: 0.91,
            text: `Updated best practices for ${query} based on industry standards and community consensus.`,
          },
          {
            title: `How to Get Started with ${query}`,
            url: `https://www.freecodecamp.org/news/${slug}-tutorial`,
            score: 0.85,
            text: `Step-by-step tutorial for beginners. From zero to production-ready in under an hour.`,
          },
        ],
        totalResults: options?.numResults || 3,
      });
    }

    return this.call('exa', 'search', { query, ...options });
  }

  /** Tavily: AI-optimized search */
  async tavilySearch(query: string): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('tavilySearch');
      return mockResponse({
        query,
        results: [
          {
            title: `${query} — Deep Analysis`,
            url: `https://www.analysis-hub.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
            content: `Comprehensive analysis of ${query} with data-driven insights and actionable recommendations.`,
            score: 0.94,
          },
        ],
        responseTime: 1.2,
      });
    }

    return this.call('tavily', 'search', { query });
  }

  // ==========================================
  // AI & LLMs
  // ==========================================

  /** OpenAI: Chat completion */
  async chatCompletion(messages: Array<{ role: string; content: string }>, model = 'gpt-4o-mini'): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('chatCompletion');
      const lastMsg = messages[messages.length - 1]?.content || 'Hello';
      return mockResponse({
        model,
        choices: [{
          message: {
            role: 'assistant',
            content: `I've analyzed your request: "${lastMsg.substring(0, 80)}"\n\nHere's my comprehensive response:\n\n1. **Key Insight**: The topic you've raised is significant and has multiple dimensions worth exploring.\n2. **Analysis**: Based on current data and trends, the optimal approach involves a combination of strategic planning and iterative execution.\n3. **Recommendation**: I suggest proceeding with a phased implementation, starting with the highest-impact elements.\n\nWould you like me to elaborate on any of these points?`,
          },
          finishReason: 'stop',
          index: 0,
        }],
        usage: { promptTokens: 245, completionTokens: 187, totalTokens: 432 },
      });
    }

    return this.call('openai', 'chat-completions', { model, messages });
  }

  /** Gemini: Chat */
  async geminiChat(prompt: string, model = 'gemini-2.0-flash'): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('geminiChat');
      return mockResponse({
        model,
        candidates: [{
          content: {
            role: 'model',
            parts: [{
              text: `Thank you for your question about "${prompt.substring(0, 60)}"\n\nLet me provide a thorough analysis:\n\n**Overview**: This is a multifaceted topic that touches on technology, economics, and user experience design.\n\n**Key Findings**:\n- Current adoption rates show a 47% increase compared to last year\n- Leading implementations focus on interoperability and composability\n- The market is consolidating around 3-4 major platforms\n\n**Next Steps**: Consider evaluating the top solutions against your specific requirements and constraints. The data suggests a strong trajectory for continued growth in this space through 2027.`,
            }],
          },
          finishReason: 'STOP',
        }],
        usageMetadata: { promptTokenCount: 198, candidatesTokenCount: 211, totalTokenCount: 409 },
      });
    }

    return this.call('gemini', 'chat', { model, prompt });
  }

  /** DeepSeek: Chat */
  async deepseekChat(messages: Array<{ role: string; content: string }>, model = 'deepseek-chat'): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('deepseekChat');
      const lastMsg = messages[messages.length - 1]?.content || 'Hello';
      return mockResponse({
        model,
        choices: [{
          message: {
            role: 'assistant',
            content: `Regarding "${lastMsg.substring(0, 60)}":\n\nI'll break this down systematically:\n\n## Analysis\nThe core question involves understanding the interplay between technical feasibility and market demand.\n\n- **Technical Complexity**: Medium-high, requiring distributed systems expertise\n- **Market Demand**: Strong, with 68% of enterprises expressing interest\n- **Implementation Timeline**: 4-8 weeks for MVP\n\n## Recommendation\nStart with a proof-of-concept focusing on the highest-value use case, then iterate based on feedback.`,
          },
          finishReason: 'stop',
          index: 0,
        }],
        usage: { promptTokens: 178, completionTokens: 203, totalTokens: 381 },
      });
    }

    return this.call('deepseek', 'chat', { model, messages });
  }

  // ==========================================
  // Web Scraping & Screenshots
  // ==========================================

  /** Firecrawl: Scrape a webpage */
  async scrapeUrl(url: string, formats: string[] = ['markdown']): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('scrapeUrl');
      const host = new URL(url).hostname;
      return mockResponse({
        url,
        markdown: `# ${host} — Page Content\n\nThis is the scraped content from ${url}. The page contains comprehensive information about the topic, including:\n\n- **Key Statistics**: Market growing at 34% YoY\n- **Expert Analysis**: Industry leaders share insights\n- **Data Points**: 2,847 words of structured content\n\n## Main Content\n\nThe page presents detailed analysis with supporting evidence, charts, and references to authoritative sources. Content was last updated on ${new Date().toISOString().split('T')[0]}.\n\n## Related Links\n\n- [Related Article 1](${url}/related-1)\n- [Related Article 2](${url}/related-2)`,
        metadata: {
          title: `Page Title — ${host}`,
          statusCode: 200,
          contentType: 'text/html',
          wordCount: 2847,
          language: 'en',
          author: 'Editorial Team',
        },
      });
    }

    return this.call('firecrawl', 'scrape', { url, formats });
  }

  /** Firecrawl: Crawl a website */
  async crawlUrl(url: string, options?: { limit?: number; maxDepth?: number }): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('crawlUrl');
      const host = new URL(url).hostname;
      return mockResponse({
        url,
        pagesFound: 7,
        pages: [
          { url: `${url}`, title: `Home — ${host}`, wordCount: 1200 },
          { url: `${url}/about`, title: `About Us — ${host}`, wordCount: 890 },
          { url: `${url}/services`, title: `Services — ${host}`, wordCount: 1560 },
          { url: `${url}/blog`, title: `Blog — ${host}`, wordCount: 2100 },
          { url: `${url}/contact`, title: `Contact — ${host}`, wordCount: 340 },
        ],
        crawlDuration: '3.2s',
      });
    }

    return this.call('firecrawl', 'crawl', { url, ...options });
  }

  /** Screenshot: Capture a webpage */
  async screenshot(url: string, options?: { format?: string; full_page?: boolean }): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('screenshot');
      return mockResponse({
        url,
        imageUrl: `https://api.screenshotmachine.com/placeholder?url=${encodeURIComponent(url)}&dimension=1280x720`,
        width: 1280,
        height: 720,
        format: options?.format || 'png',
        fileSize: '347KB',
        capturedAt: new Date().toISOString(),
      });
    }

    return this.call('screenshotone', 'screenshot', { url, ...options });
  }

  // ==========================================
  // Communication
  // ==========================================

  /** Resend: Send email */
  async sendEmail(to: string, subject: string, html: string, from = 'agent@lancerai.ai'): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('sendEmail');
      return mockResponse({
        messageId: `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
        to,
        subject,
        from,
        status: 'sent',
        sentAt: new Date().toISOString(),
        provider: 'resend',
      });
    }

    return this.call('resend', 'send', { from, to, subject, html });
  }

  // ==========================================
  // NEW: Image Generation
  // ==========================================

  /** Generate images from text prompts (fal.ai / Stability AI) */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('generateImage');
      const width = options?.width || 1024;
      const height = options?.height || 1024;
      const model = options?.model || 'fal-ai/flux/schnell';
      return mockResponse({
        prompt,
        model,
        images: [{
          url: `https://fal.media/files/mock/${Date.now().toString(36)}_generated.png`,
          width,
          height,
          contentType: 'image/png',
          seed: Math.floor(Math.random() * 999999999),
        }],
        timings: { inference: 2.34 },
        parameters: {
          width,
          height,
          style: options?.style || 'natural',
          negativePrompt: options?.negativePrompt || null,
          numInferenceSteps: 28,
          guidanceScale: 7.5,
        },
        generatedAt: new Date().toISOString(),
      });
    }

    const apiId = options?.model?.includes('stability') ? 'stability-ai' : 'fal';
    const endpoint = options?.model?.includes('stability') ? 'generate-ultra' : 'generate';

    return this.call(apiId, endpoint, {
      prompt,
      width: options?.width || 1024,
      height: options?.height || 1024,
      style: options?.style,
      negative_prompt: options?.negativePrompt,
    });
  }

  // ==========================================
  // NEW: Code Execution
  // ==========================================

  /** Execute code in 60+ languages via Judge0 */
  async executeCode(code: string, language: string, options?: { stdin?: string; timeout?: number }): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('executeCode');

      // Generate plausible output based on language
      let stdout = '';
      if (language === 'python' || language === 'python3') {
        stdout = 'Hello from PAYGENTIC code execution!\nResult: 42\nExecution completed successfully.\n';
      } else if (language === 'javascript' || language === 'nodejs') {
        stdout = `{ status: "ok", result: 42, timestamp: "${new Date().toISOString()}" }\n`;
      } else if (language === 'bash' || language === 'shell') {
        stdout = 'PAYGENTIC Agent v1.0\nSystem check: OK\nAll services running.\n';
      } else if (language === 'rust') {
        stdout = 'Compiled successfully.\nResult: 42\n';
      } else if (language === 'go') {
        stdout = 'package main: ok\nResult: 42\n';
      } else {
        stdout = `[${language}] Output: execution completed\n`;
      }

      return mockResponse({
        language,
        version: language === 'python3' || language === 'python' ? '3.12.2' : language === 'javascript' ? '20.11.0' : '1.0',
        status: { id: 3, description: 'Accepted' },
        stdout,
        stderr: '',
        exitCode: 0,
        time: '0.042',
        memory: 9216,
        compileOutput: null,
        token: `tok_${Math.random().toString(36).substring(2, 10)}`,
        executedAt: new Date().toISOString(),
      });
    }

    // Judge0 language IDs for common languages
    const languageIds: Record<string, number> = {
      python: 71, python3: 71,
      javascript: 63, nodejs: 63,
      typescript: 74,
      c: 50, 'c++': 54, cpp: 54,
      java: 62, rust: 73, go: 60,
      ruby: 72, bash: 46, shell: 46,
    };

    return this.call('judge0', 'execute-code', {
      source_code: code,
      language_id: languageIds[language.toLowerCase()] || 71,
      stdin: options?.stdin || '',
      cpu_time_limit: options?.timeout || 10,
    });
  }

  // ==========================================
  // NEW: Crypto Market Data
  // ==========================================

  /** Get crypto market data from CoinGecko */
  async getCryptoMarkets(options?: CryptoMarketsOptions): Promise<WrappedApiResult> {
    if (isDemoMode()) {
      demoLog('getCryptoMarkets');
      return mockResponse({
        vsCurrency: options?.vsCurrency || 'usd',
        markets: [
          {
            id: 'bitcoin', symbol: 'btc', name: 'Bitcoin',
            image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            current_price: 94250.00, market_cap: 1867000000000, market_cap_rank: 1,
            total_volume: 38200000000,
            price_change_percentage_24h: 2.34, price_change_percentage_7d: 5.12,
            ath: 109000.00, ath_date: '2025-01-20T14:30:00Z',
            last_updated: new Date().toISOString(),
          },
          {
            id: 'ethereum', symbol: 'eth', name: 'Ethereum',
            image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            current_price: 3780.00, market_cap: 455000000000, market_cap_rank: 2,
            total_volume: 18500000000,
            price_change_percentage_24h: 1.87, price_change_percentage_7d: 4.23,
            ath: 4891.70, ath_date: '2024-12-06T15:21:00Z',
            last_updated: new Date().toISOString(),
          },
          {
            id: 'solana', symbol: 'sol', name: 'Solana',
            image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
            current_price: 178.50, market_cap: 86200000000, market_cap_rank: 5,
            total_volume: 4300000000,
            price_change_percentage_24h: 3.45, price_change_percentage_7d: 8.91,
            ath: 295.83, ath_date: '2025-01-19T11:15:00Z',
            last_updated: new Date().toISOString(),
          },
          {
            id: 'usd-coin', symbol: 'usdc', name: 'USD Coin',
            image: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
            current_price: 1.00, market_cap: 52400000000, market_cap_rank: 6,
            total_volume: 8900000000,
            price_change_percentage_24h: 0.01, price_change_percentage_7d: -0.02,
            ath: 1.17, ath_date: '2019-05-08T00:40:28Z',
            last_updated: new Date().toISOString(),
          },
          {
            id: 'chainlink', symbol: 'link', name: 'Chainlink',
            image: 'https://assets.coingecko.com/coins/images/877/large/chainlink.png',
            current_price: 22.85, market_cap: 14600000000, market_cap_rank: 12,
            total_volume: 890000000,
            price_change_percentage_24h: -0.78, price_change_percentage_7d: 3.15,
            ath: 52.88, ath_date: '2021-05-10T00:13:57Z',
            last_updated: new Date().toISOString(),
          },
        ],
        totalCoins: options?.perPage || 5,
        page: options?.page || 1,
        fetchedAt: new Date().toISOString(),
      });
    }

    return this.call('coingecko', 'coins-markets', {
      vs_currency: options?.vsCurrency || 'usd',
      order: options?.order || 'market_cap_desc',
      per_page: options?.perPage || 10,
      page: options?.page || 1,
      sparkline: options?.sparkline || false,
      ids: options?.ids,
    });
  }

  // ==========================================
  // Catalog
  // ==========================================

  /** List all available wrapped APIs */
  getAvailableApis(): Array<{ id: string; name: string; description: string; category: string }> {
    return [
      { id: 'brave-search', name: 'Brave Search', description: 'Web, news, AI answers, LLM context', category: 'search' },
      { id: 'tavily', name: 'Tavily', description: 'AI-optimized search with depth control', category: 'search' },
      { id: 'exa', name: 'Exa', description: 'Semantic / neural search', category: 'search' },
      { id: 'firecrawl', name: 'Firecrawl', description: 'Web scraping and crawling', category: 'data' },
      { id: 'openai', name: 'OpenAI', description: 'GPT-4o chat completions, embeddings, DALL-E', category: 'ai' },
      { id: 'gemini', name: 'Google Gemini', description: 'Gemini 2.0 Flash chat', category: 'ai' },
      { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek-V3, R1 reasoning', category: 'ai' },
      { id: 'screenshotone', name: 'ScreenshotOne', description: 'Website screenshots', category: 'utility' },
      { id: 'resend', name: 'Resend', description: 'Transactional email sending', category: 'communication' },
      { id: 'fal', name: 'Fal AI', description: 'Image generation (Flux, SDXL)', category: 'media' },
      { id: 'stability-ai', name: 'Stability AI', description: 'Stable Diffusion Ultra image generation', category: 'media' },
      { id: 'judge0', name: 'Judge0', description: 'Code execution in 60+ languages', category: 'dev' },
      { id: 'coingecko', name: 'CoinGecko', description: 'Cryptocurrency market data', category: 'finance' },
      { id: 'deepl', name: 'DeepL', description: 'Professional translation (30+ languages)', category: 'translation' },
    ];
  }
}
