export const up = (knex) =>
  knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.string('url', 2048).notNullable();
    table.integer('site_id').notNullable();
    table.integer('billing_address_id').references('id').inTable('addresses');
    table.integer('shipping_address_id').references('id').inTable('addresses');
    table.string('notification_email_address', 255).defaultTo('');
    table.boolean('has_been_used').notNullable().defaultTo(false);
    table.boolean('auto_solve_captchas').notNullable().defaultTo(true);
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTableIfExists('tasks');
