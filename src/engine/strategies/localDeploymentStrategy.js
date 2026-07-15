async function localDeploymentStrategy({
  steps,
  context: { deployPath, healthCheck },
  metadata: { commitHash, pusherEmail, message, deploymentId },
}) {
  try {
    return {
      steps,
      deployPath,
      healthCheck,
      commitHash,
      pusherEmail,
      message,
      deploymentId,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = localDeploymentStrategy;
