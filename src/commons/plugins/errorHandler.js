const fp = require("fastify-plugin");
const { SYSTEM_ERROR_CODES } = require("../constants/errorsConstants");
const formatValidationMessage = require("../helpers");

function errorHandlerPlugin(fastify, opts, done) {
  fastify.setErrorHandler((err, request, reply) => {
    // Fastify Schema Validation
    if (err.validation) {
      return reply.status(400).send({
        success: false,
        errorCode: "VALIDATION_ERROR",
        message: formatValidationMessage(err),
        details: err.validation,
      });
    }

    //Node system-level errors
    if (err.code && SYSTEM_ERROR_CODES[err.code]) {
      request.log.error(err);
      return reply.status(503).send({
        success: false,
        errorCode: SYSTEM_ERROR_CODES[err.code],
        message: "A downstream service is temporarily unavailable",
      });
    }

    const statusCode = err.statusCode || 500;
    const errorCode = err.errorCode || "INTERNAL_ERROR";
    const message = err.isOperational ? err.message : "Something went wrong";
    reply.errorCode = errorCode;

    if (!err.isOperational) {
      request.log.error(err);
    }

    if (!err.isOperational) {
      request.log.error({ err }, "Unexpected error"); // real bug
    } else if (statusCode >= 500) {
      request.log.error({ err }, "Operational 5xx error");
    } else if (statusCode === 429 || statusCode === 401) {
      request.log.warn({ err }, "Client error worth tracking");
    }

    reply.status(statusCode).send({ success: false, errorCode, message });
  });
  done();
}

module.exports = fp(errorHandlerPlugin);
