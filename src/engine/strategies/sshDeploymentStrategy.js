const { NodeSSH } = require("node-ssh");
const {
  getSshCurrentSlot,
  getTargetSlot,
  resolvePort,
  switchToSlotSsh,
  resolvePm2Name,
  startProcessSsh,
  stopProcessSsh,
} = require("../engine.helper");
const path = require("path");
const { DEPLOYMENT_STEP } = require("../../commons/constants/constants");

function sshDeploymentStrategy(context) {
  const { deployPath, ssh: sshConfig, project, environment, port } = context;

  const ssh = new NodeSSH();
  let currentSlot;
  let targetSlot;
  let targetPath;
  let targetPort;
  let pm2Name;

  return {
    build: async (steps) => {
      try {
        await ssh.connect({
          host: sshConfig.host,
          port: sshConfig.port,
          username: sshConfig.username,
          privateKey: sshConfig.private_key_path,
        });
      } catch (error) {
        const err = new Error(error.message);
        err.step = "SSH_CONNECTION";
        throw err;
      }

      currentSlot = await getSshCurrentSlot(ssh, deployPath);
      targetSlot = getTargetSlot(currentSlot);
      targetPath = path.join(deployPath, targetSlot);
      targetPort = resolvePort(port, targetSlot);
      pm2Name = resolvePm2Name(project, environment, targetSlot);

      console.log(
        `[REMOTE] current slot: ${currentSlot ?? "none (first deploy)"} — deploying into: ${targetSlot} on port ${targetPort}`,
      );

      for (const step of steps) {
        const result = await ssh.execCommand(step, { cwd: targetPath });

        if (result.code !== 0) {
          const err = new Error(`Failed at step: ${step}`);
          err.step = DEPLOYMENT_STEP.DEPLOY_STEP;
          throw err;
        }
      }
    },

    startProcess: async () => {
      try {
        await startProcessSsh(ssh, { targetPath, pm2Name, port: targetPort });
      } catch (error) {
        const err = new Error(error.message);
        err.step = DEPLOYMENT_STEP.PROCESS_START;
        throw err;
      }
    },

    switchSymlink: async (shouldSwitch = true) => {
      if (!shouldSwitch) return;
      try {
        await switchToSlotSsh(ssh, deployPath, targetSlot);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.RELEASE;
        throw err;
      }
    },

    stopProcess: async () => {
      if (!currentSlot) return;
      const oldPm2Name = resolvePm2Name(project, environment, currentSlot);
      try {
        await stopProcessSsh(ssh, oldPm2Name);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.PROCESS_STOP;
        throw err;
      }
    },

    close: () => ssh.dispose(),

    getPort: () => targetPort,

    getHost: () => sshConfig.host,

    getCurrentSlot: () => currentSlot,
  };
}

module.exports = sshDeploymentStrategy;
