const { DEPLOYMENT_STATUS } = require("../constants/constants");
function isPushEventType(request, reply) {
  const { "X-GitHub-Event": event } = request.headers;
  if (event !== "push") {
    return reply.code(200).send({
      message: `${event} event received, skipping deployment`,
      status: DEPLOYMENT_STATUS.SKIPPED,
    });
  }
}

module.exports = isPushEventType;
