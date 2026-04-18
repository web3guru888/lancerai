/**
 * Locus Wallet Operations
 * Check balance, send USDC, view transaction history
 */

import { LocusClient, getClient } from './client.js';

export interface WalletBalance {
  wallet_address: string;
  workspace_id: string;
  chain: string;
  usdc_balance: string;
  promo_credit_balance: string;
  allowance: number;
  max_transaction_size: number;
}

export interface SendResult {
  transaction_id: string;
  queue_job_id: string;
  status: string;
  from_address: string;
  to_address: string;
  amount: number;
  token: string;
  approval_url?: string;
}

export interface Transaction {
  id: string;
  created_at: string;
  status: string;
  amount_usdc: string;
  memo: string;
  to_address: string;
  category: string;
  tx_hash: string | null;
  failure_reason?: string;
}

export class WalletService {
  private client: LocusClient;

  constructor(client?: LocusClient) {
    this.client = client || getClient();
  }

  /** Check USDC balance and spending limits */
  async getBalance(): Promise<WalletBalance | null> {
    const res = await this.client.get<WalletBalance>('/pay/balance');
    if (!res.success) {
      console.error(`[Wallet] Balance check failed: ${res.message}`);
      return null;
    }
    return res.data!;
  }

  /** Send USDC to an address on Base */
  async send(toAddress: string, amount: number, memo: string): Promise<SendResult | null> {
    const res = await this.client.post<SendResult>('/pay/send', {
      to_address: toAddress,
      amount,
      memo,
    });
    if (!res.success) {
      console.error(`[Wallet] Send failed: ${res.message}`);
      return null;
    }
    return res.data!;
  }

  /** Send USDC via email (escrow) */
  async sendEmail(email: string, amount: number, memo: string, expiresInDays = 30): Promise<any> {
    const res = await this.client.post('/pay/send-email', {
      email,
      amount,
      memo,
      expires_in_days: expiresInDays,
    });
    if (!res.success) {
      console.error(`[Wallet] Email send failed: ${res.message}`);
      return null;
    }
    return res.data;
  }

  /** Get transaction history */
  async getTransactions(limit = 10, status?: string): Promise<Transaction[]> {
    let path = `/pay/transactions?limit=${limit}`;
    if (status) path += `&status=${status}`;
    
    const res = await this.client.get<{ transactions: Transaction[] }>(path);
    if (!res.success) {
      console.error(`[Wallet] Transaction history failed: ${res.message}`);
      return [];
    }
    return res.data?.transactions || [];
  }

  /** Get single transaction details */
  async getTransaction(id: string): Promise<Transaction | null> {
    const res = await this.client.get<{ transaction: Transaction }>(`/pay/transactions/${id}`);
    if (!res.success) return null;
    return res.data?.transaction || null;
  }

  /** Print wallet summary */
  async printSummary(): Promise<void> {
    const balance = await this.getBalance();
    if (!balance) {
      console.log('❌ Could not fetch wallet balance');
      return;
    }
    console.log('\n💰 LancerAI Wallet Summary');
    console.log('═══════════════════════════');
    console.log(`Address:       ${balance.wallet_address}`);
    console.log(`Chain:         ${balance.chain}`);
    console.log(`USDC Balance:  $${balance.usdc_balance}`);
    console.log(`Promo Credits: $${balance.promo_credit_balance}`);
    console.log(`Allowance:     $${balance.allowance}`);
    console.log(`Max Tx Size:   $${balance.max_transaction_size}`);
    console.log('═══════════════════════════\n');
  }
}
