const localDeploymentStrategy = require("./strategies/localDeploymentStrategy");
const sshDeploymentStrategy = require("./strategies/sshDeploymentStrategy");
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
