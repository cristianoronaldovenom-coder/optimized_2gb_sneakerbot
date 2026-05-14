export default {
  development: {
    client: 'better-sqlite3',
    connection: { filename: './data/sneakerbot.db' },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
    migrations: { directory: './db/migrations' },
    seeds: { directory: './db/seeds' }
  },
  production: {
    client: 'better-sqlite3',
    connection: { filename: './data/sneakerbot.db' },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
    migrations: { directory: './db/migrations' },
    seeds: { directory: './db/seeds' }
  }
}
