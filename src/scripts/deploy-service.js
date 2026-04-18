#!/usr/bin/env node
/**
 * Deploy a service via BuildWithLocus
 * Usage: node deploy-service.js <github-repo> [name] [branch]
 */

const LocusDeployer = require('../core/deployer');

async function main() {
  const repo = process.argv[2];
  const name = process.argv[3] || repo?.split('/').pop() || 'my-app';
  const branch = process.argv[4] || 'main';

  if (!repo) {
    console.log('Usage: node deploy-service.js <github-repo> [name] [branch]');
    console.log('Example: node deploy-service.js myorg/myapp my-app main');
    process.exit(1);
  }

  const deployer = new LocusDeployer(process.env.LOCUS_API_KEY);

  console.log(`\n=== Deploying ${repo} via BuildWithLocus ===\n`);

  try {
    // Authenticate
    console.log('Authenticating with Locus Build...');
    await deployer.authenticate();
    console.log(`Workspace: ${deployer.workspaceId}\n`);

    // Deploy from repo (one-call)
    console.log(`Deploying ${repo} (branch: ${branch})...`);
    const result = await deployer.deployFromRepo(name, repo, branch);

    console.log('\n=== Deployment Summary ===');
    console.log(`Project: ${result.project?.name} (${result.project?.id})`);
    console.log(`Environment: ${result.environment?.name} (${result.environment?.id})`);
    
    if (result.services) {
      console.log('\nServices:');
      for (const svc of result.services) {
        console.log(`  ${svc.name}: ${svc.url}`);
      }
    }

    if (result.deployments) {
      console.log('\nDeployments:');
      for (const dep of result.deployments) {
        console.log(`  ${dep.serviceName}: ${dep.deploymentId} (${dep.status})`);
      }
    }

    // Monitor deployments
    if (result.deployments?.length > 0) {
      console.log('\nMonitoring deployments (Ctrl+C to stop)...\n');
      for (const dep of result.deployments) {
        try {
          const final = await deployer.waitForDeployment(dep.deploymentId, 600000, 30000);
          console.log(`\n✅ ${dep.serviceName}: ${final.status}`);
        } catch (err) {
          console.error(`\n❌ ${dep.serviceName}: ${err.message}`);
        }
      }
    }

  } catch (err) {
    console.error(`\nError: ${err.message}`);
    if (err.data) console.error('Details:', JSON.stringify(err.data, null, 2));
    process.exit(1);
  }
}

main();
