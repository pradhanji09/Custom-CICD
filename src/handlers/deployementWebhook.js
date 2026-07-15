const { deploymentWebhookService } = require("../services");

async function deploymentWebhookHandler(request, reply) {
  const { repoName, branch, signature } = request.body;

  const result = await deploymentWebhookService({
    repoName,
    branch,
    signature,
  });

  return reply.code(200).send(result);
}

module.exports = deploymentWebhookHandler;
