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

function localDeploymentStrategy(context) {
  const { deployPath, project, environment, port } = context;

  let currentSlot;
  let targetSlot;
  let targetPath;
  let targetPort;
  let pm2Name;

  return {
    build: async (steps) => {
      currentSlot = await getLocalCurrentSlot(deployPath);
      targetSlot = getTargetSlot(currentSlot);
      targetPath = path.join(deployPath, targetSlot);
      targetPort = resolvePort(port, targetSlot);
      pm2Name = resolvePm2Name(project, environment, targetSlot);

      console.log(
        `[LOCAL] current slot: ${currentSlot ?? "none (first deploy)"} — deploying into: ${targetSlot} on port ${targetPort}`,
      );

      for (const step of steps) {
        try {
          await execPromise(step, {
            cwd: targetPath,
            maxBuffer: 10 * 1024 * 1024, // Increasing to 10MB manually
          });
        } catch (err) {
          err.step = DEPLOYMENT_STEP.DEPLOY_STEP;
          throw err;
        }
      }
    },

    startProcess: async () => {
      try {
        await startProcessLocal({ targetPath, pm2Name, port: targetPort });
      } catch (error) {
        const err = new Error(error.message);
        err.step = DEPLOYMENT_STEP.PROCESS_START;
        throw err;
      }
    },

    switchSymlink: async (shouldSwitch = true) => {
      if (!shouldSwitch) return;
      try {
        await switchToSlotLocal(deployPath, targetSlot);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.RELEASE;
        throw err;
      }
    },

    stopProcess: async () => {
      if (!currentSlot) return;
      const oldPm2Name = resolvePm2Name(project, environment, currentSlot);
      try {
        await stopProcessLocal(oldPm2Name);
      } catch (err) {
        err.step = DEPLOYMENT_STEP.PROCESS_STOP;
        throw err;
      }
    },

    close: () => {},
    getPort: () => targetPort,
    getHost: () => "localhost",
    getCurrentSlot: () => currentSlot,
  };
}

module.exports = localDeploymentStrategy;
