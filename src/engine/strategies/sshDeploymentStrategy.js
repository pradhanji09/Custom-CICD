const { NodeSSH } = require("node-ssh");
const { getSshCurrentSlot, getTargetSlot } = require("../engine.helper");
const path = require("path");

async function sshDeploymentStrategy({ steps, context }) {
  const { deployPath, ssh: sshConfig } = context;

  const ssh = new NodeSSH();

  try {
    // If the connection fails (wrong key, server down), this will THROW an error
    // and jump straight to the catch block.
    await ssh.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      privateKey: sshConfig.private_key_path,
    });

    const currentSlot = await getSshCurrentSlot(ssh, deployPath);
    const targetSlot = getTargetSlot(currentSlot);
    const targetPath = path.join(deployPath, targetSlot);

    const executedSteps = [];

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
        return {
          success: false,
          strategy: "REMOTE",
          failedAt: step,
          executedSteps,
        };
      }
    }

    return {
      success: true,
      strategy: "REMOTE",
      executedSteps,
    };
  } catch (error) {
    // ssh.connect() failures or unexpected network drops
    return {
      success: false,
      strategy: "REMOTE",
      failedAt: "SSH_CONNECTION",
      error: error.message,
      executedSteps: [],
    };
  } finally {
    // always close tunnel whether it succeeded, failed, or crashed!
    if (ssh && ssh.isConnected) {
      ssh.dispose();
    }
  }
}

module.exports = sshDeploymentStrategy;
