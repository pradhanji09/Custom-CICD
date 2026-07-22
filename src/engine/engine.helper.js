const path = require("path");
const fs = require("fs").promises;
const { SLOT, DEPLOYMENT_STEP } = require("../commons/constants/constants");
const Errors = require("../commons/errors/errorCatalog");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

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

async function startProcessLocal({
  targetPath,
  pm2Name,
  port,
  entryPoint = "app.js",
}) {
  const command = `PORT=${port} pm2 start ${entryPoint} --name ${pm2Name}`;

  try {
    const { stdout, stderr } = await execPromise(command, { cwd: targetPath });
    console.log(`[LOCAL] started process ${pm2Name} on port ${port}`);
    return { started: true, pm2Name, stdout, stderr };
  } catch (err) {
    err.step = DEPLOYMENT_STEP.PROCESS_START;
    throw err;
  }
}

async function stopProcessLocal(pm2Name) {
  const command = `pm2 delete ${pm2Name}`;

  try {
    await execPromise(command);
    console.log(`[LOCAL] stopped process ${pm2Name}`);
    return { stopped: true, pm2Name };
  } catch (err) {
    // pm2 delete exits non-zero if the process name doesn't exist — treat as already-stopped, not fatal
    const notFound = /not found|process or namespace not found/i.test(
      err.stderr || err.message || "",
    );
    if (notFound) {
      console.log(`[LOCAL] process ${pm2Name} was already stopped/absent`);
      return { stopped: true, pm2Name, alreadyAbsent: true };
    }
    err.step = DEPLOYMENT_STEP.PROCESS_STOP;
    throw err;
  }
}

async function startProcessSsh(
  ssh,
  { targetPath, pm2Name, port, entryPoint = "app.js" },
) {
  const command = `PORT=${port} pm2 start ${entryPoint} --name ${pm2Name}`;
  const result = await ssh.execCommand(command, { cwd: targetPath });

  if (result.code !== 0) {
    const err = new Error(
      `Failed to start process ${pm2Name} on remote host: ${result.stderr}`,
    );
    err.step = DEPLOYMENT_STEP.PROCESS_START;
    throw err;
  }

  console.log(`[REMOTE] started process ${pm2Name} on port ${port}`);
  return {
    started: true,
    pm2Name,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function stopProcessSsh(ssh, pm2Name) {
  const command = `pm2 delete ${pm2Name}`;
  const result = await ssh.execCommand(command);

  if (result.code !== 0) {
    const notFound = /not found|process or namespace not found/i.test(
      result.stderr || "",
    );
    if (notFound) {
      console.log(`[REMOTE] process ${pm2Name} was already stopped/absent`);
      return { stopped: true, pm2Name, alreadyAbsent: true };
    }
    const err = new Error(
      `Failed to stop process ${pm2Name} on remote host: ${result.stderr}`,
    );
    err.step = DEPLOYMENT_STEP.PROCESS_STOP;
    throw err;
  }

  console.log(`[REMOTE] stopped process ${pm2Name}`);
  return { stopped: true, pm2Name };
}

function resolvePm2Name(project, environment, slot) {
  return `${project}-${environment}-${slot}`;
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
  resolvePm2Name,
  startProcessLocal,
  stopProcessLocal,
  startProcessSsh,
  stopProcessSsh,
};
