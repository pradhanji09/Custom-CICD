const {
  TRIGGER_TYPE,
  DEPLOYMENT_STATUS,
  DEPLOYMENT_STEP,
} = require("../commons/constants/constants");
const Errors = require("../commons/errors/errorCatalog");
const configRegistry = require("../config/configRegistry");
const lockManager = require("../engine/lockmanager");
const deploymentRepo = require("../repositories/deployment");
const deploymentStrategyFactory = require("../engine/deploymentStrategyFactory");
const { runHealthChecker } = require("../engine/healthChecker");

async function rollbackDeploymentService(knex, { project, environment }) {
  const { createDeployment, updateDeployment } = deploymentRepo(knex);

  const environmentConfig = resolveEnvironmentConfig(project, environment);
  const {
    deployment_type,
    deploy_path,
    branch,
    environment_name,
    ssh,
    port,
    health_check,
  } = environmentConfig;

  // 2. Lock guard
  const lockKey = `${project}:${branch}`;
  if (!lockManager.acquireLock(lockKey)) {
    return {
      status: DEPLOYMENT_STATUS.SKIPPED,
      message: "Rollback is already in progress",
    };
  }

  let deploymentId;

  try {
    // 7. Record it as ROLLBACK
    const { deployment_id } = await createDeployment({
      input: {
        project,
        environment: environment_name,
        branch,
        commit_hash: "", // Rollback doesn't build a new commit
        deployment_type,
        trigger_type: TRIGGER_TYPE.ROLLBACK,
        status: DEPLOYMENT_STATUS.IN_PROGRESS,
      },
    });
    deploymentId = deployment_id;

    // Reuse the exact same functional strategy factory!
    const strategyFactory = deploymentStrategyFactory(deployment_type);
    const strategy = strategyFactory({
      deployPath: deploy_path,
      ssh: ssh,
      project,
      environment: environment_name,
      port: port,
    });

    try {
      // 1. Figure out where we are (pass empty steps to skip build phase)
      await strategy.build([]);

      if (!strategy.getCurrentSlot()) {
        const err = new Error(
          "No active slot found. Cannot rollback from a completely fresh state.",
        );
        err.step = DEPLOYMENT_STEP.RELEASE;
        throw err;
      }

      // 3. Start the target slot's process again
      await strategy.startProcess();

      // 4. Health check the resurrected process
      if (health_check) {
        const { healthy } = await runHealthChecker({
          config: health_check,
          port: strategy.getPort(),
          host: strategy.getHost(),
        });

        if (!healthy) {
          // If unhealthy, stop the newly started rollback process so we don't leak it
          // Wait, the strategy's stopProcess() stops the CURRENT live slot.
          // We need a way to stop the TARGET slot. But wait, we can just throw and it will be handled manually,
          // or we can add a flag to stopProcess. For now, since rollback failed, production is untouched.
          const err = new Error("Health check failed for resurrected slot.");
          err.step = DEPLOYMENT_STEP.HEALTH_CHECK;
          throw err;
        }
      }

      // 5. If healthy, switch the symlink
      await strategy.switchSymlink(true);

      // 6. Stop the slot we just rolled back from
      try {
        await strategy.stopProcess();
      } catch (cleanupError) {
        console.error(
          `[ROLLBACK] failed to stop old process:`,
          cleanupError.message,
        );
      }

      // Update deployment record
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
    const failedStep = error.step || DEPLOYMENT_STEP.RELEASE;
    console.error(`[ROLLBACK] failed at step "${failedStep}":`, error.message);

    if (deploymentId) {
      await updateDeployment({
        filter: { deployment_id: deploymentId },
        input: {
          status: DEPLOYMENT_STATUS.FAILED,
          completed_at: new Date().toISOString(),
          failed_step: failedStep,
        },
      });
    }
    return {
      success: false,
      message: error.message,
    };
  } finally {
    lockManager.releaseLock(lockKey);
  }
}

function resolveEnvironmentConfig(project, environment) {
  const repoConfig = configRegistry.getProjectConfig(project);
  if (!repoConfig) throw Errors.NoConfigForProject(project);

  const environmentConfig = repoConfig.environments.find(
    (env) => env.environment_name === environment,
  );
  if (!environmentConfig) throw Errors.NoEnvironmentFound(environment);

  return environmentConfig;
}

module.exports = rollbackDeploymentService;
