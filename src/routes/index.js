const handlers = require("../handlers");
const contentTypeParser = require("../commons/plugins/contentParser");
const { verifySignature } = require("../commons/hooks/verifySignature");

module.exports = async (fastify) => {
  fastify.register(contentTypeParser);

  fastify.route({
    method: "POST",
    url: "/webhook",
    // preHandler: [verifySignature],
    handler: handlers.deploymentWebhook,
  });
};
