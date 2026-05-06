# Deployment Guide

## Cloudflare Workers + D1

The marketplace is designed to run on Cloudflare Workers with D1 (SQLite) as the database.

### Prerequisites

- Cloudflare account
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed (`npm install -g wrangler`)
- Node.js >= 18

### 1. Authenticate Wrangler

```bash
npx wrangler login
```

### 2. Create D1 Database

```bash
npx wrangler d1 create xbrowser-marketplace-db
```

This outputs a database ID. Add it to `wrangler.toml`:

```toml
name = "xbrowser-marketplace"
main = "dist/server/cloudflare.js"
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "DB"
database_name = "xbrowser-marketplace-db"
database_id = "your-database-id-here"
```

### 3. Run Migrations

Generate the migration SQL from the Drizzle schema:

```bash
npm run db:generate
```

Apply migrations to D1:

```bash
npx wrangler d1 execute xbrowser-marketplace-db --file=drizzle/0000_initial.sql
```

Or push directly:

```bash
npm run db:push
```

### 4. Build for Cloudflare

```bash
npm run build:cloudflare
```

This builds the React client and the server bundle optimized for Workers.

### 5. Deploy

```bash
npm run deploy:cf
```

Or manually:

```bash
npm run build:cloudflare && npx wrangler deploy
```

### 6. Seed Initial Data

After first deployment, seed categories via the D1 console or API:

```bash
npx wrangler d1 execute xbrowser-marketplace-db --command="
  INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES
  ('cat-1', 'Automation', 'automation', 'Browser automation plugins', 'bot', 1),
  ('cat-2', 'Scraping', 'scraping', 'Web scraping and data extraction', 'database', 2),
  ('cat-3', 'Testing', 'testing', 'Testing and QA plugins', 'check-circle', 3),
  ('cat-4', 'Productivity', 'productivity', 'Workflow and productivity tools', 'zap', 4);
"
```

## Local Development with SQLite

For local development, the app uses a local SQLite file:

```bash
# Set in .env
SQLITE_PATH=./data/marketplace.db

# Run migrations
npm run db:migrate

# Or push schema directly
npm run db:push
```

Start the development server:

```bash
npm run dev
```

The app runs at http://localhost:3010 with HMR.

## Environment Variables

| Variable            | Description                                  | Required      | Default                               |
| ------------------- | -------------------------------------------- | ------------- | ------------------------------------- |
| `SQLITE_PATH`       | Path to SQLite database file (local only)    | Local dev     | `:memory:`                            |
| `AUTH_SECRET_KEY`   | Secret key for JWT signing                   | Production    | `dev-secret-key-change-in-production` |
| `ENABLE_DEV_TOKENS` | Enable dev auth tokens (`admin-token`, etc.) | Never in prod | `false`                               |
| `NODE_ENV`          | Environment mode                             | Yes           | `development`                         |

### Cloudflare Workers

In `wrangler.toml`, set secrets via:

```bash
npx wrangler secret put AUTH_SECRET_KEY
```

Do NOT set `ENABLE_DEV_TOKENS` in production.

## Custom Domain

### via Cloudflare Dashboard

1. Go to Workers & Pages > your worker > Settings > Domains & Routes
2. Add a custom domain (e.g., `marketplace.xbrowser.dev`)
3. Cloudflare automatically provisions SSL

### via wrangler.toml

```toml
routes = [
  { pattern = "marketplace.xbrowser.dev", custom_domain = true }
]
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy Marketplace

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: npm test -- --run
      - name: Deploy to Cloudflare
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Monitoring

### Cloudflare Built-in

- **Analytics**: Workers & Pages > your worker > Metrics
- **Logs**: `npx wrangler tail` for real-time logs
- **Alerts**: Cloudflare dashboard > Notifications

### Health Check

The app exposes a health endpoint:

```bash
curl https://your-domain.com/health
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z","db":"connected"}
```

### Recommended Monitoring

- Uptime monitoring on `/health`
- Error rate tracking via Cloudflare analytics
- D1 database size monitoring (free tier: 5 GB)
- Rate limit monitoring on API endpoints

## Database Management

### Backup

```bash
npx wrangler d1 export xbrowser-marketplace-db --output=backup.sql
```

### Restore

```bash
npx wrangler d1 execute xbrowser-marketplace-db --file=backup.sql
```

### Local Database Inspection

```bash
npm run db:studio
```

Opens Drizzle Studio at http://localhost:4983.

## Troubleshooting

### Build Fails on Cloudflare

- Ensure `build:cloudflare` succeeds locally
- Check `wrangler.toml` configuration
- Verify Node.js compatibility date matches dependencies

### D1 Connection Issues

- Verify `database_id` in `wrangler.toml`
- Check D1 binding name matches `DB`
- Ensure migrations have been applied

### Auth Issues in Production

- `AUTH_SECRET_KEY` must be set via `wrangler secret put`
- `ENABLE_DEV_TOKENS` must NOT be set in production
- Dev tokens (`admin-token`, `user-token`) only work with `ENABLE_DEV_TOKENS=true`
