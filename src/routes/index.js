const handlers = require("../handlers");

module.exports = async (fastify) => {
  fastify.route({
    method: "POST",
    url: "/deployements/webhook",
    handler: handlers.deployementWebhook(fastify),
  });
};
