const path = require("path");
const fs = require("fs").promises;
const { SLOT } = require("../commons/constants/constants");
const Errors = require("../commons/errors/errorCatalog");

async function getCurrentSlot(deployPath) {
  const pointerPath = path.join(deployPath, "pointer");

  try {
    let currentSlot = await fs.readlink(pointerPath);
    return currentSlot; // node-a or node-b
  } catch (err) {
    if (err.code === "ENOENT") {
      // for the first deployment
      return null;
    }
    throw err;
  }
}

async function getTargetSlot(currentSlot) {
  if (!currentSlot) return SLOT.A; // node-a
  if (currentSlot === SLOT.A) return SLOT.B; // node-b
  if (currentSlot === SLOT.B) return SLOT.A; //node-a

  throw Errors.InvalidCurrentSlot(currentSlot);
}

module.exports = {
  getCurrentSlot,
  getTargetSlot,
};
