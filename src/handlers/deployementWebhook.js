function deploymentWebhookHandler(fastify) {
  return async function (request, reply) {
    const { body, rawBody } = request;

    return {
      parsedData: body,
      rawText: rawBody,
    };
  };
}

module.exports = deploymentWebhookHandler;
