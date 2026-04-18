/**
 * Locus Fiverr / Hire with Locus — Hire human freelancers programmatically
 * Browse categories, place orders, track delivery status.
 * Uses the Locus Fiverr API at /fiverr/*
 */

import { LocusClient, getClient } from './client.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FiverrCategory {
  name: string;
  slug: string;
  description: string;
  tiers: Array<{ tier: number; price: number }>;
}

export interface FiverrOrderRequest {
  category_slug: string;
  tier: number;
  timeline: '1d' | '3d' | '7d';
  request: string; // max 500 chars, can include URLs for file references
}

export type FiverrOrderStatus =
  | 'CREATED'
  | 'DEPOSITING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'CANCELLING'
  | 'CANCELLED';

export interface FiverrOrder {
  id: string;
  submitted_at: string;
  amount_usdc: string;
  request: string;
  category: string;
  status: FiverrOrderStatus;
  status_description: string;
  deliverables: string[] | null;
}

/** Response when order is created and deposit starts immediately */
export interface FiverrOrderCreated {
  escrow_deposit_id: string;
  status: string;
  amount: number;
  category_slug: string;
  tier: number;
  recipient_address: string;
  escrow_contract: string;
}

/** Response when order needs spending approval first */
export interface FiverrOrderPendingApproval {
  pending_approval_id: string;
  approval_url: string;
  status: 'PENDING_APPROVAL';
  amount: number;
  category_slug: string;
  tier: number;
  message: string;
}

export type FiverrCreateOrderResponse = FiverrOrderCreated | FiverrOrderPendingApproval;

export interface FiverrListOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

// Terminal statuses — no further state changes expected
const TERMINAL_STATUSES: FiverrOrderStatus[] = ['COMPLETED', 'CANCELLED'];

// ─── Service ─────────────────────────────────────────────────────────────────

export class FiverrService {
  private client: LocusClient;

  constructor(client?: LocusClient) {
    this.client = client || getClient();
  }

  // ── Browse Categories ──────────────────────────────────────────────────

  /** Fetch all available Fiverr categories with tiers and pricing */
  async getCategories(): Promise<FiverrCategory[]> {
    console.log('[Fiverr] Fetching categories...');
    const res = await this.client.get<FiverrCategory[] | { categories: FiverrCategory[] }>('/fiverr/categories');

    if (!res.success) {
      console.error(`[Fiverr] Failed to fetch categories: ${res.error || res.message}`);
      return [];
    }

    // Handle both array and { categories: [...] } response shapes
    const categories = Array.isArray(res.data) ? res.data : (res.data?.categories || []);
    console.log(`[Fiverr] Found ${categories.length} categories`);
    return categories;
  }

  /** Print a human-readable summary of available categories */
  async printCatalog(): Promise<void> {
    const categories = await this.getCategories();
    if (categories.length === 0) {
      console.log('❌ No categories available');
      return;
    }

    console.log('\n🛒 Hire with Locus — Service Catalog');
    console.log('═══════════════════════════════════════════');
    for (const cat of categories) {
      const prices = cat.tiers.map(t => `Tier ${t.tier}: $${t.price}`).join(', ');
      console.log(`  ${cat.name} (${cat.slug})`);
      console.log(`    ${cat.description}`);
      console.log(`    Pricing: ${prices}`);
      console.log('');
    }
    console.log('═══════════════════════════════════════════\n');
  }

  // ── Place Orders ───────────────────────────────────────────────────────

  /** Create a new Fiverr order (hire a human) */
  async createOrder(request: FiverrOrderRequest): Promise<FiverrCreateOrderResponse | null> {
    // Validate request length
    if (request.request.length > 500) {
      console.error(`[Fiverr] Request too long (${request.request.length}/500 chars). Truncating.`);
      request.request = request.request.slice(0, 500);
    }

    console.log(`[Fiverr] Creating order: ${request.category_slug} tier ${request.tier} (${request.timeline})`);
    console.log(`[Fiverr] Request: "${request.request.slice(0, 80)}${request.request.length > 80 ? '...' : ''}"`);

    const res = await this.client.post<FiverrCreateOrderResponse>('/fiverr/orders', request);

    if (!res.success) {
      console.error(`[Fiverr] Order creation failed: ${res.error || res.message}`);
      return null;
    }

    const data = res.data!;

    // Check if this needs spending approval
    if ('pending_approval_id' in data) {
      const pending = data as FiverrOrderPendingApproval;
      console.log(`[Fiverr] ⚠️  Order needs approval: ${pending.message}`);
      console.log(`[Fiverr] Approval URL: ${pending.approval_url}`);
      console.log(`[Fiverr] Amount: $${pending.amount} USDC`);
    } else {
      const created = data as FiverrOrderCreated;
      console.log(`[Fiverr] ✅ Order created! Escrow ID: ${created.escrow_deposit_id}`);
      console.log(`[Fiverr] Amount: $${created.amount} USDC → ${created.recipient_address}`);
      console.log(`[Fiverr] Escrow contract: ${created.escrow_contract}`);
    }

    return data;
  }

  // ── Track Orders ───────────────────────────────────────────────────────

  /** List orders with optional filtering and pagination */
  async listOrders(options?: FiverrListOptions): Promise<FiverrOrder[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.status) params.set('status', options.status);

    const query = params.toString();
    const path = `/fiverr/orders${query ? `?${query}` : ''}`;

    console.log(`[Fiverr] Listing orders... ${query ? `(${query})` : ''}`);
    const res = await this.client.get<FiverrOrder[] | { orders: FiverrOrder[] }>(path);

    if (!res.success) {
      console.error(`[Fiverr] Failed to list orders: ${res.error || res.message}`);
      return [];
    }

    // Handle both array and { orders: [...] } response shapes
    const orders = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
    console.log(`[Fiverr] Found ${orders.length} orders`);
    return orders;
  }

  /** Get details for a single order */
  async getOrder(orderId: string): Promise<FiverrOrder | null> {
    console.log(`[Fiverr] Fetching order: ${orderId}`);
    const res = await this.client.get<FiverrOrder | { order: FiverrOrder }>(`/fiverr/orders/${orderId}`);

    if (!res.success) {
      console.error(`[Fiverr] Failed to fetch order ${orderId}: ${res.error || res.message}`);
      return null;
    }

    // Handle both direct and nested response shapes
    const order = (res.data && 'id' in res.data) ? res.data as FiverrOrder : (res.data as any)?.order || null;

    if (order) {
      console.log(`[Fiverr] Order ${orderId}: ${order.status} — ${order.status_description}`);
      if (order.deliverables?.length) {
        console.log(`[Fiverr] Deliverables: ${order.deliverables.length} file(s)`);
      }
    }

    return order;
  }

  // ── Polling ────────────────────────────────────────────────────────────

  /**
   * Poll an order until it reaches a terminal state (COMPLETED or CANCELLED).
   * @param orderId - The order to poll
   * @param intervalMs - Time between polls (default 30s)
   * @param maxWaitMs - Maximum total wait time (default 30 min)
   * @returns The final order state, or null if timeout
   */
  async pollOrder(
    orderId: string,
    intervalMs = 30_000,
    maxWaitMs = 30 * 60 * 1000
  ): Promise<FiverrOrder | null> {
    console.log(`[Fiverr] Polling order ${orderId} (interval: ${intervalMs / 1000}s, max: ${maxWaitMs / 60000}min)...`);

    const startTime = Date.now();
    let lastStatus: string = '';

    while (Date.now() - startTime < maxWaitMs) {
      const order = await this.getOrder(orderId);

      if (!order) {
        console.error(`[Fiverr] Poll: could not fetch order ${orderId}, retrying...`);
        await this.sleep(intervalMs);
        continue;
      }

      // Log status transitions
      if (order.status !== lastStatus) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`[Fiverr] Poll: ${orderId} → ${order.status} (after ${elapsed}s)`);
        lastStatus = order.status;
      }

      // Check for terminal state
      if (TERMINAL_STATUSES.includes(order.status)) {
        console.log(`[Fiverr] ✅ Order ${orderId} reached terminal state: ${order.status}`);
        if (order.deliverables?.length) {
          console.log(`[Fiverr] Deliverables:`);
          for (const d of order.deliverables) {
            console.log(`  → ${d}`);
          }
        }
        return order;
      }

      await this.sleep(intervalMs);
    }

    console.warn(`[Fiverr] ⏰ Timeout polling order ${orderId} after ${maxWaitMs / 60000} minutes`);
    return null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Print a summary of recent orders */
  async printOrdersSummary(limit = 5): Promise<void> {
    const orders = await this.listOrders({ limit });
    if (orders.length === 0) {
      console.log('📋 No Fiverr orders yet');
      return;
    }

    console.log(`\n📋 Recent Hire with Locus Orders (${orders.length})`);
    console.log('═══════════════════════════════════════════');
    for (const order of orders) {
      const statusEmoji =
        order.status === 'COMPLETED' ? '✅' :
        order.status === 'CANCELLED' ? '❌' :
        order.status === 'PENDING_APPROVAL' ? '⚠️' :
        '⏳';
      console.log(`  ${statusEmoji} ${order.id} — ${order.category}`);
      console.log(`     Status: ${order.status} | Amount: $${order.amount_usdc} USDC`);
      console.log(`     Request: "${order.request.slice(0, 60)}${order.request.length > 60 ? '...' : ''}"`);
      if (order.deliverables?.length) {
        console.log(`     Deliverables: ${order.deliverables.length} file(s)`);
      }
      console.log('');
    }
    console.log('═══════════════════════════════════════════\n');
  }
}
