const crypto = require("crypto");

function verifySignature(request, reply) {
  const signatureHeader = request.headers["x-hub-signature-256"];
  if (!signatureHeader) {
    request.log.warn("Missing signature header");
    return reply.code(401).send({ error: "Unauthorized: Missing Signature" });
  }

  const incomingSignature = signatureHeader.replace("sha256=", "");
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(rawText)
    .digest("hex");

  const trustedBuffer = Buffer.from(expectedSignature, "hex");
  const untrustedBuffer = Buffer.from(incomingSignature, "hex");

  if (
    trustedBuffer.length !== untrustedBuffer.length ||
    !crypto.timingSafeEqual(trustedBuffer, untrustedBuffer)
  ) {
    request.log.warn("Invalid signature match");
    return reply.code(401).send({ error: "Unauthorized: Invalid Signature" });
  }
}

module.exports = {
  verifySignature,
};
