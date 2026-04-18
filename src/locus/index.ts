/**
 * Locus SDK — Unified exports for all Locus services
 */

export { LocusClient, getClient } from './client.js';
export type { LocusConfig, LocusResponse } from './client.js';

export { WalletService } from './wallet.js';
export type { WalletBalance, SendResult, Transaction } from './wallet.js';

export { WrappedApiService } from './wrapped.js';
export type { WrappedApiCall, WrappedApiResult } from './wrapped.js';

export { CheckoutService } from './checkout.js';
export type { CheckoutPreflight, CheckoutPayment } from './checkout.js';

export { TasksService } from './tasks.js';
export type { TaskRequest, Task } from './tasks.js';

export { X402Service } from './x402.js';

export { DeployService, getDeployService } from './deploy.js';
export type { BuildProject, BuildService, BuildDeployment, TrackedDeployment, DeployResult } from './deploy.js';

export { FiverrService } from './fiverr.js';
export type {
  FiverrCategory, FiverrOrder, FiverrOrderRequest, FiverrOrderStatus,
  FiverrOrderCreated, FiverrOrderPendingApproval,
  FiverrCreateOrderResponse, FiverrListOptions,
} from './fiverr.js';

// Usage:
// import { WalletService, DeployService, ... } from './locus/index.js';
// const wallet = new WalletService();   // auto-creates client from LOCUS_API_KEY env
// const deploy = new DeployService();
