function responseLoggerPlugin(request, reply) {
  if (request.url === "/health" || request.url === "/metrics") {
    return;
  }

  const logData = {
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.elapsedTime, // ms
  };

  if (reply.errorCode) {
    logData.errorCode = reply.errorCode;
  }

  reply.log.info(logData, "Request completed");
}

module.exports = { responseLoggerPlugin };
