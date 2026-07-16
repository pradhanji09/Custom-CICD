async function sshDeploymentStrategy({
  steps,
  context: { deployPath, ssh, healthCheck },
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
      deploymentId,
    };
  } catch (error) {}
}

module.exports = sshDeploymentStrategy;
