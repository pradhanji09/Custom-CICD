const crypto = require("crypto");
const Errors = require("../errors/errorCatalog");

function verifySignature(request, reply) {
  const signatureHeader = request.headers["x-hub-signature-256"];
  if (!signatureHeader) throw Errors.SignatureMissing();

  const { rawBody } = request;

  const incomingSignature = signatureHeader.replace("sha256=", "");
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const trustedBuffer = Buffer.from(expectedSignature, "hex");
  const untrustedBuffer = Buffer.from(incomingSignature, "hex");

  if (
    trustedBuffer.length !== untrustedBuffer.length ||
    !crypto.timingSafeEqual(trustedBuffer, untrustedBuffer)
  )
    throw Errors.InvalidSignature();
}

module.exports = {
  verifySignature,
};
