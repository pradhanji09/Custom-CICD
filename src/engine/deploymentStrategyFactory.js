const localDeploymentStrategy = require("./strategies/LocalDeploymentStrategy");
const sshDeploymentStrategy = require("./strategies/SSHDeploymentStrategy");
const Errors = require("../commons/errors/errorCatalog");

function deploymentStrategyFactory(deploymentType) {
  const strategies = {
    LOCAL: localDeploymentStrategy,
    REMOTE: sshDeploymentStrategy,
  };

  const strategy = strategies[deploymentType];
  if (!strategy) throw Errors.UnkownDeploymentType(deploymentType);
  return strategy;
}

module.exports = deploymentStrategyFactory;
