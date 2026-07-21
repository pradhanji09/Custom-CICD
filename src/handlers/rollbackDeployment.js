const services = require("../services");

async function rollbackDeploymentHandler(request, reply) {
  const { project, environment } = request.params;
  const { knex } = request.server;

  const result = await services.rollbackDeploymentService(knex, {
    project,
    environment,
  });

  return reply.code(200).send(result);
}

module.exports = rollbackDeploymentHandler;
