/**
 * Locus API Client — Core wrapper for all Locus API interactions
 * Handles wallet operations, wrapped APIs, checkout, and x402 endpoints
 */

const LOCUS_API_KEY = process.env.LOCUS_API_KEY;
const LOCUS_BASE_URL = process.env.LOCUS_BASE_URL || 'https://beta-api.paywithlocus.com/api';

class LocusClient {
  constructor(apiKey = LOCUS_API_KEY, baseUrl = LOCUS_BASE_URL) {
    if (!apiKey) throw new Error('LOCUS_API_KEY is required');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  // ── Wallet Operations ──

  async getBalance() {
    return this._request('GET', '/pay/balance');
  }

  async sendUSDC(toAddress, amount, memo = '') {
    return this._request('POST', '/pay/send', {
      to_address: toAddress,
      amount,
      memo,
    });
  }

  async sendUSDCByEmail(email, amount, memo = '', expiresInDays = 30) {
    return this._request('POST', '/pay/send-email', {
      email,
      amount,
      memo,
      expires_in_days: expiresInDays,
    });
  }

  async getTransactions(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    if (options.status) params.set('status', options.status);
    const query = params.toString() ? `?${params}` : '';
    return this._request('GET', `/pay/transactions${query}`);
  }

  async getTransaction(txId) {
    return this._request('GET', `/pay/transactions/${txId}`);
  }

  // ── Wrapped APIs ──

  async callWrappedAPI(provider, endpoint, params = {}) {
    const result = await this._request('POST', `/wrapped/${provider}/${endpoint}`, params);
    console.log(`[LOCUS] Wrapped API: ${provider}/${endpoint} — success`);
    return result;
  }

  // Convenience: Firecrawl
  async scrapeUrl(url) {
    return this.callWrappedAPI('firecrawl', 'scrape', { url });
  }

  async searchWeb(query) {
    return this.callWrappedAPI('firecrawl', 'search', { query });
  }

  // Convenience: Exa
  async exaSearch(query, numResults = 10) {
    return this.callWrappedAPI('exa', 'search', { query, numResults });
  }

  async exaAnswer(query) {
    return this.callWrappedAPI('exa', 'answer', { query });
  }

  // Convenience: OpenAI
  async chatCompletion(messages, model = 'gpt-4o-mini') {
    return this.callWrappedAPI('openai', 'chat', { model, messages });
  }

  async generateImage(prompt, options = {}) {
    return this.callWrappedAPI('openai', 'image-generate', {
      prompt,
      model: options.model || 'gpt-image-1',
      size: options.size || '1024x1024',
      quality: options.quality || 'medium',
    });
  }

  // ── x402 Endpoints ──

  async callX402(slug, params = {}) {
    return this._request('POST', `/x402/${slug}`, params);
  }

  // AgentMail
  async createEmailInbox(options = {}) {
    return this.callX402('agentmail-create-inbox', options);
  }

  async sendEmail(inboxId, to, subject, body) {
    return this.callX402('agentmail-send-message', {
      inbox_id: inboxId,
      to,
      subject,
      body,
    });
  }

  async listMessages(inboxId) {
    return this.callX402('agentmail-list-messages', { inbox_id: inboxId });
  }

  // ── Checkout SDK ──

  async checkoutPreflight(sessionId) {
    return this._request('GET', `/checkout/agent/preflight/${sessionId}`);
  }

  async checkoutPay(sessionId, payerEmail = '') {
    return this._request('POST', `/checkout/agent/pay/${sessionId}`, { payerEmail });
  }

  async checkoutPaymentStatus(txId) {
    return this._request('GET', `/checkout/agent/payments/${txId}`);
  }

  async checkoutPayments(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    const query = params.toString() ? `?${params}` : '';
    return this._request('GET', `/checkout/agent/payments${query}`);
  }

  // ── Feedback ──

  async submitFeedback(category, message, options = {}) {
    return this._request('POST', '/feedback', {
      category,
      message,
      endpoint: options.endpoint,
      context: options.context,
      source: options.source || 'manual',
    });
  }
}

module.exports = LocusClient;
