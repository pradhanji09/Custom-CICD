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
};

module.exports = Errors;
