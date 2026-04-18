/**
 * BuildWithLocus Deployer — Deploy services via Locus Build API
 * Core module for the LancerAI agent's deployment capabilities
 */

const BUILD_API = process.env.BUILD_API_URL || 'https://beta-api.buildwithlocus.com/v1';

class LocusDeployer {
  constructor(locusApiKey) {
    this.locusApiKey = locusApiKey;
    this.token = null;
    this.workspaceId = null;
  }

  async _buildRequest(method, path, body = null) {
    if (!this.token) await this.authenticate();
    const url = `${BUILD_API}${path}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();

    if (response.status === 401) {
      // Token expired, refresh and retry
      await this.authenticate();
      options.headers['Authorization'] = `Bearer ${this.token}`;
      const retry = await fetch(url, options);
      return retry.json();
    }

    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  // ── Authentication ──

  async authenticate() {
    const response = await fetch(`${BUILD_API}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: this.locusApiKey }),
    });
    const data = await response.json();
    if (!data.token) throw new Error('Failed to authenticate with Build API');
    this.token = data.token;
    
    // Get workspace ID
    const whoami = await this._buildRequest('GET', '/auth/whoami');
    this.workspaceId = whoami.workspaceId;
    
    console.log(`[DEPLOYER] Authenticated. Workspace: ${this.workspaceId}`);
    return data;
  }

  // ── Billing ──

  async getBalance() {
    return this._buildRequest('GET', '/billing/balance');
  }

  // ── Projects ──

  async listProjects() {
    return this._buildRequest('GET', '/projects');
  }

  async createProject(name, description = '', region = 'us-east-1') {
    const project = await this._buildRequest('POST', '/projects', {
      name,
      description,
      region,
    });
    console.log(`[DEPLOYER] Project created: ${project.id} (${name})`);
    return project;
  }

  async getProject(projectId) {
    return this._buildRequest('GET', `/projects/${projectId}`);
  }

  async deleteProject(projectId) {
    return this._buildRequest('DELETE', `/projects/${projectId}`);
  }

  // ── One-Call Deploy ──

  async deployFromRepo(name, repo, branch = 'main', locusbuild = null) {
    const body = { name, repo, branch };
    if (locusbuild) body.locusbuild = locusbuild;
    const result = await this._buildRequest('POST', '/projects/from-repo', body);
    console.log(`[DEPLOYER] Deployed from repo: ${repo}`);
    console.log(`[DEPLOYER] Project: ${result.project?.id}`);
    console.log(`[DEPLOYER] Services: ${result.services?.map(s => `${s.name}: ${s.url}`).join(', ')}`);
    return result;
  }

  async deployFromLocusbuild(name, repo, branch, locusbuild) {
    const result = await this._buildRequest('POST', '/projects/from-locusbuild', {
      name, repo, branch, locusbuild,
    });
    console.log(`[DEPLOYER] Deployed from locusbuild: ${name}`);
    return result;
  }

  async verifyLocusbuild(locusbuild) {
    return this._buildRequest('POST', '/projects/verify-locusbuild', { locusbuild });
  }

  // ── Environments ──

  async createEnvironment(projectId, name = 'production', type = 'production') {
    const env = await this._buildRequest('POST', `/projects/${projectId}/environments`, {
      name, type,
    });
    console.log(`[DEPLOYER] Environment created: ${env.id} (${name})`);
    return env;
  }

  // ── Services ──

  async createService(projectId, environmentId, name, source, runtime = {}, options = {}) {
    const body = {
      projectId,
      environmentId,
      name,
      source,
      runtime: {
        port: 8080,
        cpu: runtime.cpu || 256,
        memory: runtime.memory || 512,
        minInstances: runtime.minInstances || 1,
        maxInstances: runtime.maxInstances || 3,
        ...runtime,
      },
      ...options,
    };
    const service = await this._buildRequest('POST', '/services', body);
    console.log(`[DEPLOYER] Service created: ${service.id} (${name})`);
    console.log(`[DEPLOYER] URL: ${service.url}`);
    return service;
  }

  async getService(serviceId, includeRuntime = false) {
    const query = includeRuntime ? '?include=runtime' : '';
    return this._buildRequest('GET', `/services/${serviceId}${query}`);
  }

  async listServices(projectId) {
    return this._buildRequest('GET', `/projects/${projectId}/services`);
  }

  // ── Deployments ──

  async triggerDeployment(serviceId) {
    const deploy = await this._buildRequest('POST', '/deployments', { serviceId });
    console.log(`[DEPLOYER] Deployment triggered: ${deploy.id} (status: ${deploy.status})`);
    return deploy;
  }

  async getDeployment(deploymentId) {
    return this._buildRequest('GET', `/deployments/${deploymentId}`);
  }

  async waitForDeployment(deploymentId, maxWaitMs = 600000, pollIntervalMs = 15000) {
    const start = Date.now();
    const terminalStatuses = ['healthy', 'failed', 'cancelled', 'rolled_back'];
    
    while (Date.now() - start < maxWaitMs) {
      const deploy = await this.getDeployment(deploymentId);
      console.log(`[DEPLOYER] Deployment ${deploymentId}: ${deploy.status}`);
      
      if (terminalStatuses.includes(deploy.status)) {
        return deploy;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(`Deployment ${deploymentId} timed out after ${maxWaitMs}ms`);
  }

  // ── Environment Variables ──

  async setVariables(serviceId, variables) {
    return this._buildRequest('PUT', `/variables/service/${serviceId}`, { variables });
  }

  async mergeVariables(serviceId, variables) {
    return this._buildRequest('PATCH', `/variables/service/${serviceId}`, { variables });
  }

  async getResolvedVariables(serviceId) {
    return this._buildRequest('GET', `/variables/service/${serviceId}/resolved`);
  }

  // ── Addons ──

  async provisionAddon(projectId, environmentId, type, name) {
    const addon = await this._buildRequest('POST', '/addons', {
      projectId, environmentId, type, name,
    });
    console.log(`[DEPLOYER] Addon provisioned: ${addon.id} (${type}: ${name})`);
    return addon;
  }

  async getAddon(addonId) {
    return this._buildRequest('GET', `/addons/${addonId}`);
  }

  async waitForAddon(addonId, maxWaitMs = 120000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const addon = await this.getAddon(addonId);
      if (addon.status === 'available') return addon;
      if (addon.status === 'failed') throw new Error(`Addon ${addonId} failed`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error(`Addon ${addonId} timed out`);
  }

  // ── Git Push Deploy ──

  getGitRemoteUrl(projectId) {
    return `https://x:${this.locusApiKey}@git.buildwithlocus.com/${this.workspaceId}/${projectId}.git`;
  }

  // ── Logs ──

  async getDeploymentLogs(deploymentId) {
    return this._buildRequest('GET', `/deployments/${deploymentId}/logs`);
  }

  async getServiceLogs(serviceId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.since) params.set('since', options.since);
    const query = params.toString() ? `?${params}` : '';
    return this._buildRequest('GET', `/services/${serviceId}/logs${query}`);
  }
}

module.exports = LocusDeployer;
