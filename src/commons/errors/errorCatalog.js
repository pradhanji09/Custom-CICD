const CutomError = require("./customError");

const ErrorCatalog = {
  NOT_AVAILABLE: () =>
    AppError.badRequest({
      message: "Sorry, all tickets have been booked",
      errorCode: "TICKET_NOT_AVAILABLE",
    }),
};

module.exports = ErrorCatalog;
