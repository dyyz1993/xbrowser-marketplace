# API Reference

All endpoints are served under `/api`. The API uses JSON for request/response bodies unless noted otherwise. Authentication uses Bearer tokens in the `Authorization` header.

## Authentication

### POST /api/auth/register

Register a new developer account.

**Request:**
```json
{
  "email": "dev@example.com",
  "username": "developer",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "username": "developer",
    "email": "dev@example.com",
    "role": "user",
    "createdAt": 1715000000000
  }
}
```

**Error (409):** Email or username already exists.

---

### POST /api/auth/login

Authenticate and receive a token.

**Request:**
```json
{
  "email": "dev@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "jwt-or-api-key-token",
    "user": {
      "id": "uuid-string",
      "username": "developer",
      "email": "dev@example.com",
      "role": "user"
    }
  }
}
```

**Error (401):** Invalid credentials.

---

### GET /api/auth/verify

Verify the current token is valid.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "username": "developer",
    "email": "dev@example.com",
    "role": "user",
    "createdAt": 1715000000000
  }
}
```

**Error (401):** Invalid or missing token.

---

## Plugins

### GET /api/plugins

List plugins with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | string | `"1"` | Page number |
| `limit` | string | `"20"` | Items per page (max 50) |
| `status` | string | `"approved"` | Filter by status: `pending`, `approved`, `rejected`, `removed` |
| `category` | string | - | Filter by category slug |
| `tag` | string | - | Filter by tag name |
| `sort` | string | `"newest"` | Sort: `newest`, `popular`, `most_downloaded`, `name` |
| `featured` | string | - | Filter featured: `"true"` or `"false"` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "My Plugin",
        "slug": "my-plugin",
        "description": "A helpful plugin",
        "authorName": "developer",
        "version": "1.0.0",
        "status": "approved",
        "downloadCount": 42,
        "viewCount": 128,
        "featured": false,
        "screenshotUrl": null,
        "tags": ["automation", "scraping"],
        "siteUrls": ["example.com"],
        "commands": ["scrape", "extract"],
        "createdAt": 1715000000000,
        "updatedAt": 1715000000000,
        "avgRating": 4.5,
        "reviewCount": 10
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /api/plugins/search

Full-text search across plugin names, descriptions, and tags.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (min 1 char) |
| `tag` | string | No | Additional tag filter |
| `site` | string | No | Site URL filter |
| `category` | string | No | Category slug filter |
| `page` | string | No | Page number (default `"1"`) |
| `limit` | string | No | Items per page (default `"20"`) |

**Response (200):** Same shape as `GET /api/plugins`.

---

### GET /api/plugins/{slug}

Get detailed plugin information by slug. Increments the view count.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Plugin",
    "slug": "my-plugin",
    "description": "A helpful plugin for automation",
    "authorName": "developer",
    "authorId": "user-uuid",
    "version": "1.0.0",
    "status": "approved",
    "downloadCount": 42,
    "viewCount": 129,
    "featured": false,
    "screenshotUrl": null,
    "tags": ["automation"],
    "siteUrls": ["example.com"],
    "commands": ["scrape"],
    "createdAt": 1715000000000,
    "updatedAt": 1715000000000,
    "avgRating": 4.5,
    "reviewCount": 10,
    "readme": "# My Plugin\n\nDetailed documentation...",
    "repositoryUrl": "https://github.com/user/my-plugin",
    "homepageUrl": "https://my-plugin.dev",
    "npmPackage": null,
    "license": "MIT",
    "categories": [
      { "id": "cat-uuid", "name": "Automation", "slug": "automation" }
    ],
    "versions": [
      {
        "id": "ver-uuid",
        "version": "1.0.0",
        "changelog": "Initial release",
        "publishedAt": 1715000000000
      }
    ]
  }
}
```

**Error (404):** Plugin not found.

---

### GET /api/plugins/{slug}/versions

List all published versions of a plugin.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ver-uuid",
      "version": "1.0.0",
      "changelog": "Initial release",
      "packageUrl": "tarball://my-plugin/1.0.0",
      "fileSize": 10240,
      "checksum": "sha256-hash",
      "status": "approved",
      "publishedAt": 1715000000000
    }
  ]
}
```

---

### POST /api/plugins

Create a new plugin (requires authentication). The plugin starts in `pending` status awaiting admin review.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "My Plugin",
  "slug": "my-plugin",
  "description": "A helpful plugin for browser automation",
  "readme": "# My Plugin\n\nDocumentation here...",
  "repositoryUrl": "https://github.com/user/my-plugin",
  "homepageUrl": "https://my-plugin.dev",
  "npmPackage": null,
  "license": "MIT",
  "version": "1.0.0",
  "siteUrls": ["https://example.com"],
  "tags": ["automation", "scraping"],
  "commands": ["scrape", "extract"],
  "screenshotUrl": null
}
```

**Response (201):** Returns the full plugin detail.

**Error (409):** Plugin slug already exists.

---

### PUT /api/plugins/{slug}

Update an existing plugin (author only).

**Headers:** `Authorization: Bearer <token>`

**Request:** All fields are optional (partial update):
```json
{
  "name": "My Updated Plugin",
  "description": "Updated description",
  "tags": ["automation", "scraping", "new-tag"]
}
```

**Response (200):** Returns updated plugin detail.

---

### DELETE /api/plugins/{slug}

Soft-delete a plugin by setting status to `removed` (author only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid" }
}
```

---

### POST /api/plugins/publish

Publish a plugin via multipart form upload (requires authentication). Creates a new plugin or updates an existing one.

**Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metadata` | File (JSON) | Yes | Plugin metadata (see below) |
| `files` | File(s) | No | Plugin source files |
| `checksum` | string | No | SHA-256 checksum |

**Metadata JSON:**
```json
{
  "name": "My Plugin",
  "slug": "my-plugin",
  "version": "1.0.0",
  "description": "A helpful plugin",
  "author": "developer",
  "commands": ["scrape"],
  "tags": ["automation"],
  "sites": ["https://example.com"],
  "license": "MIT",
  "homepageUrl": "https://my-plugin.dev",
  "repositoryUrl": "https://github.com/user/my-plugin",
  "npmPackage": null
}
```

**Response (201):** Returns the published plugin detail.

---

### POST /api/plugins/{slug}/versions

Publish a new version of an existing plugin (author only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "version": "1.1.0",
  "changelog": "Added new feature X"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "ver-uuid",
    "version": "1.1.0",
    "changelog": "Added new feature X",
    "packageUrl": "tarball://my-plugin/1.1.0",
    "fileSize": null,
    "checksum": null,
    "status": "pending",
    "publishedAt": 1715000000000
  }
}
```

---

### GET /api/plugins/{slug}/tarball

Get download info for the latest version tarball.

**Response (200):**
```json
{
  "success": true,
  "data": { "url": "tarball://my-plugin/1.0.0" }
}
```

---

### POST /api/plugins/{slug}/install

Track a plugin installation (increments download count).

**Response (200):**
```json
{
  "success": true,
  "data": { "downloadCount": 43 }
}
```

---

### POST /api/plugins/{slug}/reviews

Submit a review for a plugin (requires authentication).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "rating": 5,
  "title": "Great plugin!",
  "content": "Very useful for my automation needs."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "review-uuid",
    "pluginId": "plugin-uuid",
    "userId": "user-uuid",
    "userName": "reviewer",
    "rating": 5,
    "title": "Great plugin!",
    "content": "Very useful for my automation needs.",
    "createdAt": 1715000000000
  }
}
```

---

### GET /api/plugins/{slug}/reviews

List reviews for a plugin.

**Query Parameters:**

| Parameter | Type | Default |
|-----------|------|---------|
| `page` | string | `"1"` |
| `limit` | string | `"20"` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 10
  }
}
```

---

## Categories

### GET /api/categories

List all plugin categories with plugin counts.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat-uuid",
      "name": "Automation",
      "slug": "automation",
      "description": "Browser automation plugins",
      "icon": "bot",
      "sortOrder": 1,
      "pluginCount": 15
    }
  ]
}
```

---

### GET /api/categories/{slug}/plugins

List approved plugins in a category.

**Query Parameters:**

| Parameter | Type | Default |
|-----------|------|---------|
| `page` | string | `"1"` |
| `limit` | string | `"20"` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 15
  }
}
```

---

## Stats

### GET /api/stats

Marketplace-wide statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalPlugins": 42,
    "totalDownloads": 1234,
    "totalCategories": 8,
    "totalReviews": 56,
    "recentPlugins": [ ... ]
  }
}
```

---

## Admin

All admin endpoints require a Bearer token with `super_admin` role.

### GET /api/admin/stats/dashboard

Get dashboard statistics for the admin panel.

**Response (200):** Returns admin dashboard stats with counts of pending/approved/rejected plugins.

---

### GET /api/admin/plugins/pending

List plugins pending review.

**Query Parameters:**

| Parameter | Type | Default |
|-----------|------|---------|
| `status` | string | - |
| `page` | string | `"1"` |
| `limit` | string | `"20"` |

---

### GET /api/admin/plugins

List all plugins (all statuses) with optional search.

**Query Parameters:**

| Parameter | Type | Default |
|-----------|------|---------|
| `search` | string | - |
| `status` | string | - |
| `page` | string | `"1"` |
| `limit` | string | `"20"` |

---

### PUT /api/admin/plugins/{slug}/approve

Approve a pending plugin.

**Response (200):** Returns the updated plugin.

---

### PUT /api/admin/plugins/{slug}/reject

Reject a pending plugin.

**Request:**
```json
{
  "reason": "Does not meet quality standards"
}
```

**Response (200):** Returns the updated plugin.

---

### PUT /api/admin/plugins/{slug}/feature

Toggle the featured status of a plugin.

**Response (200):** Returns the updated plugin.

---

### DELETE /api/admin/plugins/{slug}

Remove a plugin from the marketplace (admin override).

**Response (200):**
```json
{ "success": true, "data": { "id": "uuid" } }
```

---

### POST /api/admin/plugins/bulk-approve

Approve multiple plugins at once.

**Request:**
```json
{
  "slugs": ["plugin-a", "plugin-b", "plugin-c"]
}
```

**Response (200):**
```json
{ "success": true, "data": { "approved": 3 } }
```

---

### POST /api/admin/plugins/bulk-reject

Reject multiple plugins at once.

**Request:**
```json
{
  "slugs": ["plugin-x", "plugin-y"],
  "reason": "Bulk rejection reason"
}
```

**Response (200):**
```json
{ "success": true, "data": { "rejected": 2 } }
```

---

### GET /api/admin/categories

List all categories (admin view).

### POST /api/admin/categories

Create a new category.

**Request:**
```json
{
  "name": "New Category",
  "slug": "new-category",
  "description": "Description",
  "icon": "tag",
  "sortOrder": 5
}
```

### PUT /api/admin/categories/{id}

Update a category.

### DELETE /api/admin/categories/{id}

Delete a category.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error (Zod schema mismatch) |
| 401 | Missing or invalid authentication token |
| 403 | Insufficient permissions (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate slug, etc.) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
