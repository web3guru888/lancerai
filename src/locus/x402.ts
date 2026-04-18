/**
 * Locus x402 — Machine-payable endpoints and pay-per-call APIs
 * Call custom x402 endpoints and any x402-compatible URL
 */

import { LocusClient, getClient } from './client.js';

export class X402Service {
  private client: LocusClient;

  constructor(client?: LocusClient) {
    this.client = client || getClient();
  }

  /** Fetch x402 endpoint catalog (markdown) */
  async getCatalog(): Promise<string> {
    const res = await this.client.fetchText(`${process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api'}/x402/endpoints/md`);
    return res;
  }

  /** Call a configured x402 endpoint by slug */
  async call(slug: string, params: Record<string, any> = {}): Promise<any> {
    console.log(`[x402] Calling ${slug}...`);
    const res = await this.client.post(`/x402/${slug}`, params);
    if (res.success) {
      console.log(`[x402] ✅ ${slug} succeeded`);
    } else {
      console.log(`[x402] ❌ ${slug} failed: ${res.message}`);
    }
    return res;
  }

  /** Call any x402-compatible URL ad-hoc */
  async callUrl(url: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    console.log(`[x402] Ad-hoc call: ${method} ${url}`);
    const payload: any = { url, method };
    if (body) payload.body = body;
    
    const res = await this.client.post('/x402/call', payload);
    return res;
  }

  /** List x402 transaction history */
  async getTransactions(limit = 10): Promise<any[]> {
    const res = await this.client.get<any>(`/x402/transactions?limit=${limit}`);
    return res.data?.transactions || [];
  }

  // ==========================================
  // Laso Finance convenience methods
  // ==========================================

  /** Laso: Authenticate */
  async lasoAuth(): Promise<any> {
    return this.call('laso-auth');
  }

  /** Laso: Order a prepaid card */
  async lasoGetCard(amount: number, options?: any): Promise<any> {
    return this.call('laso-get-card', { amount, ...options });
  }

  /** Laso: Send payment via Venmo/PayPal */
  async lasoSendPayment(method: string, recipient: string, amount: number, note?: string): Promise<any> {
    return this.call('laso-send-payment', { method, recipient, amount, note });
  }

  // ==========================================
  // AgentMail convenience methods
  // ==========================================

  /** AgentMail: Create an email inbox */
  async createInbox(username?: string): Promise<any> {
    return this.call('agentmail-create-inbox', username ? { username } : {});
  }

  /** AgentMail: Send email */
  async sendEmail(to: string, subject: string, body: string, inboxId?: string): Promise<any> {
    return this.call('agentmail-send-message', { to, subject, body, inbox_id: inboxId });
  }

  /** AgentMail: List messages */
  async listMessages(inboxId: string): Promise<any> {
    return this.call('agentmail-list-messages', { inbox_id: inboxId });
  }
}
