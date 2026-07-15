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
    message: commits[0]?.message,
  });

  return reply.code(200).send(result);
}

module.exports = deploymentWebhookHandler;

/*
{
  "ref": "refs/heads/main",
  "before": "904b5247a33b2591605307b22108cf1c26b38411",
  "after": "1481a2de7b2a7d02428ad934d40a13be88c35574",
  "repository": {
    "id": 12345678,
    "name": "my-awesome-project",
    "full_name": "octocat/my-awesome-project",
    "html_url": "https://github.com",
    "owner": {
      "name": "octocat",
      "email": "octocat@github.com"
    }
  },
  "pusher": {
    "name": "octocat",
    "email": "octocat@github.com"
  },
  "sender": {
    "login": "octocat",
    "id": 1,
    "avatar_url": "https://github.com",
    "type": "User"
  }
}

- extract reponame, branch, commit hash, pusher,  
- we will forward to SSH or LOCAL as per their config
*/
