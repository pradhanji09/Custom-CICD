const fastify = require("fastify")({
  logger: true,
});

fastify.get("/", async (request, reply) => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err, "Error occurred during server start:");
    process.exit(1);
  }
};

start();

const signals = ["SIGINT", "SIGTERM"];

for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Clos connections, stops accepting new requests
      await fastify.close();
      fastify.log.info("Server closed successfully.");
      process.exit(0);
    } catch (err) {
      fastify.log.error("Error occurred during server shutdown:", err);
      process.exit(1);
    }
  });
}
