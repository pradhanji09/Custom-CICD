const Errors = require("../commons/errors/errorCatalog");
const deploymentRepo = require("../repositories/deployment");

async function rollbackDeploymentService(knex, { project, environment }) {
  const { getDeployment } = deploymentRepo(knex);

  const previousDeployment = await getDeployment({
    where: {
      project,
      environment,
      status: "success",
    },
    orderBy: { column: "completed_at", order: "desc" },
    limit: 1,
  });

  if (!previousDeployment || previousDeployment.length === 0)
    throw Errors.NoPreviousDeployment(project, environment);

  const {
    repo_name,
    commit_hash: previousCommitHash,
    deployment_type,
    branch,
  } = previousDeployment[0];
}

module.exports = rollbackDeploymentService;
