const dbPlugin = require("./plugins/db");
const deployementRoutes = require("./routes");
const fastify = require("fastify")({
  logger: true,
});

//PLUGINS
fastify.register(dbPlugin);
fastify.register(deployementRoutes, { prefix: "v1" });

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 8080, host: "0.0.0.0" });
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
