const { Knex } = require("knex");
const { DEPLOYMENT, DEPLOYMENT_LOGS } = require("../commons/model");

/**
 * @param {Knex} knex
 */
function deploymentRepo(knex) {
  async function createDeployment({ input }) {
    const query = knex(DEPLOYMENT.NAME)
      .returning([DEPLOYMENT.COLUMNS.DEPLOYMENT_ID])
      .insert(input);

    const result = await query;
    return result[0];
  }

  async function getDeployment({ where, whereIn }) {
    const query = knex(DEPLOYMENT.NAME);
    if (where) {
      query.where(where);
    }

    if (whereIn) {
      query.whereIn(whereIn.column, whereIn.values);
    }

    const result = await query;
    return result;
  }

  async function updateDeployment({ input, filter }) {
    const query = knex(DEPLOYMENT.NAME);
    if (filter) {
      query.where(filter);
    }
    const result = await query.update(input);
    return result;
  }

  async function getDeploymentWithLogs({ input }) {
    const { deployment_id } = input;
    const query = knex(DEPLOYMENT.NAME)
      .join(DEPLOYMENT_LOGS.NAME)
      .on(
        DEPLOYMENT.COLUMNS.DEPLOYMENT_ID,
        DEPLOYMENT_LOGS.COLUMNS.DEPLOYMENT_ID,
      )
      .where(DEPLOYMENT.COLUMNS.DEPLOYMENT_ID, deployment_id);

    const result = await query;
    return result;
  }

  return {
    createDeployment,
    getDeployment,
    updateDeployment,
    getDeploymentWithLogs,
  };
}

module.exports = deploymentRepo;
