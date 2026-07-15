exports.up = function (knex) {
  return knex.schema.createTable("deployment", (table) => {
    table.text("deployment_id").primary().defaultTo(knex.fn.uuid());
    table.text("project").notNullable();
    table.text("environment").notNullable();
    table.text("branch").notNullable();
    table.text("commit_hash").notNullable();
    table.text("deployment_type").notNullable();
    table.text("trigger_type").notNullable();
    table.text("status").notNullable();
    table.dateTime("started_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("completed_at");

    table.index(["project", "environment"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("deployment");
};
