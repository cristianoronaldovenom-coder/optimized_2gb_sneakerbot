export const up = (knex) =>
  knex.schema.createTable('addresses', (table) => {
    table.increments('id').primary();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('address1', 255).notNullable();
    table.string('address2', 255).defaultTo('');
    table.string('city', 100).notNullable();
    table.string('state', 50).notNullable();
    table.string('zip', 20).notNullable();
    table.string('country', 100).notNullable().defaultTo('US');
    table.string('phone', 30).notNullable();
    table.string('email', 255).notNullable();
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTableIfExists('addresses');
