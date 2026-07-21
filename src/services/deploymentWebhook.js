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
  triggerType = TRIGGER_TYPE.WEBHOOK,
  environment,
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

  let environmentConfig;
  if (branch) {
    environmentConfig = repoConfig.environments.find(
      (env) => env.branch === branch,
    );
  }

  if (environment) {
    environmentConfig = repoConfig.environments.find(
      (env) => env.environment_name === environment,
    );
  }

  if (!environmentConfig) {
    return {
      status: DEPLOYMENT_STATUS.SKIPPED,
      message: `Failed to deploy as environment is not deployable`,
    };
  }

  // 2. Lock guard (prevent concurrent deploys of same repo:branch)
  const isLockAcquired = lockManager.acquireLock(
    `${repoName}:${environmentConfig.branch}`,
  );
  if (!isLockAcquired) {
    return {
      status: DEPLOYMENT_STATUS.IN_PROGRESS,
      message: `Deployment already in progress for ${repoName}:${environmentConfig.branch}`,
    };
  }

  // 3. Create deployment record
  const { deployment_id } = await createDeployment({
    input: {
      project: repoName,
      environment: environmentConfig.environment_name,
      branch,
      commit_hash: commitHash,
      deployment_type: environmentConfig.deployment_type,
      trigger_type: triggerType,
      status: DEPLOYMENT_STATUS.IN_PROGRESS,
    },
  });

  try {
    // 4. Run deployment strategy
    const strategy = deploymentStrategyFactory(
      environmentConfig.deployment_type,
    );

    const { success, port, host, symlinkSwitcher } = await strategy({
      steps: environmentConfig.steps,
      context: {
        deployPath: environmentConfig.deploy_path,
        ssh: environmentConfig.ssh,
        project: repoName,
        environment: environmentConfig.environment_name,
        port: environmentConfig.port,
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
    const healthCheckConfig = environmentConfig.health_check;

    if (healthCheckConfig) {
      // Port and host come from the strategy result, which resolves the blue/green slot.
      const { healthy } = await runHealthChecker({
        config: healthCheckConfig,
        port,
        host,
      });

      if (!healthy) {
        await symlinkSwitcher(false);
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

    await symlinkSwitcher(true);

    // 7. All good
    return await updateDeployment({
      filter: { deployment_id },
      input: {
        status: DEPLOYMENT_STATUS.SUCCESS,
        completed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    // switchToSlot errors are tagged with step = "RELEASE"; everything else is a DEPLOY_STEP failure
    const failedStep =
      error.step === DEPLOYMENT_STEP.RELEASE
        ? DEPLOYMENT_STEP.RELEASE
        : DEPLOYMENT_STEP.DEPLOY_STEP;

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
    lockManager.releaseLock(
      `${repoName}:${environmentConfig.environment_name}`,
    );
  }
}

module.exports = deploymentWebhookService;
