/**
 * Wallet Manager — Track balance, costs, and revenue
 */

class WalletManager {
  constructor(locusClient) {
    this.client = locusClient;
    this.totalSpent = 0;
    this.totalEarned = 0;
    this.apiCallLog = [];
  }

  async getBalance() {
    const result = await this.client.getBalance();
    return {
      balance: parseFloat(result.data.usdc_balance),
      promoCredits: parseFloat(result.data.promo_credit_balance || '0'),
      walletAddress: result.data.wallet_address,
      allowance: result.data.allowance,
      maxTxSize: result.data.max_transaction_size,
    };
  }

  logApiCall(provider, endpoint, cost, purpose) {
    const entry = {
      timestamp: new Date().toISOString(),
      provider,
      endpoint,
      cost,
      purpose,
    };
    this.apiCallLog.push(entry);
    this.totalSpent += cost;
    console.log(`[WALLET] API call: ${provider}/${endpoint} — $${cost} — ${purpose}`);
    return entry;
  }

  logEarning(amount, source) {
    this.totalEarned += amount;
    console.log(`[WALLET] Earned: $${amount} from ${source}`);
  }

  getStats() {
    return {
      totalSpent: this.totalSpent,
      totalEarned: this.totalEarned,
      profit: this.totalEarned - this.totalSpent,
      apiCalls: this.apiCallLog.length,
      recentCalls: this.apiCallLog.slice(-10),
    };
  }

  async sendPayment(toAddress, amount, memo) {
    const result = await this.client.sendUSDC(toAddress, amount, memo);
    this.totalSpent += amount;
    console.log(`[WALLET] Sent $${amount} to ${toAddress}: ${memo}`);
    return result;
  }
}

module.exports = WalletManager;
