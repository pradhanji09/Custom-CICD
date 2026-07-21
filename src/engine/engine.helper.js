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

function getPreviousSlot(currentSlot) {
  if (!currentSlot) throw Errors.NothingLive();
  if (currentSlot === SLOT.A) return SLOT.B;
  if (currentSlot === SLOT.B) return SLOT.A;

  throw Errors.InvalidCurrentSlot(currentSlot);
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

function getTargetSlot(currentSlot) {
  if (!currentSlot) return SLOT.A; // node-a
  if (currentSlot === SLOT.A) return SLOT.B; // node-b
  if (currentSlot === SLOT.B) return SLOT.A; //node-a

  throw Errors.InvalidCurrentSlot(currentSlot);
}

function resolveTemplate(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in variables)) {
      throw Errors.MissingTemplateVariable(key, template);
    }
    return variables[key];
  });
}

function resolvePort(basePort, slot) {
  if (slot === "node-a") return basePort;
  if (slot === "node-b") return basePort + 1;

  throw Errors.UnknownPort(slot);
}

async function switchToSlotLocal(deployPath, targetSlot) {
  const pointerPath = path.join(deployPath, "pointer");
  const tempPath = path.join(deployPath, "pointer.tmp");

  // clean up any leftover temp symlink from a previous failed attempt
  await fs.rm(tempPath, { force: true });

  // create temp symlink
  await fs.symlink(targetSlot, tempPath);

  // atomic pointer swap
  await fs.rename(tempPath, pointerPath);
  console.log(`[LOCAL] switched pointer -> ${targetSlot}`);
}

async function switchToSlotSsh(ssh, deployPath, targetSlot) {
  // -T : it tells mv to treat current as a plain file/symlink target (not a directory to move into)
  // -s : create symbolic link
  // -f : means "force," i.e., "overwrite pointer.tmp if it already exists,
  // -n : means "no-clobber" i.e. do not overwrite an existing file
  const command = `ln -sfn ${targetSlot} pointer.tmp && mv -Tf pointer.tmp pointer`;
  const result = await ssh.execCommand(command, { cwd: deployPath });

  if (result.code !== 0) {
    throw new Error(
      `Failed to switch symlink on remote host: ${result.stderr}`,
    );
  }

  console.log(`[REMOTE] switched current -> ${targetSlot}`);
}

module.exports = {
  getLocalCurrentSlot,
  getTargetSlot,
  getSshCurrentSlot,
  resolvePort,
  resolveTemplate,
  switchToSlotLocal,
  switchToSlotSsh,
  getPreviousSlot,
};
