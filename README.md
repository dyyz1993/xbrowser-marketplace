# xbrowser Plugin Marketplace

A full-stack plugin marketplace for [xbrowser](https://github.com/nicepkg/xbrowser) — the browser automation framework. Developers can publish, discover, search, and install xbrowser plugins through a web UI, REST API, or CLI.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare Edge                   │
│  ┌───────────────┐  ┌──────────────────────────┐    │
│  │  React SPA    │  │  Hono API (CF Workers)   │    │
│  │  Vite + TW4   │  │  OpenAPI + Zod validation │    │
│  └───────┬───────┘  └────────────┬─────────────┘    │
│          │                       │                   │
│          │         ┌─────────────┴────────────┐      │
│          │         │        D1 (SQLite)        │      │
│          │         │  plugins · versions ·     │      │
│          │         │  reviews · categories     │      │
│          │         └──────────────────────────┘      │
└──────────┼───────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │  xbrowser   │
    │  CLI client │
    └─────────────┘
```

**Tech stack:** Hono + OpenAPI Zod (backend), React + Vite + TailwindCSS v4 (frontend), Drizzle ORM + SQLite/D1 (database), Cloudflare Workers (deployment).

## Features

- Plugin discovery with search, filtering by category/tag/site, and sorting
- Plugin detail pages with versions, reviews, and ratings
- Developer registration, authentication, and API keys
- Plugin publishing via multipart upload or CLI (`xbrowser plugin publish`)
- Admin dashboard with approve/reject workflow, bulk operations, and category management
- Install tracking and marketplace statistics
- CLI integration: `xbrowser plugin search`, `xbrowser plugin install`, `xbrowser plugin publish`
- Cloudflare Workers + D1 deployment with local SQLite development

## Quick Start

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
git clone <repo-url> xbrowser-marketplace
cd xbrowser-marketplace
npm install
```

### Local Development

```bash
npm run dev
```

The application starts at http://localhost:3010 with hot module replacement for both frontend and backend.

### Environment Variables

Copy `.env.example` to `.env`:

```env
SQLITE_PATH=./data/marketplace.db
AUTH_SECRET_KEY=your-secret-key
ENABLE_DEV_TOKENS=true
NODE_ENV=development
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test                  # Unit tests (watch mode)
npm test -- --run         # Single run
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests (Playwright)
npm run test:coverage     # Coverage report
```

### Linting & Type Checking

```bash
npm run lint
npm run typecheck
npm run format
```

## API Overview

All API endpoints are under `/api/`.

| Area | Method | Endpoint | Auth |
|------|--------|----------|------|
| Auth | POST | `/api/auth/register` | No |
| Auth | POST | `/api/auth/login` | No |
| Auth | GET | `/api/auth/verify` | Yes |
| Plugins | GET | `/api/plugins` | No |
| Plugins | GET | `/api/plugins/search` | No |
| Plugins | GET | `/api/plugins/{slug}` | No |
| Plugins | POST | `/api/plugins` | Yes |
| Plugins | PUT | `/api/plugins/{slug}` | Yes |
| Plugins | DELETE | `/api/plugins/{slug}` | Yes |
| Plugins | POST | `/api/plugins/publish` | Yes |
| Plugins | POST | `/api/plugins/{slug}/install` | No |
| Plugins | POST | `/api/plugins/{slug}/reviews` | Yes |
| Categories | GET | `/api/categories` | No |
| Categories | GET | `/api/categories/{slug}/plugins` | No |
| Stats | GET | `/api/stats` | No |
| Admin | GET | `/api/admin/stats/dashboard` | Admin |
| Admin | GET | `/api/admin/plugins/pending` | Admin |
| Admin | PUT | `/api/admin/plugins/{slug}/approve` | Admin |
| Admin | PUT | `/api/admin/plugins/{slug}/reject` | Admin |

See [docs/api.md](docs/api.md) for complete API documentation.

## Deployment

See [docs/deployment.md](docs/deployment.md) for Cloudflare Workers + D1 deployment instructions.

## Plugin Development

See [docs/plugin-development.md](docs/plugin-development.md) for a guide on creating and publishing xbrowser plugins.

## Project Structure

```
src/
├── client/              # React frontend
│   ├── components/      # UI components (PluginCard, SearchBar, etc.)
│   ├── pages/           # Page components (Home, Search, PluginDetail, etc.)
│   ├── services/        # API client (plugin-api.ts, apiClient.ts)
│   └── stores/          # Zustand state management
├── server/              # Hono backend
│   ├── module-plugin/   # Plugin CRUD, search, publish, admin
│   ├── module-auth/     # Registration, login, API keys
│   ├── module-admin/    # Admin dashboard, user management
│   ├── module-file/     # File upload/download
│   ├── module-permission/ # RBAC permission system
│   ├── db/              # Drizzle schema, migrations, test setup
│   ├── middleware/       # Auth, CORS, rate limiting, captcha
│   └── entries/         # Entry points (node.ts, cloudflare.ts)
├── shared/              # Shared types and schemas
│   ├── core/            # Framework utilities
│   └── modules/         # Business schemas (plugins, permissions)
├── cli/                 # CLI tool source
└── admin/               # Admin panel source
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and ensure tests pass: `npm run typecheck && npm run lint && npm test -- --run`
4. Commit with conventional format: `feat(scope): description`
5. Push and create a pull request

### Commit Convention

```
<type>(<scope>): <description>
```

- **type**: `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `style`
- **scope**: `marketplace` | `api` | `admin` | `deps` (optional)
- **description**: concise, explains "why" not "what"

## License

MIT
