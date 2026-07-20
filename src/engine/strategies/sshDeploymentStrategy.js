const { NodeSSH } = require("node-ssh");
const {
  getSshCurrentSlot,
  getTargetSlot,
  resolvePort,
  resolveTemplate,
  switchToSlotSsh,
} = require("../engine.helper");
const path = require("path");

async function sshDeploymentStrategy({ steps, context }) {
  const { deployPath, ssh: sshConfig, project, environment, port } = context;

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
    // it can change to path.posix for linuk,
    // and use forward slash '/' instead of backward slash '\' for windows
    const targetPort = resolvePort(port, targetSlot);

    const templateVars = {
      project,
      environment,
      slot: targetSlot,
      port: targetPort,
    };

    console.log(
      `[REMOTE] current slot: ${currentSlot ?? "none (first deploy)"} — deploying into: ${targetSlot} on port ${targetPort}`,
    );
    const executedSteps = [];

    for (const rawStep of steps) {
      const step = resolveTemplate(rawStep, templateVars);
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

    // All steps passed — atomically swap the symlink pointer to the new slot (RELEASE)
    try {
      await switchToSlotSsh(ssh, deployPath, targetSlot);
    } catch (err) {
      err.step = "RELEASE";
      throw err;
    }

    return {
      success: true,
      strategy: "REMOTE",
      executedSteps,
      port: targetPort,
      host: sshConfig.host,
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
