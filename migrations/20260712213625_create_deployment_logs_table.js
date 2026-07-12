exports.up = function (knex) {
  return knex.schema.createTable("deployment_logs", (table) => {
    table.increments("id").primary();
    table.text("deployment_id").notNullable();
    table.text("step").notNullable();
    table.text("command");
    table.text("status").notNullable();
    table.text("error");
    table.dateTime("started_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("completed_at");

    table.foreign("deployment_id").references("deployment.deployment_id");
    table.index("deployment_id");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("deployment_logs");
};
