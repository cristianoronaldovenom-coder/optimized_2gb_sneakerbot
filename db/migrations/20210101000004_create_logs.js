export const up = (knex) =>
  knex.schema.createTable('logs', (table) => {
    table.increments('id').primary();
    table.integer('task_id').references('id').inTable('tasks');
    table.string('level', 20).notNullable().defaultTo('info');
    table.text('message').notNullable();
    table.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTableIfExists('logs');
