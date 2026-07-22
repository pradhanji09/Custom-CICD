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
  { repoName, commitHash, branch },
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
    const strategyFactory = deploymentStrategyFactory(
      branchEnvironment.deployment_type,
    );

    const strategy = strategyFactory({
      deployPath: branchEnvironment.deploy_path,
      ssh: branchEnvironment.ssh,
      project: repoName,
      environment: branchEnvironment.environment_name,
      port: branchEnvironment.port,
    });

    try {
      await strategy.build(branchEnvironment.steps);
      await strategy.startProcess();

      // 6. Health check (optional — only if configured)
      const healthCheckConfig = branchEnvironment.health_check;

      if (healthCheckConfig) {
        const { healthy } = await runHealthChecker({
          config: healthCheckConfig,
          port: strategy.getPort(),
          host: strategy.getHost(),
        });

        if (!healthy) {
          await strategy.switchSymlink(false);
          const err = new Error("Health check failed");
          err.step = DEPLOYMENT_STEP.HEALTH_CHECK;
          throw err;
        }
      }

      await strategy.switchSymlink(true);

      try {
        await strategy.stopProcess();
      } catch (cleanupError) {
        console.error(
          `[DEPLOYMENT] failed to stop old process:`,
          cleanupError.message,
        );
      }

      // 7. All good
      return await updateDeployment({
        filter: { deployment_id },
        input: {
          status: DEPLOYMENT_STATUS.SUCCESS,
          completed_at: new Date().toISOString(),
        },
      });
    } finally {
      strategy.close();
    }
  } catch (error) {
    const failedStep = error.step || DEPLOYMENT_STEP.DEPLOY_STEP;

    console.error(
      `[DEPLOYMENT] failed at step "${failedStep}":`,
      error.message,
    );

    return await updateDeployment({
      filter: { deployment_id },
      input: {
        status: DEPLOYMENT_STATUS.FAILED,
        completed_at: new Date().toISOString(),
        failed_step: failedStep,
      },
    });
  } finally {
    lockManager.releaseLock(`${repoName}:${branch}`);
  }
}

module.exports = deploymentWebhookService;
