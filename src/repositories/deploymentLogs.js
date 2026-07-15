const { DEPLOYMENT_LOGS } = require("../commons/model");

async function deploymentLogsRepo(knex) {
  async function createDeploymentLogs({ input }) {
    const query = knex(DEPLOYMENT_LOGS.NAME)
      .returning([DEPLOYMENT_LOGS.COLUMNS.ID])
      .insert(input);

    const result = await query;
    return result[0];
  }

  async function getDeploymentLogs({ where }) {
    const query = knex(DEPLOYMENT_LOGS.NAME);
    if (where) {
      query.where(where);
    }
    const result = await query;
    return result;
  }

  async function updateDeploymentLogs({ input, filter }) {
    const query = knex(DEPLOYMENT_LOGS.NAME);
    if (filter) {
      query.where(filter);
    }
    const result = await query.update(input);
    return result;
  }

  return {
    createDeploymentLogs,
    getDeploymentLogs,
    updateDeploymentLogs,
  };
}

module.exports = deploymentLogsRepo;
