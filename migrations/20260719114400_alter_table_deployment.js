exports.up = function (knex) {
  return knex.schema.alterTable("deployment", (table) => {
    table.text("failed_step").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("deployment", (table) => {
    table.dropColumn("failed_step");
  });
};
