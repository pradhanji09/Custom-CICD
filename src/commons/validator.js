const Ajv = require("ajv");

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
});

module.exports = ajv;
