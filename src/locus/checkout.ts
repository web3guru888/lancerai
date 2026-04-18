/**
 * Locus Checkout — Accept USDC payments (Stripe-style)
 * Create checkout sessions, pay them, and poll for confirmation.
 */

import { LocusClient, getClient } from './client.js';

export interface CheckoutPreflight {
  sessionId: string;
  amount: number;
  currency: string;
  status: string;
  merchant: string;
}

export interface CheckoutPayment {
  transaction_id: string;
  status: string;
  amount: number;
}

export class CheckoutService {
  private client: LocusClient;

  constructor(client?: LocusClient) {
    this.client = client || getClient();
  }

  /** Preflight check — is the session payable? */
  async preflight(sessionId: string): Promise<CheckoutPreflight | null> {
    const res = await this.client.get<CheckoutPreflight>(`/checkout/agent/preflight/${sessionId}`);
    if (!res.success) {
      console.error(`[Checkout] Preflight failed: ${res.message}`);
      return null;
    }
    return res.data!;
  }

  /** Pay a checkout session */
  async pay(sessionId: string, payerEmail?: string): Promise<CheckoutPayment | null> {
    const body: any = {};
    if (payerEmail) body.payerEmail = payerEmail;
    
    const res = await this.client.post<CheckoutPayment>(`/checkout/agent/pay/${sessionId}`, body);
    if (!res.success) {
      console.error(`[Checkout] Payment failed: ${res.message}`);
      return null;
    }
    return res.data!;
  }

  /** Poll payment status */
  async getPaymentStatus(transactionId: string): Promise<string> {
    const res = await this.client.get<any>(`/checkout/agent/payments/${transactionId}`);
    if (!res.success) return 'UNKNOWN';
    return res.data?.status || 'UNKNOWN';
  }

  /** Pay and wait for confirmation (full flow) */
  async payAndConfirm(sessionId: string, payerEmail?: string, maxWaitMs = 30000): Promise<{
    success: boolean;
    transactionId?: string;
    status: string;
  }> {
    // 1. Preflight
    const pre = await this.preflight(sessionId);
    if (!pre) return { success: false, status: 'PREFLIGHT_FAILED' };
    
    console.log(`[Checkout] Session ${sessionId}: $${pre.amount} ${pre.currency}`);

    // 2. Pay
    const payment = await this.pay(sessionId, payerEmail);
    if (!payment) return { success: false, status: 'PAYMENT_FAILED' };

    // 3. Poll for confirmation
    const txId = payment.transaction_id;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getPaymentStatus(txId);
      if (status === 'CONFIRMED') {
        console.log(`[Checkout] ✅ Payment confirmed: ${txId}`);
        return { success: true, transactionId: txId, status: 'CONFIRMED' };
      }
      if (status === 'FAILED') {
        console.log(`[Checkout] ❌ Payment failed: ${txId}`);
        return { success: false, transactionId: txId, status: 'FAILED' };
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    return { success: false, transactionId: txId, status: 'TIMEOUT' };
  }

  /** List payment history */
  async listPayments(): Promise<any[]> {
    const res = await this.client.get<any>('/checkout/agent/payments');
    return res.data?.payments || [];
  }

  // ==========================================
  // MERCHANT SIDE — Creating checkout sessions
  // ==========================================

  /** Create a checkout session (as a seller/merchant) */
  async createSession(options: {
    amount: string;
    description: string;
    webhookUrl?: string;
    successUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    id: string;
    checkoutUrl: string;
    status: string;
    amount: string;
    currency: string;
    expiresAt: string;
  } | null> {
    const res = await this.client.post<any>('/checkout/sessions', options);
    if (!res.success) {
      console.error(`[Checkout] Session creation failed: ${res.message}`);
      return null;
    }
    console.log(`[Checkout] ✅ Session created: ${res.data?.id}`);
    console.log(`[Checkout] Checkout URL: ${res.data?.checkoutUrl}`);
    return res.data;
  }

  /** Get checkout session details */
  async getSession(sessionId: string): Promise<any> {
    const res = await this.client.get<any>(`/checkout/sessions/${sessionId}`);
    if (!res.success) return null;
    return res.data;
  }

  /** Cancel a checkout session */
  async cancelSession(sessionId: string): Promise<boolean> {
    const res = await this.client.post(`/checkout/sessions/${sessionId}/cancel`);
    return res.success;
  }
}
