export const seed = async (knex) => {
  await knex('settings').del();
  await knex('settings').insert([
    { key: 'webhook_url', value: '' },
    { key: 'captcha_api_key', value: '' },
    { key: 'discord_webhook_url', value: '' }
  ]);
};
