export const up = (knex) =>
  knex.schema.createTable('payment_profiles', (table) => {
    table.increments('id').primary();
    table.string('label', 100).notNullable();
    table.string('card_number', 20).notNullable();
    table.string('card_holder_name', 200).notNullable();
    table.string('expiration_month', 2).notNullable();
    table.string('expiration_year', 4).notNullable();
    table.string('cvv', 4).notNullable();
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTableIfExists('payment_profiles');
