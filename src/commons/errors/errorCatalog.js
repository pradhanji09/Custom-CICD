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
};

module.exports = Errors;
