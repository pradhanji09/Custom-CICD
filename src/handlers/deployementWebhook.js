const { deploymentWebhookService } = require("../services");

async function deploymentWebhookHandler(request, reply) {
  const {
    deleted,
    after: commitHash,
    ref,
    repository,
    pusher,
    commits = [],
  } = request.body;

  const { knex } = request.server;

  const repoName = repository?.name;
  const pusherEmail = pusher?.email;

  // Handle Branch Deleted
  if (deleted) {
    return reply.code(200).send({
      status: "ignored",
      message: "Branch deletion event, no deployment triggered",
    });
  }

  const result = await deploymentWebhookService(knex, {
    repoName,
    commitHash,
    branch: ref.split("/")[2],
    pusherEmail,
    message: commits[0]?.message,
  });

  return reply.code(200).send(result);
}

module.exports = deploymentWebhookHandler;
