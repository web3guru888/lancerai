/**
 * Locus BuildWithLocus — Deploy containerized services via the Locus Build API
 *
 * Uses the BuildWithLocus API (beta-api.buildwithlocus.com/v1) for deploying
 * containerized services. Supports:
 * - One-call deploy from GitHub repos (from-repo)
 * - Manual project → environment → service → deploy workflow
 * - Git push deployments (local code)
 * - Pre-built Docker image deployments
 * - Environment variables + addon provisioning (Postgres/Redis)
 *
 * Key requirements:
 * - All containers MUST listen on port 8080
 * - ARM64 (linux/arm64) required for pre-built images
 * - Each service costs $0.25/month from workspace credits
 * - New workspaces start with $1.00
 */

import { LocusClient, getClient } from './client.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface BuildProject {
  id: string;
  name: string;
  description?: string;
  region?: string;
  workspaceId?: string;
  createdAt?: string;
}

export interface BuildEnvironment {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production';
  projectId: string;
}

export interface BuildService {
  id: string;
  name: string;
  url?: string;
  projectId?: string;
  environmentId?: string;
  source?: { type: string; repo?: string; branch?: string; imageUri?: string; rootDir?: string };
  runtime?: { port: number; cpu: number; memory: number; minInstances: number; maxInstances: number };
  runtime_instances?: { runningCount: number; desiredCount: number; pendingCount: number; status?: string };
  [key: string]: any;
}

export interface BuildDeployment {
  id: string;
  serviceId: string;
  status: 'queued' | 'building' | 'deploying' | 'healthy' | 'failed' | 'cancelled' | 'rolled_back';
  version?: number;
  durationMs?: number;
  lastLogs?: string[];
  metadata?: { phaseTimestamps?: Record<string, string> };
  createdAt?: string;
}

export interface BuildAddon {
  id: string;
  name: string;
  type: 'postgres' | 'redis';
  status: 'provisioning' | 'available' | 'failed' | 'deleting';
  [key: string]: any;
}

export interface FromRepoResult {
  project: BuildProject;
  environment: BuildEnvironment;
  services: BuildService[];
  addons?: BuildAddon[];
  deployments: { serviceId: string; serviceName: string; deploymentId: string; status: string }[];
  locusbuild?: boolean;
}

export interface LocusBuildConfig {
  region?: string;
  services: Record<string, {
    path: string;
    port?: number;
    healthCheck?: string;
    startCommand?: string;
    runtime?: { cpu?: number; memory?: number };
    env?: Record<string, string>;
  }>;
  addons?: Record<string, { type: 'postgres' | 'redis' }>;
}

export interface TrackedDeployment {
  projectId: string;
  projectName: string;
  serviceId?: string;
  serviceName?: string;
  serviceUrl?: string;
  deploymentId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface DeployResult {
  success: boolean;
  projectId?: string;
  serviceId?: string;
  serviceUrl?: string;
  deploymentId?: string;
  error?: string;
  message?: string;
}

// ─── Build API Client ────────────────────────────────────────────────────────

const PREFIX = '[Build]';
const BUILD_API = process.env.BUILD_API_URL || 'https://beta-api.buildwithlocus.com/v1';

export class DeployService {
  private locusClient: LocusClient;
  private token: string | null = null;
  private workspaceId: string | null = null;
  private deployments: Map<string, TrackedDeployment> = new Map();

  constructor(client?: LocusClient) {
    this.locusClient = client || getClient();
  }

  // ─── Build API Request ─────────────────────────────────────────────────

  private async buildRequest<T = any>(method: string, path: string, body?: any): Promise<T> {
    if (!this.token) await this.authenticate();
    
    const url = `${BUILD_API}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);

    let response = await fetch(url, options);

    // Handle token expiry
    if (response.status === 401) {
      await this.authenticate();
      options.headers = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      };
      response = await fetch(url, options);
    }

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.error || data.message || `HTTP ${response.status}`);
      (err as any).status = response.status;
      (err as any).data = data;
      throw err;
    }

    console.log(`${PREFIX} ${method} ${path} → ${response.status}`);
    return data;
  }

  // ─── Authentication ────────────────────────────────────────────────────

  async authenticate(): Promise<void> {
    const apiKey = process.env.LOCUS_API_KEY;
    if (!apiKey) throw new Error('LOCUS_API_KEY required for Build API auth');

    const response = await fetch(`${BUILD_API}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const data = await response.json();
    if (!data.token) throw new Error(`Build API auth failed: ${data.error || 'no token'}`);
    
    this.token = data.token;

    // Get workspace ID
    const whoami = await this.buildRequest<{ userId: string; workspaceId: string }>('GET', '/auth/whoami');
    this.workspaceId = whoami.workspaceId;
    
    console.log(`${PREFIX} Authenticated. Workspace: ${this.workspaceId}`);
  }

  // ─── Billing ───────────────────────────────────────────────────────────

  async getBillingBalance(): Promise<any> {
    return this.buildRequest('GET', '/billing/balance');
  }

  // ─── One-Call Deploy (Recommended) ─────────────────────────────────────

  /**
   * Deploy from a GitHub repo in one API call.
   * Auto-detects .locusbuild if present in the repo.
   * Creates project + environment + services + triggers deployments.
   */
  async deployFromRepo(
    name: string,
    repo: string,
    branch: string = 'main',
    locusbuild?: LocusBuildConfig,
  ): Promise<FromRepoResult> {
    console.log(`${PREFIX} ═══════════════════════════════════════════════`);
    console.log(`${PREFIX} Deploying from GitHub repo: ${repo}@${branch}`);
    console.log(`${PREFIX} ═══════════════════════════════════════════════`);

    const body: any = { name, repo, branch };
    if (locusbuild) body.locusbuild = locusbuild;

    const result = await this.buildRequest<FromRepoResult>('POST', '/projects/from-repo', body);

    // Track the deployment
    this.deployments.set(result.project.id, {
      projectId: result.project.id,
      projectName: name,
      status: 'deploying',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`${PREFIX} ✓ Project: ${result.project.id} (${result.project.name})`);
    for (const svc of result.services) {
      console.log(`${PREFIX} ✓ Service: ${svc.name} → ${svc.url}`);
    }
    for (const dep of result.deployments) {
      console.log(`${PREFIX} ✓ Deployment: ${dep.serviceName} → ${dep.deploymentId} (${dep.status})`);
    }

    return result;
  }

  /**
   * Verify a .locusbuild configuration without creating any resources.
   */
  async verifyLocusbuild(locusbuild: LocusBuildConfig): Promise<{ valid: boolean; errors: string[]; plan: any }> {
    return this.buildRequest('POST', '/projects/verify-locusbuild', { locusbuild });
  }

  // ─── Manual Workflow ───────────────────────────────────────────────────

  async createProject(name: string, description?: string, region?: string): Promise<BuildProject> {
    const body: any = { name };
    if (description) body.description = description;
    if (region) body.region = region;
    const project = await this.buildRequest<BuildProject>('POST', '/projects', body);
    console.log(`${PREFIX} ✓ Project created: ${project.id} (${name})`);
    return project;
  }

  async listProjects(): Promise<{ projects: BuildProject[]; total: number }> {
    return this.buildRequest('GET', '/projects');
  }

  async getProject(projectId: string): Promise<BuildProject> {
    return this.buildRequest('GET', `/projects/${projectId}`);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.buildRequest('DELETE', `/projects/${projectId}`);
    console.log(`${PREFIX} ✓ Project deleted: ${projectId}`);
  }

  async createEnvironment(projectId: string, name: string = 'production', type: string = 'production'): Promise<BuildEnvironment> {
    const env = await this.buildRequest<BuildEnvironment>('POST', `/projects/${projectId}/environments`, { name, type });
    console.log(`${PREFIX} ✓ Environment created: ${env.id} (${name})`);
    return env;
  }

  async createService(
    projectId: string,
    environmentId: string,
    name: string,
    source: { type: string; repo?: string; branch?: string; imageUri?: string; rootDir?: string },
    runtime?: { cpu?: number; memory?: number; minInstances?: number; maxInstances?: number },
    options?: { healthCheckPath?: string; startCommand?: string; autoDeploy?: boolean; buildConfig?: any },
  ): Promise<BuildService> {
    const body: any = {
      projectId,
      environmentId,
      name,
      source,
      runtime: {
        port: 8080,
        cpu: runtime?.cpu || 256,
        memory: runtime?.memory || 512,
        minInstances: runtime?.minInstances || 1,
        maxInstances: runtime?.maxInstances || 3,
      },
    };
    if (options?.healthCheckPath) body.healthCheckPath = options.healthCheckPath;
    if (options?.startCommand) body.startCommand = options.startCommand;
    if (options?.autoDeploy !== undefined) body.autoDeploy = options.autoDeploy;
    if (options?.buildConfig) body.buildConfig = options.buildConfig;

    const service = await this.buildRequest<BuildService>('POST', '/services', body);
    console.log(`${PREFIX} ✓ Service created: ${service.id} (${name})`);
    console.log(`${PREFIX}   URL: ${service.url}`);
    return service;
  }

  async getService(serviceId: string, includeRuntime: boolean = false): Promise<BuildService> {
    const query = includeRuntime ? '?include=runtime' : '';
    return this.buildRequest('GET', `/services/${serviceId}${query}`);
  }

  // ─── Deployments ───────────────────────────────────────────────────────

  async triggerDeployment(serviceId: string): Promise<BuildDeployment> {
    const deploy = await this.buildRequest<BuildDeployment>('POST', '/deployments', { serviceId });
    console.log(`${PREFIX} ✓ Deployment triggered: ${deploy.id} (${deploy.status})`);
    return deploy;
  }

  async getDeployment(deploymentId: string): Promise<BuildDeployment> {
    return this.buildRequest('GET', `/deployments/${deploymentId}`);
  }

  /**
   * Poll a deployment until it reaches a terminal status.
   * Returns the final deployment object.
   */
  async waitForDeployment(
    deploymentId: string,
    timeoutMs: number = 600_000,
    pollIntervalMs: number = 30_000,
  ): Promise<BuildDeployment> {
    const start = Date.now();
    const terminalStatuses = ['healthy', 'failed', 'cancelled', 'rolled_back'];

    console.log(`${PREFIX} Monitoring deployment ${deploymentId}...`);

    while (Date.now() - start < timeoutMs) {
      const deploy = await this.getDeployment(deploymentId);
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`${PREFIX} [${elapsed}s] ${deploymentId}: ${deploy.status}`);

      if (terminalStatuses.includes(deploy.status)) {
        if (deploy.status === 'healthy') {
          console.log(`${PREFIX} ✅ Deployment healthy! (${elapsed}s)`);
        } else {
          console.error(`${PREFIX} ❌ Deployment ${deploy.status}`);
          if (deploy.lastLogs?.length) {
            console.error(`${PREFIX} Last logs:`);
            deploy.lastLogs.forEach(l => console.error(`  ${l}`));
          }
        }
        return deploy;
      }

      await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Deployment ${deploymentId} timed out after ${timeoutMs / 1000}s`);
  }

  // ─── Environment Variables ─────────────────────────────────────────────

  async setVariables(serviceId: string, variables: Record<string, string>): Promise<void> {
    await this.buildRequest('PUT', `/variables/service/${serviceId}`, { variables });
    console.log(`${PREFIX} ✓ Variables set on service ${serviceId}: ${Object.keys(variables).join(', ')}`);
  }

  async mergeVariables(serviceId: string, variables: Record<string, string>): Promise<void> {
    await this.buildRequest('PATCH', `/variables/service/${serviceId}`, { variables });
    console.log(`${PREFIX} ✓ Variables merged on service ${serviceId}: ${Object.keys(variables).join(', ')}`);
  }

  async getResolvedVariables(serviceId: string): Promise<{ variables: Record<string, string> }> {
    return this.buildRequest('GET', `/variables/service/${serviceId}/resolved`);
  }

  // ─── Addons ────────────────────────────────────────────────────────────

  async provisionAddon(
    projectId: string,
    environmentId: string,
    type: 'postgres' | 'redis',
    name: string,
  ): Promise<BuildAddon> {
    const addon = await this.buildRequest<BuildAddon>('POST', '/addons', {
      projectId, environmentId, type, name,
    });
    console.log(`${PREFIX} ✓ Addon provisioned: ${addon.id} (${type}: ${name})`);
    return addon;
  }

  async getAddon(addonId: string): Promise<BuildAddon> {
    return this.buildRequest('GET', `/addons/${addonId}`);
  }

  async waitForAddon(addonId: string, timeoutMs: number = 120_000): Promise<BuildAddon> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const addon = await this.getAddon(addonId);
      if (addon.status === 'available') return addon;
      if (addon.status === 'failed') throw new Error(`Addon ${addonId} failed`);
      await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`Addon ${addonId} timed out`);
  }

  // ─── Git Push Deploy ───────────────────────────────────────────────────

  getGitRemoteUrl(projectId: string): string {
    const apiKey = process.env.LOCUS_API_KEY;
    return `https://x:${apiKey}@git.buildwithlocus.com/${this.workspaceId}/${projectId}.git`;
  }

  // ─── High-Level Deploy Flows ───────────────────────────────────────────

  /**
   * Full deployment flow for a GitHub repo.
   * Uses from-repo for one-call setup + monitors until healthy.
   */
  async deployGithubRepo(
    projectName: string,
    repo: string,
    branch: string = 'main',
    envVars?: Record<string, string>,
    locusbuild?: LocusBuildConfig,
  ): Promise<DeployResult> {
    try {
      // One-call deploy
      const result = await this.deployFromRepo(projectName, repo, branch, locusbuild);

      // Set additional env vars if needed
      if (envVars && result.services.length > 0) {
        for (const svc of result.services) {
          await this.mergeVariables(svc.id, envVars);
        }
      }

      // Monitor first deployment
      if (result.deployments.length > 0) {
        const firstDep = result.deployments[0];
        const finalDep = await this.waitForDeployment(firstDep.deploymentId);

        return {
          success: finalDep.status === 'healthy',
          projectId: result.project.id,
          serviceId: result.services[0]?.id,
          serviceUrl: result.services[0]?.url,
          deploymentId: firstDep.deploymentId,
          message: finalDep.status === 'healthy'
            ? `Deployed at ${result.services[0]?.url}`
            : `Deployment ${finalDep.status}`,
        };
      }

      return {
        success: true,
        projectId: result.project.id,
        message: 'Project created, no deployments triggered',
      };
    } catch (err: any) {
      console.error(`${PREFIX} Deploy failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        message: `Deployment failed: ${err.message}`,
      };
    }
  }

  /**
   * Deploy local code via git push.
   * Sets up project, environment, service, then returns git remote URL for pushing.
   */
  async setupForGitPush(
    projectName: string,
    serviceName: string = 'web',
    rootDir: string = '.',
    healthCheckPath?: string,
  ): Promise<{ projectId: string; serviceId: string; gitRemoteUrl: string }> {
    const project = await this.createProject(projectName);
    const env = await this.createEnvironment(project.id);
    const service = await this.createService(
      project.id,
      env.id,
      serviceName,
      { type: 's3', rootDir },
      undefined,
      { healthCheckPath },
    );

    const gitRemoteUrl = this.getGitRemoteUrl(project.id);
    console.log(`${PREFIX} Ready for git push!`);
    console.log(`${PREFIX} Run: git remote add locus ${gitRemoteUrl}`);
    console.log(`${PREFIX} Then: git push locus main`);

    return {
      projectId: project.id,
      serviceId: service.id,
      gitRemoteUrl,
    };
  }

  // ─── Docs ──────────────────────────────────────────────────────────────

  /**
   * Fetch BuildWithLocus / APPS.md documentation from the Locus API.
   */
  async fetchDocs(): Promise<string> {
    console.log(`${PREFIX} Fetching BuildWithLocus documentation...`);
    try {
      const apiBase = process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api';
      return await this.locusClient.fetchText(`${apiBase}/apps/md`);
    } catch (err: any) {
      console.error(`${PREFIX} Could not fetch docs: ${err.message}`);
      return `# BuildWithLocus\n\nDocumentation unavailable. Build with Locus may not be enabled yet.\n\nError: ${err.message}`;
    }
  }

  // ─── Deployment Tracking ───────────────────────────────────────────────

  getTrackedDeployments(): Map<string, TrackedDeployment> {
    return new Map(this.deployments);
  }

  /**
   * Get deployment history as an array (for API responses).
   */
  getDeploymentHistory(): TrackedDeployment[] {
    return [...this.deployments.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  getDeploymentSummary(): string {
    if (this.deployments.size === 0) return `${PREFIX} No deployments tracked.`;
    const lines = [`${PREFIX} Deployment Summary (${this.deployments.size} tracked):`];
    for (const [, dep] of this.deployments) {
      lines.push(
        `  ${dep.projectName} [${dep.status}]` +
        (dep.serviceUrl ? ` → ${dep.serviceUrl}` : '') +
        (dep.error ? ` ⚠ ${dep.error}` : '')
      );
    }
    return lines.join('\n');
  }

  // ─── Aliases for API compat ────────────────────────────────────────────

  /** Alias for deployGithubRepo — matches the generic interface name */
  async deployFromGithub(
    projectName: string,
    repo: string,
    branch: string = 'main',
    envVars?: Record<string, string>,
  ): Promise<DeployResult> {
    return this.deployGithubRepo(projectName, repo, branch, envVars);
  }

  /** Deploy from a pre-built Docker image */
  async deployFromDocker(
    projectName: string,
    imageUri: string,
    envVars?: Record<string, string>,
  ): Promise<DeployResult> {
    try {
      const project = await this.createProject(projectName);
      const env = await this.createEnvironment(project.id);
      const service = await this.createService(
        project.id, env.id, projectName,
        { type: 'image', imageUri },
      );

      if (envVars) {
        await this.mergeVariables(service.id, envVars);
      }

      const deploy = await this.triggerDeployment(service.id);
      const finalDep = await this.waitForDeployment(deploy.id);

      this.deployments.set(project.id, {
        projectId: project.id,
        projectName,
        serviceId: service.id,
        serviceName: projectName,
        serviceUrl: service.url,
        deploymentId: deploy.id,
        status: finalDep.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: finalDep.status === 'healthy',
        projectId: project.id,
        serviceId: service.id,
        serviceUrl: service.url,
        deploymentId: deploy.id,
        message: finalDep.status === 'healthy'
          ? `Deployed at ${service.url}`
          : `Deployment ${finalDep.status}`,
      };
    } catch (err: any) {
      console.error(`${PREFIX} Docker deploy failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        message: `Docker deployment failed: ${err.message}`,
      };
    }
  }
}

// ─── Convenience singleton ───────────────────────────────────────────────────

let _deployService: DeployService | null = null;

export function getDeployService(client?: LocusClient): DeployService {
  if (!_deployService || client) {
    _deployService = new DeployService(client);
  }
  return _deployService;
}
