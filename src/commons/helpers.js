const formatValidationMessage = (err) => {
  if (!err.validation?.length) return "Invalid request";
  const first = err.validation[0];
  const field = first.instancePath?.replace("/", "") || "field";
  return `${field} ${first.message}`;
};

module.exports = formatValidationMessage;
