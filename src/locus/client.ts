/**
 * Locus API Client — Core HTTP client for all Locus API interactions
 * Handles authentication, retries, and response parsing.
 */

export interface LocusConfig {
  apiKey: string;
  apiBase: string;
}

export interface LocusResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class LocusClient {
  private apiKey: string;
  private apiBase: string;

  constructor(config?: Partial<LocusConfig>) {
    this.apiKey = config?.apiKey || process.env.LOCUS_API_KEY || '';
    this.apiBase = config?.apiBase || process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api';
    
    if (!this.apiKey) {
      throw new Error('LOCUS_API_KEY is required. Set it in env or pass in config.');
    }
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any,
    retries = 2
  ): Promise<LocusResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.apiBase}${path}`;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const options: RequestInit = {
          method,
          headers: this.headers,
        };
        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json() as LocusResponse<T>;

        // Log for audit trail
        console.log(`[Locus ${method}] ${path} → ${response.status} (${data.success ? 'ok' : data.error || 'error'})`);

        if (response.status === 429 && attempt < retries) {
          const wait = Math.pow(2, attempt + 1) * 1000;
          console.log(`[Locus] Rate limited, waiting ${wait}ms...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        return data;
      } catch (err: any) {
        console.error(`[Locus] Request failed (attempt ${attempt + 1}): ${err.message}`);
        if (attempt === retries) {
          return { success: false, error: 'NETWORK_ERROR', message: err.message };
        }
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    return { success: false, error: 'MAX_RETRIES', message: 'All retries exhausted' };
  }

  async get<T = any>(path: string): Promise<LocusResponse<T>> {
    return this.request<T>('GET', path);
  }

  async post<T = any>(path: string, body?: any): Promise<LocusResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  // Convenience: fetch raw text (for markdown docs)
  async fetchText(url: string): Promise<string> {
    const response = await fetch(url, { headers: this.headers });
    return response.text();
  }
}

// Singleton default client
let _defaultClient: LocusClient | null = null;

export function getClient(config?: Partial<LocusConfig>): LocusClient {
  if (!_defaultClient || config) {
    _defaultClient = new LocusClient(config);
  }
  return _defaultClient;
}
