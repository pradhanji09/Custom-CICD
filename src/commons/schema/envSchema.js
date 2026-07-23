const envSchema = {
  type: "object",
  required: ["PORT", "WEBHOOK_SECRET", "LOG_LEVEL", "NODE_ENV"],
  properties: {
    PORT: {
      type: "integer",
      default: 8080,
    },
    WEBHOOK_SECRET: {
      type: "string",
    },
    LOG_LEVEL: {
      type: "string",
      default: "info",
    },
    NODE_ENV: {
      type: "string",
      enum: ["DEV", "PROD", "TEST"],
      default: "DEV",
    },
    DB_FILE_PATH: {
      type: "string",
    },
  },
  additionalProperties: true,
};

module.exports = envSchema;
