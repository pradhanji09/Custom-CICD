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

  const repoName = repository?.name;
  const pusherEmail = pusher?.email;

  // Handle Branch Deleted
  if (deleted) {
    return reply
      .code(200)
      .send({ message: "Deleted branch", status: "success" });
  }

  const result = await deploymentWebhookService({
    repoName,
    commitHash,
    branch: ref.split("/")[2],
    pusherEmail,
    message: commits[0].message,
  });

  return reply.code(200).send(result);
}

module.exports = deploymentWebhookHandler;

/*
- extract reponame, branch, commit hash, pusher,  
- we will forward to SSH or LOCAL as per their config
*/
