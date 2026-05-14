export const up = (knex) =>
  knex.schema.createTable('proxies', (table) => {
    table.increments('id').primary();
    table.string('host', 255).notNullable();
    table.integer('port').notNullable();
    table.string('username', 255).defaultTo('');
    table.string('password', 255).defaultTo('');
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTableIfExists('proxies');
