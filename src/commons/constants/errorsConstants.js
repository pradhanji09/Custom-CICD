const STATUS_CODES = {
  301: "MOVED_PERMANENTLY",
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "REQUEST_FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_REQUEST",
  405: "METHOD_NOT_ALLOWED",
  500: "INTERNAL_SERVER_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
};

const STATUS_TEXTS = {
  400: "Bad request parameters",
  401: "Bad or expired token",
  403: "Insufficient permissions to perform an operation over a resource",
  404: "Resource Not Found",
  405: "Method not allowed",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

const ERROR_LOGGING_MESSAGES = {
  fatal: "Fatal: Unhandled Error",
  paramsValidation: "Validation Error: Schema Validation Error",
  badRequest: "Validation Error: Bad Request",
  connectionError: "Validation Error: DB Connection Error",
  postgresError: "Validation Error: Postgres Error",
};

const SYSTEM_ERROR_CODES = {
  ECONNRESET: "CONNECTION_RESET",
  ETIMEDOUT: "CONNECTION_TIMEOUT",
  ECONNREFUSED: "CONNECTION_REFUSED",
};

module.exports = {
  STATUS_CODES,
  STATUS_TEXTS,
  ERROR_LOGGING_MESSAGES,
  SYSTEM_ERROR_CODES,
};
