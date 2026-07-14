const handlers = require("../handlers");
const { verifySignature } = require("../hooks/verifySignature");
const contentTypeParser = require("../plugins/contentParser");

module.exports = async (fastify) => {
  fastify.register(contentTypeParser);

  fastify.route({
    method: "POST",
    url: "/webhook",
    preHandler: [verifySignature],
    handler: handlers.deploymentWebhook(fastify),
  });
};
