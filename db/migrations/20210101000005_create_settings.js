export const up = (knex) =>
  knex.schema.createTable('settings', (table) => {
    table.increments('id').primary();
    table.string('key', 100).notNullable().unique();
    table.text('value').defaultTo('');
    table.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTableIfExists('settings');
