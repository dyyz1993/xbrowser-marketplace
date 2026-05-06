import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
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
    ...((init?.headers as Record<string, string>) ?? {}),
  }
  const req = new Request(`http://localhost${path}`, { ...init, headers })
  return application.fetch(req)
}

async function seedPlugin() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'plugin-1',
      'Test Plugin',
      'test-plugin',
      'A test plugin for automated testing',
      'super-admin-1',
      'superadmin',
      '1.0.0',
      'approved',
      '["automation","testing"]',
      '["https://example.com"]',
      '["scrape"]',
      now,
      now,
    ],
  })
  await client.execute({
    sql: `INSERT INTO plugin_versions (id, plugin_id, version, status, published_at) VALUES (?, ?, ?, ?, ?)`,
    args: ['ver-1', 'plugin-1', '1.0.0', 'approved', now],
  })
}

async function seedCategory() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['cat-1', 'Automation', 'automation', 'Automation plugins', 'bot', 1],
  })
}

describe('Plugin API', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/plugins', () => {
    it('should return empty list when no plugins', async () => {
      const client = createTestClient()
      const res = await client.api.plugins.$get({ query: { page: '1', limit: '20' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data.items).toHaveLength(0)
        expect(data.data.total).toBe(0)
      }
    })

    it('should list approved plugins', async () => {
      await seedPlugin()
      const client = createTestClient()
      const res = await client.api.plugins.$get({ query: { page: '1', limit: '20' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data.items.length).toBeGreaterThanOrEqual(1)
        expect(data.data.items[0].slug).toBe('test-plugin')
      }
    })

    it('should paginate results', async () => {
      await seedPlugin()
      const client = createTestClient()
      const res = await client.api.plugins.$get({ query: { page: '1', limit: '1' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data.limit).toBe(1)
        expect(data.data.page).toBe(1)
      }
    })
  })

  describe('GET /api/plugins/search', () => {
    it('should search plugins by query', async () => {
      await seedPlugin()
      const client = createTestClient()
      const res = await client.api.plugins.search.$get({ query: { q: 'test' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data.items.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('should return empty for non-matching query', async () => {
      await seedPlugin()
      const client = createTestClient()
      const res = await client.api.plugins.search.$get({ query: { q: 'xyznonexistent' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data.items).toHaveLength(0)
      }
    })
  })

  describe('GET /api/plugins/:slug', () => {
    it('should return plugin detail', async () => {
      await seedPlugin()
      const res = await doFetch('/api/plugins/test-plugin')
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { slug: string; name: string; description: string }
      }
      if (data.success) {
        expect(data.data.slug).toBe('test-plugin')
        expect(data.data.name).toBe('Test Plugin')
        expect(data.data.description).toBe('A test plugin for automated testing')
      }
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/plugins/non-existent')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/plugins', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.plugins.$post({
        json: {
          name: 'New Plugin',
          slug: 'new-plugin',
          description: 'A brand new plugin for testing',
          version: '1.0.0',
        },
      })
      expect(res.status).toBe(401)
    })

    it('should create plugin with auth', async () => {
      const res = await doFetch('/api/plugins', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: 'New Plugin',
          slug: 'new-plugin',
          description: 'A brand new plugin for testing purposes here',
          version: '1.0.0',
        }),
      })
      expect(res.status).toBe(201)
      const data = (await res.json()) as {
        success: boolean
        data: { slug: string; status: string }
      }
      if (data.success) {
        expect(data.data.slug).toBe('new-plugin')
        expect(data.data.status).toBe('pending')
      }
    })
  })

  describe('POST /api/plugins/:slug/install', () => {
    it('should track install and increment download count', async () => {
      await seedPlugin()
      const res = await doFetch('/api/plugins/test-plugin/install', { method: 'POST' })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { downloadCount: number } }
      if (data.success) {
        expect(data.data.downloadCount).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('POST /api/plugins/:slug/reviews', () => {
    it('should require authentication', async () => {
      await seedPlugin()
      const res = await doFetch('/api/plugins/test-plugin/reviews', {
        method: 'POST',
        body: JSON.stringify({ rating: 5, title: 'Great', content: 'Awesome plugin' }),
      })
      expect(res.status).toBe(401)
    })

    it('should submit review with auth', async () => {
      await seedPlugin()
      const res = await doFetch('/api/plugins/test-plugin/reviews', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rating: 4, title: 'Good', content: 'Works well' }),
      })
      expect(res.status).toBe(201)
      const data = (await res.json()) as { success: boolean; data: { rating: number } }
      if (data.success) {
        expect(data.data.rating).toBe(4)
      }
    })
  })

  describe('GET /api/categories', () => {
    it('should return empty list when no categories', async () => {
      const client = createTestClient()
      const res = await client.api.categories.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data).toHaveLength(0)
      }
    })

    it('should list categories with plugin counts', async () => {
      await seedCategory()
      const client = createTestClient()
      const res = await client.api.categories.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data.length).toBeGreaterThanOrEqual(1)
        expect(data.data[0].slug).toBe('automation')
      }
    })
  })

  describe('GET /api/stats', () => {
    it('should return marketplace stats', async () => {
      const client = createTestClient()
      const res = await client.api.stats.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.success) {
        expect(data.data).toHaveProperty('totalPlugins')
        expect(data.data).toHaveProperty('totalDownloads')
        expect(data.data).toHaveProperty('totalCategories')
        expect(data.data).toHaveProperty('totalReviews')
      }
    })
  })
})
