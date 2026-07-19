const {
  DEPLOYMENT_STATUS,
  TRIGGER_TYPE,
  DEPLOYMENT_STEP,
} = require("../commons/constants/constants");
const configRegistry = require("../config/configRegistry");
const deploymentStrategyFactory = require("../engine/deploymentStrategyFactory");
const lockManager = require("../engine/lockmanager");
const deploymentRepo = require("../repositories/deployment");
const { runHealthChecker } = require("../engine/healthChecker");

async function deploymentWebhookService(
  knex,
  { repoName, commitHash, branch, pusherEmail, message },
) {
  const { createDeployment, updateDeployment } = deploymentRepo(knex);

  // 1. Config resolution
  const repoConfig = configRegistry.getProjectConfig(repoName);
  if (!repoConfig) {
    return {
      status: DEPLOYMENT_STATUS.SKIPPED,
      message: `No config found for repo ${repoName}`,
    };
  }

  const branchEnvironment = repoConfig.environments.find(
    (env) => env.branch === branch,
  );

  if (!branchEnvironment) {
    return {
      status: DEPLOYMENT_STATUS.SKIPPED,
      message: `Branch ${branch} is not deployable`,
    };
  }

  // 2. Lock guard (prevent concurrent deploys of same repo:branch)
  const isLockAcquired = lockManager.acquireLock(`${repoName}:${branch}`);
  if (!isLockAcquired) {
    return {
      status: DEPLOYMENT_STATUS.IN_PROGRESS,
      message: `Deployment already in progress for ${repoName}:${branch}`,
    };
  }

  // 3. Create deployment record
  const { deployment_id } = await createDeployment({
    input: {
      project: repoName,
      environment: branchEnvironment.environment_name,
      branch,
      commit_hash: commitHash,
      deployment_type: branchEnvironment.deployment_type,
      trigger_type: TRIGGER_TYPE.WEBHOOK,
      status: DEPLOYMENT_STATUS.IN_PROGRESS,
    },
  });

  try {
    // 4. Run deployment strategy
    const strategy = deploymentStrategyFactory(
      branchEnvironment.deployment_type,
    );

    const { success, port, host } = await strategy({
      steps: branchEnvironment.steps,
      context: {
        deployPath: branchEnvironment.deploy_path,
        ssh: branchEnvironment.ssh,
        project: repoName,
        environment: branchEnvironment.environment_name,
        port: branchEnvironment.port,
      },
    });

    // 5. Guard: strategy itself reported failure (non-zero exit code etc.)
    if (!success) {
      return await updateDeployment({
        filter: { deployment_id },
        input: {
          status: DEPLOYMENT_STATUS.FAILED,
          completed_at: new Date().toISOString(),
          failed_step: DEPLOYMENT_STEP.DEPLOY_STEP,
        },
      });
    }

    // 6. Health check (optional — only if configured
    const healthCheckConfig = branchEnvironment.health_check;

    if (healthCheckConfig) {
      // Port and host come from the strategy result, which resolves the blue/green slot.
      const { healthy } = await runHealthChecker({
        config: healthCheckConfig,
        port,
        host,
      });

      if (!healthy) {
        return await updateDeployment({
          filter: { deployment_id },
          input: {
            status: DEPLOYMENT_STATUS.FAILED,
            completed_at: new Date().toISOString(),
            failed_step: DEPLOYMENT_STEP.HEALTH_CHECK,
          },
        });
      }
    }

    // 7. All good
    return await updateDeployment({
      filter: { deployment_id },
      input: {
        status: DEPLOYMENT_STATUS.SUCCESS,
        completed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Unexpected / uncaught errors (e.g. DB down, SSH connect throw, etc.)
    return await updateDeployment({
      filter: { deployment_id },
      input: {
        status: DEPLOYMENT_STATUS.FAILED,
        completed_at: new Date().toISOString(),
        failed_step: DEPLOYMENT_STEP.DEPLOY_STEP,
      },
    });
  } finally {
    lockManager.releaseLock(`${repoName}:${branch}`);
  }
}

module.exports = deploymentWebhookService;
