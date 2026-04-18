/**
 * Locus Wrapped APIs — Pay-per-use access to third-party services
 * No upstream accounts needed. Locus handles auth and billing.
 */

import { LocusClient, getClient } from './client.js';

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
}

export class WrappedApiService {
  private client: LocusClient;

  constructor(client?: LocusClient) {
    this.client = client || getClient();
  }

  /** Call any wrapped API endpoint */
  async call(provider: string, endpoint: string, params: Record<string, any>): Promise<WrappedApiResult> {
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
  // Convenience methods for common providers
  // ==========================================

  /** Firecrawl: Scrape a webpage */
  async scrapeUrl(url: string, formats: string[] = ['markdown']): Promise<any> {
    return this.call('firecrawl', 'scrape', { url, formats });
  }

  /** Firecrawl: Crawl a website */
  async crawlUrl(url: string, options?: { limit?: number; maxDepth?: number }): Promise<any> {
    return this.call('firecrawl', 'crawl', { url, ...options });
  }

  /** Exa: Semantic search */
  async search(query: string, options?: { numResults?: number; type?: string }): Promise<any> {
    return this.call('exa', 'search', { query, ...options });
  }

  /** OpenAI: Chat completion */
  async chatCompletion(messages: Array<{ role: string; content: string }>, model = 'gpt-4o-mini'): Promise<any> {
    return this.call('openai', 'chat-completions', { model, messages });
  }

  /** Gemini: Chat */
  async geminiChat(prompt: string, model = 'gemini-2.0-flash'): Promise<any> {
    return this.call('gemini', 'chat', { model, prompt });
  }

  /** Brave: Web search */
  async braveSearch(query: string, count = 5): Promise<any> {
    return this.call('brave', 'web-search', { q: query, count });
  }

  /** Brave: News search */
  async braveNewsSearch(query: string, count = 5): Promise<any> {
    return this.call('brave', 'news-search', { q: query, count });
  }

  /** Brave: AI answers */
  async braveAiAnswer(messages: Array<{ role: string; content: string }>): Promise<any> {
    return this.call('brave', 'answers', { messages, model: 'brave-pro' });
  }

  /** Brave: LLM Context (pre-extracted web content for RAG) */
  async braveLlmContext(query: string, maxTokens = 8192): Promise<any> {
    return this.call('brave', 'llm-context', { q: query, maximum_number_of_tokens: maxTokens });
  }

  /** Tavily: AI-optimized search */
  async tavilySearch(query: string): Promise<any> {
    return this.call('tavily', 'search', { query });
  }

  /** DeepSeek: Chat */
  async deepseekChat(messages: Array<{ role: string; content: string }>, model = 'deepseek-chat'): Promise<any> {
    return this.call('deepseek', 'chat', { model, messages });
  }

  /** Screenshot: Capture a webpage */
  async screenshot(url: string, options?: { format?: string; full_page?: boolean }): Promise<any> {
    return this.call('screenshotone', 'screenshot', { url, ...options });
  }

  /** Resend: Send email */
  async sendEmail(to: string, subject: string, html: string, from = 'agent@lancerai.ai'): Promise<any> {
    return this.call('resend', 'send', { from, to, subject, html });
  }
}
