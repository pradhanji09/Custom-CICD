const handlers = require("../handlers");
const contentTypeParser = require("../plugins/contentParser");

module.exports = async (fastify) => {
  fastify.register(contentTypeParser);

  fastify.route({
    method: "POST",
    url: "/webhook",
    handler: handlers.deploymentWebhook(fastify),
  });
};
