# SneakerBot

SneakerBot is a Node.js/Express API that automates checkout on various sneaker websites using Puppeteer. The bot supports Footsites, Shopify, Demandware, Nike.com, and Supreme. It exposes REST endpoints for managing addresses, proxies, and tasks.

## Tech Stack

- **Framework:** Express 4
- **Database:** PostgreSQL via Knex.js
- **Browser automation:** Puppeteer / puppeteer-extra (with stealth)
- **Validation:** Joi + express-validation
- **Notifications:** Nodemailer (email) and HTTP webhooks
- **Logging:** Winston

## Project Structure

- `app.js` — Express entry point
- `routes/index.js` — Top-level router mounted at `/v1`
- `api/` — Route handlers (Addresses, Proxies, Tasks, Logs, Settings)
- `db/` — Knex setup, migrations, seeds
- `helpers/` — Shared utilities (logger, cluster, captcha, email, webhook, states, task-cache, validation-handler)
- `sites/` — Per-site checkout automation (footsites, shopify, demandware, nike, supremenewyork)
- `scripts/start-task.js` — CLI and programmatic task runner
- `__tests__/` — Integration tests (Jest + supertest + knex-mock-client)

## API Endpoints

### Addresses `/v1/addresses`
- `GET /` — List all addresses
- `GET /:id` — Get one address
- `POST /` — Create address
- `PATCH /:id` — Update address
- `DELETE /:id` — Soft-delete address

### Proxies `/v1/proxies`
- `GET /` — List all proxies
- `GET /:id` — Get one proxy
- `POST /` — Create proxy
- `PATCH /:id` — Update proxy
- `DELETE /:id` — Soft-delete proxy

### Tasks `/v1/tasks`
- `GET /` — List all tasks
- `GET /:id` — Get one task
- `POST /` — Create task
- `PATCH /:id` — Update task
- `DELETE /:id` — Soft-delete task
- `POST /:id/start` — Start task (launches Puppeteer)
- `POST /:id/stop` — Stop task (closes Puppeteer page)

### Logs `/v1/logs`
- `GET /` — List all logs
- `GET /:id` — Get one log
- `GET /task/:taskId` — Get logs for a task
- `DELETE /:id` — Delete log

### Payment Profiles `/v1/payment-profiles`
- `GET /` — List all payment profiles
- `GET /:id` — Get one payment profile
- `POST /` — Create payment profile (Joi credit card validation)
- `PATCH /:id` — Update payment profile
- `DELETE /:id` — Soft-delete payment profile

### Settings `/v1/settings`
- `GET /` — List all settings
- `GET /:key` — Get one setting
- `PUT /:key` — Upsert a setting

## Supported Sites (site_id)
| site_id | Site                           |
|---------|--------------------------------|
| 1       | Footsites                      |
| 2       | Shopify                        |
| 3       | Demandware                     |
| 4       | Nike                           |
| 5       | Supreme NY                     |
| 6       | Pokemon Center Canada (en-ca)  |

## Database

- The Replit-managed PostgreSQL database is used. `knexfile.js` reads `DATABASE_URL` (with `PG*` fallbacks), so no manual `.env` is required for the database.

## Settings Keys

| Key                   | Description               |
|-----------------------|---------------------------|
| `webhook_url`         | HTTP webhook for alerts   |
| `captcha_api_key`     | 2Captcha API key          |
| `discord_webhook_url` | Discord webhook URL       |

## Running

```bash
npm start         # Production
npm run dev       # Development (file watch)
npm run migrate   # Run DB migrations
npm run seed      # Seed DB
npm test          # Run tests
```
