export const up = (knex) =>
  knex.schema.alterTable('tasks', (table) => {
    table.string('keywords', 500).defaultTo('').nullable();
  });

export const down = (knex) =>
  knex.schema.alterTable('tasks', (table) => {
    table.dropColumn('keywords');
  });
