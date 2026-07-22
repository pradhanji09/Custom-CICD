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

async function sshDeploymentStrategy({ steps, context }) {
  const { deployPath, ssh: sshConfig, project, environment, port } = context;

  const ssh = new NodeSSH();
  let targetSlot;
  let targetPort;
  let currentSlot;
  let pm2Name;

  const executedSteps = [];
  try {
    // If the connection fails (wrong key, server down), this will THROW an error
    // and jump straight to the catch block.
    await ssh.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      privateKey: sshConfig.private_key_path,
    });

    currentSlot = await getSshCurrentSlot(ssh, deployPath);
    targetSlot = getTargetSlot(currentSlot);
    const targetPath = path.join(deployPath, targetSlot);
    targetPort = resolvePort(port, targetSlot);
    pm2Name = resolvePm2Name(project, environment, targetSlot);

    console.log(
      `[REMOTE] current slot: ${currentSlot ?? "none (first deploy)"} — deploying into: ${targetSlot} on port ${targetPort}`,
    );

    for (const step of steps) {
      const result = await ssh.execCommand(step, { cwd: targetPath });

      executedSteps.push({
        command: step,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code,
      });

      // Fail-fast: one command fails
      if (result.code !== 0) {
        ssh.dispose();
        return {
          success: false,
          strategy: "REMOTE",
          failedAt: step,
          executedSteps,
        };
      }
    }

    // Build steps succeeded — start the process for this slot before returning.
    try {
      await startProcessSsh(ssh, { targetPath, pm2Name, port: targetPort });
    } catch (error) {
      ssh.dispose();
      return {
        success: false,
        strategy: "REMOTE",
        failedAt: DEPLOYMENT_STEP.PROCESS_START,
        error: error.message,
        executedSteps,
      };
    }
  } catch (error) {
    // ssh.connect() failures or unexpected network drops
    ssh.dispose();
    return {
      success: false,
      strategy: "REMOTE",
      failedAt: "SSH_CONNECTION",
      error: error.message,
      executedSteps: [],
    };
  }

  // NOTE: ssh connection is intentionally left OPEN here on success.
  // Caller (deploymentWebhookService) must call closeConnection() once
  // fully done with SSH work — after symlinkSwitcher AND after
  // stopping the old slot's process.
  return {
    success: true,
    strategy: "REMOTE",
    executedSteps,
    port: targetPort,
    host: sshConfig.host,
    targetSlot,
    currentSlot,
    pm2Name,
    symlinkSwitcher: async (shouldSwitch = false) => {
      if (!shouldSwitch) return;
      try {
        await switchToSlotSsh(ssh, deployPath, targetSlot);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.RELEASE;
        throw err;
      }
    },
    stopOldProcess: async (oldSlot) => {
      if (!oldSlot) return;
      const oldPm2Name = resolvePm2Name(project, environment, oldSlot);
      try {
        await stopProcessSsh(ssh, oldPm2Name);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.PROCESS_STOP;
        throw err;
      }
    },
    closeConnection: () => {
      ssh.dispose();
    },
  };
}

module.exports = sshDeploymentStrategy;
