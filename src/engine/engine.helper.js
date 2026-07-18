const path = require("path");
const fs = require("fs").promises;
const { SLOT } = require("../commons/constants/constants");
const Errors = require("../commons/errors/errorCatalog");

async function getLocalCurrentSlot(deployPath) {
  const pointerPath = path.join(deployPath, "pointer");

  try {
    let currentSlot = await fs.readlink(pointerPath);
    return currentSlot; // node-a or node-b
  } catch (err) {
    if (err.code === "ENOENT") {
      // for the first deployment
      return null;
    }
    throw Errors.FailedToReadCurrentSlot(err.message);
  }
}

async function getSshCurrentSlot(ssh, deployPath) {
  const result = await ssh.execCommand(`readlink pointer`, { cwd: deployPath });

  if (result.code !== 0) {
    if (result.stderr.includes("No such file or directory")) return null;
    throw Errors.FailedToReadCurrentSlot(result.stderr);
  }

  const stdout = result.stdout.trim();
  return stdout;
}

async function getTargetSlot(currentSlot) {
  if (!currentSlot) return SLOT.A; // node-a
  if (currentSlot === SLOT.A) return SLOT.B; // node-b
  if (currentSlot === SLOT.B) return SLOT.A; //node-a

  throw Errors.InvalidCurrentSlot(currentSlot);
}

module.exports = {
  getLocalCurrentSlot,
  getTargetSlot,
  getSshCurrentSlot,
};
