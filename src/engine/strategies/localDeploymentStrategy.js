async function localDeploymentStrategy({
  steps,
  context: { deployPath, healthCheck },
  metadata: { commitHash, pusherEmail, message },
}) {
  try {
    return {
      steps,
      deployPath,
      healthCheck,
      commitHash,
      pusherEmail,
      message,
    };
  } catch (error) {}
}

module.exports = localDeploymentStrategy;
