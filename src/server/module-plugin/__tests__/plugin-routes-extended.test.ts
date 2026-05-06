import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createApp } from '../../app'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'

function authHeaders(token = 'admin-token') {
  return { Authorization: `Bearer ${token}` }
}

function doFetch(path: string, init?: RequestInit) {
  const application = createApp()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'TestClient/1.0',
    ...(init?.headers as Record<string, string> ?? {}),
  }
  const req = new Request(`http://localhost${path}`, { ...init, headers })
  return application.fetch(req)
}

async function seedApprovedPlugin(
  slug = 'ext-plugin',
  id = 'plugin-ext',
  authorId = 'user-1',
  authorName = 'testuser'
) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      `Extended ${slug}`,
      slug,
      `An extended test plugin ${slug} with enough description text`,
      authorId,
      authorName,
      '1.0.0',
      'approved',
      '["automation"]',
      '["https://example.com"]',
      '["scrape"]',
      now,
      now,
    ],
  })
  return { id, slug }
}

async function seedVersion(pluginId: string, version = '1.0.0', verId = 'ver-ext-1') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugin_versions (id, plugin_id, version, changelog, package_url, file_size, checksum, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [verId, pluginId, version, 'Initial release', null, null, null, 'approved', now],
  })
}

async function seedReview(
  pluginId: string,
  reviewId = 'review-ext-1',
  userId = 'user-1',
  userName = 'testuser'
) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugin_reviews (id, plugin_id, user_id, user_name, rating, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [reviewId, pluginId, userId, userName, 4, 'Good plugin', 'Works well', now],
  })
  return reviewId
}

async function seedCategory(
  id = 'cat-ext-1',
  slug = 'ext-category',
  name = 'Extended Category'
) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, name, slug, 'Extended test category', 'box', 1],
  })
  return id
}

async function seedCategoryMapping(pluginId: string, categoryId: string) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_category_mappings (plugin_id, category_id) VALUES (?, ?)`,
    args: [pluginId, categoryId],
  })
}

describe('Plugin Routes Extended', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/plugins/:slug/versions', () => {
    it('should return versions for a plugin', async () => {
      const { id } = (await seedApprovedPlugin())!
      await seedVersion(id)
      const res = await doFetch('/api/plugins/ext-plugin/versions')
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { version: string; changelog: string }[]
      }
      if (data.success) {
        expect(data.data.length).toBeGreaterThanOrEqual(1)
        expect(data.data[0].version).toBe('1.0.0')
      }
    })

    it('should return empty for plugin without versions', async () => {
      await seedApprovedPlugin('no-ver-plugin', 'plugin-no-ver')
      const res = await doFetch('/api/plugins/no-ver-plugin/versions')
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: unknown[] }
      if (data.success) {
        expect(data.data).toHaveLength(0)
      }
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/plugins/non-existent/versions')
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/categories/:slug/plugins', () => {
    it('should return plugins by category', async () => {
      const { id: pluginId } = (await seedApprovedPlugin())!
      const catId = (await seedCategory())!
      await seedCategoryMapping(pluginId, catId)
      const res = await doFetch('/api/categories/ext-category/plugins?page=1&limit=20')
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { items: { slug: string }[]; total: number }
      }
      if (data.success) {
        expect(data.data.items.length).toBeGreaterThanOrEqual(1)
        expect(data.data.items[0].slug).toBe('ext-plugin')
      }
    })

    it('should return 404 for non-existent category', async () => {
      const res = await doFetch('/api/categories/non-existent-cat/plugins?page=1&limit=20')
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/plugins/:slug/reviews/:reviewId', () => {
    it('should allow review owner to delete their review', async () => {
      const { id } = (await seedApprovedPlugin())!
      const reviewId = await seedReview(id)
      const res = await doFetch(`/api/plugins/ext-plugin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: authHeaders('user-token'),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { id: string } }
      if (data.success) {
        expect(data.data.id).toBe(reviewId)
      }
    })

    it('should reject non-owner deletion (non-admin)', async () => {
      const { id } = (await seedApprovedPlugin('review-del-2', 'plugin-rd2'))!
      const reviewId = await seedReview(id, 'review-del-2', 'user-1', 'testuser')
      const res = await doFetch(`/api/plugins/review-del-2/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: authHeaders('test-user-other'),
      })
      expect([403, 404]).toContain(res.status)
    })
  })

  describe('PUT /api/plugins/:slug (update)', () => {
    it('should reject non-owner update', async () => {
      await seedApprovedPlugin('update-test', 'plugin-ut', 'super-admin-1', 'admin')
      const res = await doFetch('/api/plugins/update-test', {
        method: 'PUT',
        headers: authHeaders('user-token'),
        body: JSON.stringify({ description: 'Hacked description that is long enough for validation' }),
      })
      expect([403, 409]).toContain(res.status)
    })
  })

  describe('DELETE /api/plugins/:slug (delete)', () => {
    it('should reject non-owner deletion', async () => {
      await seedApprovedPlugin('delete-test', 'plugin-dt', 'super-admin-1', 'admin')
      const res = await doFetch('/api/plugins/delete-test', {
        method: 'DELETE',
        headers: authHeaders('user-token'),
      })
      expect([403, 409]).toContain(res.status)
    })
  })

  describe('POST /api/plugins/:slug/reviews', () => {
    it('should reject review on pending plugin', async () => {
      const client = await getRawClient()
      if (!client || !('execute' in client)) return
      const now = Date.now()
      await client.execute({
        sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'plugin-pend-rev',
          'Pending Review',
          'pending-review-plugin',
          'A pending plugin for review testing purposes',
          'user-1',
          'testuser',
          '1.0.0',
          'pending',
          '[]',
          '[]',
          '[]',
          now,
          now,
        ],
      })
      const res = await doFetch('/api/plugins/pending-review-plugin/reviews', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rating: 3, title: 'Not great', content: 'Cannot review pending' }),
      })
      expect([400, 409]).toContain(res.status)
    })

    it('should reject duplicate review from same user', async () => {
      const { id } = (await seedApprovedPlugin('dup-rev-plugin', 'plugin-dup'))!
      await seedReview(id, 'review-dup-1', 'super-admin-1', 'superadmin')
      const res = await doFetch('/api/plugins/dup-rev-plugin/reviews', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rating: 5, title: 'Another', content: 'Should be rejected' }),
      })
      expect(res.status).toBe(409)
    })
  })

  describe('Search with filters', () => {
    it('should filter by tag', async () => {
      await seedApprovedPlugin()
      const res = await doFetch('/api/plugins/search?q=test&tag=automation')
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { items: unknown[] } }
      if (data.success) {
        expect(Array.isArray(data.data.items)).toBe(true)
      }
    })

    it('should filter by site', async () => {
      await seedApprovedPlugin()
      const res = await doFetch('/api/plugins/search?q=test&site=example.com')
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { items: unknown[] } }
      if (data.success) {
        expect(Array.isArray(data.data.items)).toBe(true)
      }
    })
  })

  describe('POST /api/plugins/:slug/install', () => {
    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/plugins/non-existent/install', {
        method: 'POST',
      })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/plugins with filters', () => {
    it('should filter by category', async () => {
      const { id: pluginId } = (await seedApprovedPlugin())!
      const catId = (await seedCategory())!
      await seedCategoryMapping(pluginId, catId)
      const res = await doFetch('/api/plugins?page=1&limit=20&category=ext-category')
      expect(res.status).toBe(200)
    })

    it('should filter by featured', async () => {
      const client = await getRawClient()
      if (!client || !('execute' in client)) return
      const now = Date.now()
      await client.execute({
        sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'plugin-feat',
          'Featured',
          'featured-plugin',
          'A featured plugin for filter testing purposes',
          'user-1',
          'testuser',
          '1.0.0',
          'approved',
          '[]',
          '[]',
          '[]',
          1,
          now,
          now,
        ],
      })
      const res = await doFetch('/api/plugins?page=1&limit=20&featured=true')
      expect(res.status).toBe(200)
    })
  })
})
