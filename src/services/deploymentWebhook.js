const {
  DEPLOYMENT_STATUS,
  TRIGGER_TYPE,
} = require("../commons/constants/constants");
const configRegistry = require("../config/configRegistry");
const deploymentStrategyFactory = require("../engine/deploymentStrategyFactory");
const lockManager = require("../engine/lockmanager");
const deploymentRepo = require("../repositories/deployment");

async function deploymentWebhookService(
  knex,
  { repoName, commitHash, branch, pusherEmail, message },
) {
  const { createDeployment, updateDeployment } = deploymentRepo(knex);

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

  const isLockAcquired = lockManager.acquireLock(`${repoName}:${branch}`);
  if (!isLockAcquired) {
    return {
      status: DEPLOYMENT_STATUS.IN_PROGRESS,
      message: `Deployment already in progress for ${repoName}:${branch}`,
    };
  }

  const { deployment_id } = await createDeployment({
    input: {
      project: repoName,
      environment: branchEnvironment.environment_name,
      port: branchEnvironment.port,
      branch,
      commit_hash: commitHash,
      deployment_type: branchEnvironment.deployment_type,
      trigger_type: TRIGGER_TYPE.WEBHOOK,
      status: DEPLOYMENT_STATUS.IN_PROGRESS,
    },
  });

  try {
    const strategy = deploymentStrategyFactory(
      branchEnvironment.deployment_type,
    );

    const result = await strategy({
      steps: branchEnvironment.steps,
      context: {
        deployPath: branchEnvironment.deploy_path,
        ssh: branchEnvironment.ssh,
        healthCheck: branchEnvironment.health_check,
        project: repoName,
        environment: branchEnvironment.environment_name,
        port: branchEnvironment.port,
      },
      // metadata: {
      //   commitHash,
      //   pusherEmail,
      //   message,
      //   deploymentId: deployment_id,
      // },
    });

    return await updateDeployment({
      filter: { deployment_id },
      input: {
        status: DEPLOYMENT_STATUS.SUCCESS,
        completed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return await updateDeployment({
      filter: { deployment_id },
      input: {
        status: DEPLOYMENT_STATUS.FAILED,
        completed_at: new Date().toISOString(),
      },
    });
  } finally {
    lockManager.releaseLock(`${repoName}:${branch}`);
  }
}

module.exports = deploymentWebhookService;
