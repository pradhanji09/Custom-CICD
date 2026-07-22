const env = require("./config/env");
const { responseLoggerPlugin } = require("./commons/plugins/logging");
const dbPlugin = require("./commons/plugins/db");
const errorHandlerPlugin = require("./commons/plugins/errorHandler");
const deploymentRoutes = require("./routes");
const crypto = require("crypto");

const fastify = require("fastify")({
  logger: {
    level: env.LOG_LEVEL,
    redact: ["req.headers.authorization", "req.body.password"],
    transport:
      env.NODE_ENV !== "PROD"
        ? {
            target: "pino-pretty",
            options: {
              ignore: "pid,hostname",
              colorize: false,
            },
          }
        : undefined,
  },
  requestIdHeader: "x-request-id",
  genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
});

//HOOKS
fastify.addHook("onResponse", responseLoggerPlugin);
fastify.route({
  method: "GET",
  url: "/",
  handler: (request, reply) => {
    reply.send("Hello World!");
  },
});

//PLUGINS
fastify.register(dbPlugin);
fastify.register(errorHandlerPlugin);
fastify.register(deploymentRoutes, { prefix: "/deployments" });

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
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
