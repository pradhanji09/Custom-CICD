const { STATUS_TEXTS, STATUS_CODES } = require("./errorsConstants");

class AppError extends Error {
  constructor({ message, statusCode, errorCode, isOperational = true }) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static create(statusCode, { message, errorCode, isOperational = true } = {}) {
    return new AppError({
      statusCode,
      message: message || STATUS_TEXTS[statusCode] || "Something went wrong",
      errorCode: errorCode || STATUS_CODES[statusCode] || "UNKNOWN_ERROR",
      isOperational,
    });
  }

  static badRequest({ message, errorCode } = {}) {
    return AppError.create(400, { message, errorCode });
  }

  static unauthorized({ message, errorCode } = {}) {
    return AppError.create(401, { message, errorCode });
  }

  static forbidden({ message, errorCode } = {}) {
    return AppError.create(403, { message, errorCode });
  }

  static notFound({ message, errorCode } = {}) {
    return AppError.create(404, { message, errorCode });
  }

  static conflict({ message, errorCode } = {}) {
    return AppError.create(409, { message, errorCode });
  }

  static tooManyRequests({ message, errorCode } = {}) {
    return AppError.create(429, { message, errorCode });
  }

  static internal({ message, errorCode } = {}) {
    return AppError.create(500, { message, errorCode, isOperational: false });
  }
}

module.exports = AppError;
