/**
 * Helper to extract client IP considering X-Forwarded-For headers from proxy/Nginx
 */
function getClientIp(request) {
  const xForwardedFor = request.headers["x-forwarded-for"];
  if (xForwardedFor) {
    // X-Forwarded-For can be "client, proxy1, proxy2". First IP is client.
    return xForwardedFor.split(",")[0].trim();
  }
  return request.ip || request.socket.remoteAddress;
}

function responseLoggerPlugin(request, reply) {
  if (request.url === "/health" || request.url === "/metrics") {
    return;
  }

  const logData = {
    clientIp: getClientIp(request),
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: `${reply.elapsedTime.toFixed(2)}ms`,
    request: {
      headers: {
        host: request.headers.host,
        userAgent: request.headers["user-agent"],
        contentType: request.headers["content-type"],
        xForwardedFor: request.headers["x-forwarded-for"] || null,
        xGitHubEvent: request.headers["X-GitHub-Event"] || null,
        xHubSignature256: request.headers["X-Hub-Signature-256"] || null,
      },
      params: Object.keys(request.params || {}).length
        ? request.params
        : undefined,
      query: Object.keys(request.query || {}).length
        ? request.query
        : undefined,
      body: request.body || undefined,
    },
    response: {
      payload: reply.rawPayload || undefined,
    },
  };

  if (reply.errorCode) {
    logData.errorCode = reply.errorCode;
  }
  if (reply.statusCode >= 500) {
    reply.log.error(logData, "Request failed with server error");
  } else if (reply.statusCode >= 400) {
    reply.log.warn(logData, "Request completed with client error");
  } else {
    reply.log.info(logData, "Request completed successfully");
  }
}

module.exports = { responseLoggerPlugin };
