export const up = (knex) =>
  knex.schema.createTable('active_monitors', (table) => {
    table.integer('task_id').primary().references('id').inTable('tasks');
    table.timestamp('started_at').defaultTo(knex.fn.now());
  });

export const down = (knex) => knex.schema.dropTableIfExists('active_monitors');
