require("dotenv").config();
const ajv = require("../commons/validator");
const envSchema = require("../commons/schema/envSchema");

const validateEnv = ajv.compile(envSchema);

const isValid = validateEnv(process.env);

if (!isValid) {
  console.error(JSON.stringify(validateEnv.errors, null, 2));
  process.exit(1);
}

module.exports = {
  PORT: process.env.PORT,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  LOG_LEVEL: process.env.LOG_LEVEL,
  NODE_ENV: process.env.NODE_ENV,
};
