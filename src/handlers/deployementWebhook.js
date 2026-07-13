function deployementWebhookHandler(fastify) {
  return async function (request, reply) {
    const { body } = request;
    return { data: body };
  };
}

module.exports = deployementWebhookHandler;
