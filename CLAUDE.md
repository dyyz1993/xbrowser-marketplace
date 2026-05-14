# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

XBrowser Plugin Marketplace - A full-stack React + Hono application for managing browser plugins, with admin dashboard, user authentication, and real-time notifications.

## Commands

```bash
npm run dev          # Start Vite dev server on port 3010 with Hono backend
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run all Vitest tests
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests only
npm run lint         # Run ESLint
npm run format       # Run Prettier format
npm run typecheck    # Run TypeScript type check
```

## Architecture Overview

**Monorepo-style structure** with client/admin/server separation and shared types:

```
src/
├── client/          # React frontend (user-facing marketplace)
│   ├── components/  # UI components
│   ├── stores/      # Zustand state management
│   ├── services/    # API clients (apiClient)
│   ├── hooks/       # Custom hooks
│   ├── pages/       # Page components
│   └── App.tsx
├── admin/           # React admin dashboard (Ant Design)
│   ├── components/  # Admin UI components
│   ├── layouts/     # Admin layout
│   ├── pages/       # Admin pages
│   ├── stores/      # Admin state management
│   ├── services/    # Admin API client with interceptors
│   └── App.tsx
├── server/          # Hono backend
│   ├── module-plugin/        # Plugin management module
│   ├── module-auth/          # Authentication module
│   ├── module-permission/    # Permission & role module
│   ├── module-notification/  # SSE notifications module
│   ├── module-order/         # Order management module
│   ├── module-ticket/        # Support ticket module
│   ├── module-dispute/       # Dispute management module
│   ├── module-content/       # Content management module
│   ├── module-file/          # File storage module
│   ├── module-admin/         # Admin API module
│   ├── module-captcha/       # Captcha module
│   ├── core/                 # Core services (runtime, realtime)
│   ├── middleware/           # Middleware (auth, cors, logger)
│   ├── test-utils/           # Test utilities
│   └── entries/              # Entry points (node.ts, cloudflare.ts)
├── shared/              # Shared types
│   ├── core/            # Framework layer (sse-client, api-schemas, protocol-types)
│   ├── modules/         # Business layer (plugins, admin, permission, notifications schemas)
│   └── schemas/         # Unified exports
└── cli/                 # CLI RPC client
    ├── modules/         # CLI command modules
    └── rpc/             # RPC client
```

**Path Aliases** (configured in vite.config.ts and tsconfig.json):

- `@shared/*` → src/shared/\*
- `@client/*` → src/client/\*
- `@server/*` → src/server/\*
- `@admin/*` → src/admin/\*

## Key Technical Concepts

### Multi-Entry Architecture

| Entry       | File                  | HTML         | Path       |
| ----------- | --------------------- | ------------ | ---------- |
| Marketplace | `src/client/main.tsx` | `index.html` | `/`        |
| Admin       | `src/admin/main.tsx`  | `admin.html` | `/admin/*` |

### Single-Port Development

Uses "@hono/vite-dev-server" to run both frontend and backend on port 3010:

- No CORS issues in development
- Type safety across the boundary
- Simplified developer experience

### Hono RPC

Type-safe API calls from frontend to backend:

```typescript
import { apiClient } from '@client/services/apiClient'

// HTTP API - Plugin listing
const response = await apiClient.api.plugins.$get()
const result = await response.json()

// SSE - Real-time notifications
const conn = await apiClient.api.notifications.stream.$sse()
conn.on('notification', n => console.log(n))
```

### Real-time Features

| Feature  | Method              | Type Safety | Testing          |
| -------- | ------------------- | ----------- | ---------------- |
| HTTP API | `$get()`, `$post()` | ✅          | No server needed |
| SSE      | `$sse()`            | ✅          | No server needed |

### Module Pattern

Backend organized by feature modules:

```
module-{feature}/
├── routes/         # API endpoints (Hono RPC)
├── services/      # Business logic
└── __tests__/     # Unit tests
```

### Framework Layer vs Business Layer

**Framework Layer** (`src/shared/core/`):

- Generic, reusable infrastructure code
- Examples: `sse-client.ts`, `api-schemas.ts`, `protocol-types.ts`
- Should not be modified by business code directly

**Business Layer** (`src/shared/modules/`):

- Business-specific schemas and protocols
- Examples: `plugins/`, `admin/`, `permission/`, `notifications/`
- Organized by feature modules

### Module Dependency Graph

```
plugin ──── (standalone)
auth ──── (standalone)
permission ── (standalone, foundational)
notification ── (standalone)
file ──── (standalone)
captcha ── (standalone)
admin ──→ permission + notifications
order ──→ permission
ticket ──→ permission
dispute ──→ permission
content ──→ permission
```

### State Management with Zustand

Global application state in `src/client/stores/` and `src/admin/stores/`:

- **Minimal Re-renders**: Use precise selector hooks
- **Selector Pattern**: `const stats = useAdminStore((state) => state.stats)`
- **Action Selectors**: Stable function references

### Admin Dashboard (Ant Design)

Admin module uses **Ant Design** as UI library, located at `src/admin/`:

- Separate entry (`admin.html`) mounted at `/admin/*`
- Own stores, services, and components
- Uses extended `apiClient` with request interceptors (loading, auth, error handling)

### Testing Strategy

- **Unit Tests**: `__tests__/*.test.ts` (jsdom for client, node for server)
- **Integration Tests**: `src/server/__tests__/integration/*.test.ts`
- **E2E Tests**: `tests/e2e/*.spec.ts` (Playwright)
- **SSE Tests**: No server needed (`$sse()` works with `app.fetch()`)

## Important Conventions

### Import Path Aliases

Always use path aliases instead of relative imports:

```typescript
import { PluginListItem } from '@shared/schemas'
import { useAdminStore } from '@admin/stores/adminStore'
```

### Environment Variables

Required variables (see `.env.example`):

```bash
API_BASE_URL=http://localhost:3010
```

### Module Creation

To add a new feature module:

1. Create `src/server/module-{feature}/`
2. Add routes, services, tests
3. Register in `src/server/app.ts`
4. Add shared schemas in `src/shared/modules/{feature}/`
5. Add client store if needed
6. Add integration tests

### API Route Pattern

Use Hono RPC with chain syntax:

```typescript
app.openapi(listRoute, async c => {
  const plugins = await pluginService.listPlugins()
  return c.json({ success: true, data: plugins })
})
```

### SSE Pattern

Use `$sse()` method for type-safe SSE:

```typescript
// Server: Define protocol in src/shared/modules/notifications/
import { AppSSEProtocolSchema } from '@shared/schemas'

// Client: Use $sse()
const conn = await apiClient.api.notifications.stream.$sse()
conn.on('notification', n => console.log(n))
conn.on('ping', p => console.log(p.timestamp))
```

### SSE Broadcast Pattern

When creating notifications, broadcast to all connected SSE clients:

```typescript
import { createNotificationAndBroadcast } from '@server/module-notification/services/notification-service'

const notification = await createNotificationAndBroadcast(input)
```

## Project Rules

See `.claude/rules/` for detailed development constraints.

## Documentation

- `README.md` - User-facing feature overview
- `DESIGN.md` - Technical architecture
- `QUICKSTART.md` - Quick start guide
