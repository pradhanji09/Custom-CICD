const dbPlugin = require("./plugins/db");
const errorHandlerPlugin = require("./plugins/errorHandler");
const { responseLoggerPlugin } = require("./plugins/logging");
const deploymentRoutes = require("./routes");
const crypto = require("crypto");
const { LogController } = require("fastify");

const fastify = require("fastify")({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    redact: ["req.headers.authorization", "req.body.password"],
    transport:
      process.env.NODE_ENV !== "PROD"
        ? {
            target: "pino-pretty",
            // options: {
            //   ignore: "pid,hostname",
            // },
          }
        : undefined,
  },
  requestIdHeader: "x-request-id",
  genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
});

//HOOKS
fastify.addHook("onResponse", responseLoggerPlugin);

//PLUGINS
fastify.register(dbPlugin);
fastify.register(errorHandlerPlugin);
fastify.register(deploymentRoutes, { prefix: "/deployments" });

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
