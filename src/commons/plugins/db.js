const knex = require("knex");
const fp = require("fastify-plugin");
const config = require("../../config/knex");

module.exports = fp(async (fastify) => {
  const db = knex(config);

  fastify.decorate("knex", db);

  fastify.addHook("onClose", async (instance) => {
    instance.log.info("Closing database connection...");
    await db.destroy();
  });
});
