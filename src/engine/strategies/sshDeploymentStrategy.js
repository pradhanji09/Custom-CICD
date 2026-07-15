async function sshDeploymentStrategy({
  steps,
  context: { deployPath, ssh, healthCheck },
  metadata: { commitHash, pusherEmail, message },
}) {
  try {
    return {
      steps,
      deployPath,
      ssh,
      healthCheck,
      commitHash,
      pusherEmail,
      message,
    };
  } catch (error) {}
}

module.exports = sshDeploymentStrategy;
