const fp = require("fastify-plugin");

async function contentTypeParser(fastify) {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (request, body, done) => {
      //Attach the unparsed string to the request object
      request.rawBody = body;

      //Parse the body and return it
      try {
        const json = JSON.parse(body);
        done(null, json);
      } catch (err) {
        err.statusCode = 400;
        done(err, undefined);
      }
    },
  );
}

module.exports = fp(contentTypeParser);
