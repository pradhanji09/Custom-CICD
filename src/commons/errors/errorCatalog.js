const CustomError = require("./customError");
const CutomError = require("./customError");

const Errors = {
  SignatureMissing: () =>
    CustomError.badRequest({
      message: "Missing signature header",
      errorCode: "MISSING_SIGNATURE_HEADER",
    }),

  InvalidSignature: () =>
    CustomError.unauthorized({
      message: "Invalid Signature",
      errorCode: "INVALID_SIGNATURE",
    }),

  UnkownDeploymentType: (type) =>
    CustomError.badRequest({
      message: `Unkown deployment type: ${type}`,
      errorCode: "UNKOWN_DEPLOYMENT_TYPE",
    }),

  InvalidCurrentSlot: (slot) =>
    CustomError.internal({
      message: `Invalid current slot: ${slot}`,
      errorCode: "INVALID_CURRENT_SLOT",
    }),

  FailedToReadCurrentSlot: (stderr) =>
    CustomError.internal({
      message: `Failed to read current slot: ${stderr}`,
      errorCode: "FAILED_TO_READ_CURRENT_SLOT",
    }),

  MissingTemplateVariable: (key, template) =>
    CustomError.internal({
      message: `Missing template variable "${key}" for: ${template}`,
      errorCode: "MISSING_TEMPLATE_VARIABLE",
    }),

  UnknownPort: (port) =>
    CustomError.badRequest({
      message: `UnknowN Port: ${port}`,
      errorCode: "UNKNOW_PORT",
    }),

  NoPreviousDeployment: (project, environment) =>
    CustomError.notFound({
      message: `No previous deployment found for project: ${project} and environment: ${environment}`,
      errorCode: "NO_PREVIOUS_DEPLOYMENT",
    }),
};

module.exports = Errors;
