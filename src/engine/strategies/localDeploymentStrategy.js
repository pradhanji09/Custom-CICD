const { exec } = require("child_process");
const util = require("util");
const {
  getLocalCurrentSlot,
  getTargetSlot,
  resolvePort,
  switchToSlotLocal,
  resolvePm2Name,
  startProcessLocal,
  stopProcessLocal,
} = require("../engine.helper");
const path = require("path");
const { DEPLOYMENT_STEP } = require("../../commons/constants/constants");
const execPromise = util.promisify(exec);

async function localDeploymentStrategy({ steps, context }) {
  const { deployPath, project, environment, port } = context;

  const currentSlot = await getLocalCurrentSlot(deployPath);
  const targetSlot = getTargetSlot(currentSlot);
  const targetPath = path.join(deployPath, targetSlot);
  const targetPort = resolvePort(port, targetSlot);
  const pm2Name = resolvePm2Name(project, environment, targetSlot);

  console.log(
    `[LOCAL] current slot: ${currentSlot ?? "none (first deploy)"} — deploying into: ${targetSlot} on port ${targetPort}`,
  );

  const executedSteps = [];

  for (const step of steps) {
    try {
      const { stdout, stderr } = await execPromise(step, {
        cwd: targetPath,
        maxBuffer: 10 * 1024 * 1024, // Increasing to 10MB manually because Node.js default is 1MB
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

  // Build steps succeeded — start the process for this slot before returning.
  try {
    await startProcessLocal({ targetPath, pm2Name, port: targetPort });
  } catch (error) {
    return {
      success: false,
      strategy: "LOCAL",
      failedAt: DEPLOYMENT_STEP.PROCESS_START,
      error: error.message,
      executedSteps,
    };
  }

  return {
    success: true,
    strategy: "LOCAL",
    executedSteps,
    port: targetPort,
    host: "localhost",
    targetSlot,
    currentSlot,
    pm2Name,
    symlinkSwitcher: async (shouldSwitch = false) => {
      if (!shouldSwitch) return;
      try {
        await switchToSlotLocal(deployPath, targetSlot);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.RELEASE;
        throw err;
      }
    },
    stopOldProcess: async (oldSlot) => {
      if (!oldSlot) return;
      const oldPm2Name = resolvePm2Name(project, environment, oldSlot);
      try {
        await stopProcessLocal(oldPm2Name);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.PROCESS_STOP;
        throw err;
      }
    },
    closeConnection: () => {
      // no-op: LOCAL has no persistent connection to close
    },
  };
}

module.exports = localDeploymentStrategy;
