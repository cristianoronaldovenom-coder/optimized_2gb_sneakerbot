export const up = (knex) =>
  knex.schema.alterTable('tasks', (table) => {
    table.integer('payment_profile_id').references('id').inTable('payment_profiles').nullable();
    table.string('size', 20).defaultTo('').nullable();
    table.string('style', 50).defaultTo('').nullable();
    table.string('coupon_code', 100).defaultTo('').nullable();
  });

export const down = (knex) =>
  knex.schema.alterTable('tasks', (table) => {
    table.dropColumn('payment_profile_id');
    table.dropColumn('size');
    table.dropColumn('style');
    table.dropColumn('coupon_code');
  });
