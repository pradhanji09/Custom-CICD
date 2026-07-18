const { exec } = require("child_process");
const util = require("util");
const { getLocalCurrentSlot, getTargetSlot } = require("../engine.helper");
const path = require("path");
const execPromise = util.promisify(exec);

async function localDeploymentStrategy({ steps, context }) {
  const { deployPath } = context;

  const currentSlot = await getLocalCurrentSlot(deployPath);
  const targetSlot = getTargetSlot(currentSlot);
  const targetPath = path.join(deployPath, targetSlot);

  const executedSteps = [];

  for (const step of steps) {
    try {
      const { stdout, stderr } = await execPromise(step, {
        cwd: targetPath,
        maxBuffer: 10 * 1024 * 1024, // Increasing to 10MB munally becuase, Node.js default is 1MB
      });

      executedSteps.push({
        command: step,
        stdout,
        stderr,
        exitCode: 0,
      });
    } catch (error) {
      // execPromise REJECTS (throws) when exit code is non-zero
      // this is different behavior from node-ssh's execCommand!
      // in node-ssh, execCommand returns an object with code + stdout + stderr even when the exit code is non-zero
      executedSteps.push({
        command: step,
        stdout: error.stdout,
        stderr: error.stderr,
        exitCode: error.code,
      });

      return {
        success: false,
        strategy: "LOCAL",
        failedAt: step,
        executedSteps,
      };
    }
  }

  return {
    success: true,
    strategy: "LOCAL",
    executedSteps,
  };
}

module.exports = localDeploymentStrategy;
