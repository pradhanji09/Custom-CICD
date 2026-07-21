const services = require("../services");

async function rollbackDeploymentHandler(request, reply) {
  const { project, environment } = request.params;
  const { knex } = request.server;

  await services.rollbackDeploymentService(knex, { project, environment });

  return reply.code(200).send();
}

module.exports = rollbackDeploymentHandler;
