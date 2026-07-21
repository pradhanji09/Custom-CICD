const handlers = require("../handlers");
const contentTypeParser = require("../commons/plugins/contentParser");
const { verifySignature } = require("../commons/hooks/verifySignature");
const isPushEventType = require("../commons/hooks/isPushEvent");

module.exports = async (fastify) => {
  fastify.register(contentTypeParser);

  fastify.route({
    method: "POST",
    url: "/webhook",
    // preHandler: [isPushEventType, verifySignature],
    handler: handlers.deploymentWebhook,
  });

  fastify.route({
    method: "POST",
    url: "/:project/:environment/rollback",
    handler: handlers.rollbackDeployment,
  });
};
