const { TRIGGER_TYPE } = require("../commons/constants/constants");
const Errors = require("../commons/errors/errorCatalog");
const deploymentRepo = require("../repositories/deployment");
const deploymentWebhookService = require("./deploymentWebhook");

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
    project: repoName,
    commit_hash: previousCommitHash,
    branch,
  } = previousDeployment[0];

  return await deploymentWebhookService(
    knex,
    { repoName, commitHash: previousCommitHash, branch },
    TRIGGER_TYPE.ROLLBACK,
    environment,
  );
}

module.exports = rollbackDeploymentService;
