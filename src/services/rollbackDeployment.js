const { NodeSSH } = require("node-ssh");
const {
  TRIGGER_TYPE,
  DEPLOYMENT_STATUS,
  DEPLOYMENT_STEP,
  DEPLOYMENT_TYPE, // assumed enum: { LOCAL: "LOCAL", SSH: "SSH" }
} = require("../commons/constants/constants");
const Errors = require("../commons/errors/errorCatalog");
const configRegistry = require("../config/configRegistry");
const lockManager = require("../engine/lockmanager");
const deploymentRepo = require("../repositories/deployment");
const {
  getSshCurrentSlot,
  getLocalCurrentSlot,
  switchToSlotSsh,
  switchToSlotLocal,
  getPreviousSlot,
} = require("../engine/engine.helper");

class LocalRollbackStrategy {
  async rollback({ deployPath }) {
    const currentSlot = await getLocalCurrentSlot(deployPath);
    const targetSlot = getPreviousSlot(currentSlot);
    await switchToSlotLocal(deployPath, targetSlot);
  }

  async dispose() {}
}

class SshRollbackStrategy {
  constructor() {
    this.ssh = null;
  }

  async rollback({ deployPath, sshConfig }) {
    this.ssh = new NodeSSH();
    await this.ssh.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      privateKey: sshConfig.private_key_path,
    });

    const currentSlot = await getSshCurrentSlot(this.ssh, deployPath);
    const targetSlot = getPreviousSlot(currentSlot);
    await switchToSlotSsh(this.ssh, deployPath, targetSlot);
  }

  async dispose() {
    if (this.ssh) this.ssh.dispose();
  }
}

function createRollbackStrategy(deploymentType) {
  const strategies = {
    [DEPLOYMENT_TYPE.LOCAL]: () => new LocalRollbackStrategy(),
    [DEPLOYMENT_TYPE.REMOTE]: () => new SshRollbackStrategy(),
  };

  const factory = strategies[deploymentType];
  if (!factory) throw Errors.UnkownDeploymentType(deploymentType);

  return factory();
}

async function rollbackDeploymentService(knex, { project, environment }) {
  const { createDeployment, updateDeployment } = deploymentRepo(knex);

  const environmentConfig = resolveEnvironmentConfig(project, environment);
  const { deployPath, deployment_type, branch } = environmentConfig;

  const lockKey = `${project}:${branch}`;
  if (!lockManager.acquireLock(lockKey)) {
    return {
      status: DEPLOYMENT_STATUS.SKIPPED,
      message: "Rollback is already in progress",
    };
  }

  const strategy = createRollbackStrategy(deployment_type);
  let deploymentId;

  try {
    const { deployment_id } = await createDeployment({
      input: {
        project,
        environment: environmentConfig.environment_name,
        branch: environmentConfig.branch,
        commit_hash: "",
        deployment_type,
        trigger_type: TRIGGER_TYPE.ROLLBACK,
        status: DEPLOYMENT_STATUS.IN_PROGRESS,
      },
    });
    deploymentId = deployment_id;

    await strategy.rollback({
      deployPath,
      sshConfig: environmentConfig.ssh_config,
    });

    return await updateDeployment({
      filter: { deployment_id },
      input: {
        status: DEPLOYMENT_STATUS.SUCCESS,
        completed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (deploymentId) {
      await updateDeployment({
        filter: { deployment_id: deploymentId },
        input: {
          status: DEPLOYMENT_STATUS.FAILED,
          completed_at: new Date().toISOString(),
          failed_step: DEPLOYMENT_STEP.RELEASE,
        },
      });
    }
    throw error;
  } finally {
    await strategy.dispose();
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
