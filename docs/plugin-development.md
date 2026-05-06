# Plugin Development Guide

This guide covers creating, testing, and publishing xbrowser plugins for the marketplace.

## Plugin Structure

A minimal xbrowser plugin:

```
my-plugin/
├── index.ts          # Plugin entry point (required)
├── package.json      # Package config (required)
└── README.md         # Documentation (recommended)
```

### index.ts

The plugin entry point must export a default function:

```typescript
import type { XCLIAPI } from 'xbrowser'

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  })

  site.command('scrape', {
    description: 'Scrape data from the page',
    handler: async (params, ctx) => {
      const { page } = ctx
      const data = await page.evaluate(() => {
        const items = document.querySelectorAll('.item')
        return Array.from(items).map(el => el.textContent)
      })
      return { data, tips: [] }
    },
  })
}
```

### package.json

Include xbrowser metadata in the `xbrowser` field:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A plugin for xbrowser",
  "main": "index.ts",
  "xbrowser": {
    "slug": "my-plugin",
    "commands": ["scrape"],
    "tags": ["automation", "scraping"],
    "sites": ["https://example.com"],
    "category": "automation",
    "license": "MIT",
    "repositoryUrl": "https://github.com/user/my-plugin",
    "homepageUrl": "https://my-plugin.dev"
  }
}
```

### xbrowser Metadata Fields

| Field           | Type     | Required | Description                                  |
| --------------- | -------- | -------- | -------------------------------------------- |
| `slug`          | string   | Yes      | Unique identifier (kebab-case, `[a-z0-9-]+`) |
| `commands`      | string[] | No       | List of commands the plugin provides         |
| `tags`          | string[] | No       | Tags for discovery                           |
| `sites`         | string[] | No       | Supported site URLs                          |
| `category`      | string   | No       | Primary category slug                        |
| `license`       | string   | No       | License identifier (default: `MIT`)          |
| `repositoryUrl` | string   | No       | Source repository URL                        |
| `homepageUrl`   | string   | No       | Plugin homepage URL                          |

## Creating a Plugin

### 1. Initialize

Create a new directory and add the required files:

```bash
mkdir my-plugin && cd my-plugin
```

Create `index.ts` with your plugin logic and `package.json` with xbrowser metadata.

### 2. Define Commands

Each command has a name, description, and handler:

```typescript
site.command('extract-prices', {
  description: 'Extract product prices from the current page',
  handler: async (params, ctx) => {
    const { page } = ctx
    const prices = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.price')).map(el =>
        parseFloat(el.textContent?.replace(/[^0-9.]/g, '') || '0')
      )
    })
    return { data: prices, tips: ['Found ' + prices.length + ' prices'] }
  },
})
```

### 3. Handle Parameters

Commands receive typed parameters:

```typescript
site.command('search', {
  description: 'Search for products',
  params: {
    query: { type: 'string', required: true },
    category: { type: 'string', required: false },
    maxResults: { type: 'number', required: false, default: 10 },
  },
  handler: async (params, ctx) => {
    const { query, maxResults = 10 } = params
    // ... implementation
    return { data: results, tips: [] }
  },
})
```

## Testing Locally

### Using xbrowser CLI

```bash
# Install the plugin locally
xbrowser plugin install ./path/to/my-plugin

# Run a command
xbrowser my-plugin scrape

# Or test the plugin directly
xbrowser plugin test ./path/to/my-plugin
```

### Manual Testing

Load your plugin via the xbrowser config:

```json
{
  "plugins": ["./path/to/my-plugin"]
}
```

Run xbrowser and verify your commands appear in the help output.

## Publishing

### Via CLI

```bash
# Login to the marketplace
xbrowser plugin login

# Publish the plugin
xbrowser plugin publish ./path/to/my-plugin
```

The CLI reads the `xbrowser` metadata from `package.json`, packages the plugin files, and uploads them to the marketplace.

New plugins start in `pending` status and require admin approval before appearing in search results.

### Updating a Plugin

Re-publish with an incremented version:

```bash
# Update version in package.json
# xbrowser.version: "1.1.0"

xbrowser plugin publish ./path/to/my-plugin
```

The marketplace detects the existing plugin by slug and creates a new version entry.

### Version Naming

Follow [semver](https://semver.org/):

- `1.0.0` → `1.0.1`: Bug fixes (patch)
- `1.0.0` → `1.1.0`: New features (minor)
- `1.0.0` → `2.0.0`: Breaking changes (major)

## Plugin Conventions

### Naming

- Plugin directory: `my-plugin` (kebab-case)
- Slug: matches directory name (`my-plugin`)
- Commands: kebab-case (`extract-prices`, `scrape-data`)
- Site names: kebab-case (`example-site`)

### Code Style

- TypeScript only (loaded via jiti at runtime)
- Named exports preferred (except default export for entry)
- No `any` types
- No `@ts-ignore`
- Each handler returns `{ data, tips }` shape

### Isolation

- Plugins run in isolated namespaces via `createSite()`
- Plugins communicate through the event system, not direct imports
- Use `ctx.storage` for state, not global variables
- Use `fail()` for errors, never `throw Error` in handlers

## Using the AI Skill

The marketplace provides an AI skill for plugin development. When using an AI coding assistant:

1. Describe what site you want to automate and what data to extract
2. The AI skill guides you through creating the plugin structure
3. It generates command handlers based on the site's DOM structure
4. It helps test and publish the plugin

Example prompt:

```
Create an xbrowser plugin for amazon.com that:
1. Searches for a product by keyword
2. Extracts the top 10 results with name, price, and rating
3. Saves results to a JSON file
```

## Review Process

After publishing, plugins go through admin review:

1. **Pending**: Submitted, awaiting review
2. **Approved**: Live on the marketplace, discoverable via search
3. **Rejected**: Needs changes (reason provided by admin)
4. **Removed**: Taken down (by author or admin)

### Approval Criteria

- Plugin follows naming conventions
- Commands work as described
- No security issues (no credential exfiltration, no malicious code)
- Reasonable code quality
- Accurate description and tags

### After Rejection

Fix the issues described in the rejection reason, bump the version, and re-publish.

## API Access

For programmatic access to the marketplace:

```bash
# Get an API key
xbrowser plugin login

# Search plugins
curl https://marketplace.xbrowser.dev/api/plugins/search?q=automation

# Get plugin details
curl https://marketplace.xbrowser.dev/api/plugins/my-plugin

# Install via API
curl -X POST https://marketplace.xbrowser.dev/api/plugins/my-plugin/install
```

See [api.md](api.md) for the complete API reference.
