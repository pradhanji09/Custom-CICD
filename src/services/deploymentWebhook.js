const configRegistry = require("../config/configRegistry");
const deploymentStrategyFactory = require("../engine/deploymentStrategyFactory");
const lockManager = require("../engine/lockmanager");

async function deploymentWebhookService({
  repoName,
  commitHash,
  branch,
  pusherEmail,
  message,
}) {
  const repoConfig = configRegistry.getProjectConfig(repoName);
  if (!repoConfig)
    return {
      status: "skipped",
      message: `No config found for repo ${repoName}`,
    };

  const branchEnviroment = repoConfig.environments.find(
    (env) => env.branch === branch,
  );

  if (!branchEnviroment)
    return {
      status: "skipped",
      message: `This barnch ${branch} is not deployable`,
    };

  const isLockAcquired = lockManager.acquireLock(`${repoName}:${branch}`);
  if (!isLockAcquired) {
    return {
      status: "skipped",
      message: `deployment is already in progress for ${repoName}:${branch}`,
    };
  }

  try {
    const strategy = deploymentStrategyFactory(
      branchEnviroment.deployment_type,
    );

    const result = await strategy({
      steps: branchEnviroment.steps,
      context: {
        deployPath: branchEnviroment.deploy_path,
        ssh: branchEnviroment.ssh,
        healthCheck: branchEnviroment.health_check,
      },
      metadata: { commitHash, pusherEmail, message },
    });

    return { status: "success", result };
  } catch (error) {
    //TODO: throw the error to the github api
    return {
      status: "failed",
      message: error.message,
    };
  } finally {
    lockManager.releaseLock(`${repoName}:${branch}`);
  }
}

module.exports = deploymentWebhookService;
