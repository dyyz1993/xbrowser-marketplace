import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

describe('Plugin Marketplace E2E Flow', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  const client = createTestClient()
  let developerToken: string
  let pluginSlug: string

  function authedClient() {
    return createTestClient(undefined, {
      headers: { Authorization: `Bearer ${developerToken}` },
    })
  }

  function adminClient() {
    return createTestClient(undefined, {
      headers: { Authorization: 'Bearer super-admin-token' },
    })
  }

  describe('1. Developer Registration', () => {
    it('should register a new developer', async () => {
      const res = await client.api.auth.register.$post({
        json: {
          username: 'testdev',
          email: 'testdev@example.com',
          password: 'test123456',
        },
      })
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.username).toBe('testdev')
    })

    it('should reject duplicate registration', async () => {
      const res = await client.api.auth.register.$post({
        json: {
          username: 'testdev',
          email: 'testdev@example.com',
          password: 'test123456',
        },
      })
      expect(res.status).toBe(409)
    })

    it('should login with the new account', async () => {
      const res = await client.api.auth.login.$post({
        json: {
          email: 'testdev@example.com',
          password: 'test123456',
        },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
      developerToken = data.data.token
    })

    it('should reject wrong password', async () => {
      const res = await client.api.auth.login.$post({
        json: {
          email: 'testdev@example.com',
          password: 'wrongpassword',
        },
      })
      expect(res.status).toBe(401)
    })

    it('should verify the token via auth middleware', async () => {
      const res = await authedClient().api.plugins.$get({
        query: { page: '1', limit: '10' },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('2. Plugin CRUD', () => {
    it('should create a new plugin', async () => {
      const res = await authedClient().api.plugins.$post({
        json: {
          name: 'Test Scraper',
          slug: 'test-scraper-e2e',
          description: 'A test scraper plugin for e2e testing purposes',
          version: '1.0.0',
          license: 'MIT',
          tags: ['test', 'scraping'],
          commands: ['scrape', 'extract'],
          siteUrls: ['example.com'],
        },
      })
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.slug).toBe('test-scraper-e2e')
      pluginSlug = 'test-scraper-e2e'
    })

    it('should reject duplicate slug', async () => {
      const res = await authedClient().api.plugins.$post({
        json: {
          name: 'Test Scraper 2',
          slug: 'test-scraper-e2e',
          description: 'Another test scraper plugin for e2e testing purposes',
          version: '1.0.0',
        },
      })
      expect(res.status).toBe(409)
    })

    it('should get plugin detail by slug', async () => {
      const res = await client.api.plugins[':slug'].$get({
        param: { slug: pluginSlug },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.slug).toBe(pluginSlug)
      expect(data.data.name).toBe('Test Scraper')
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await client.api.plugins[':slug'].$get({
        param: { slug: 'non-existent-plugin' },
      })
      expect(res.status).toBe(404)
    })

    it('should update the plugin', async () => {
      const res = await authedClient().api.plugins[':slug'].$put({
        param: { slug: pluginSlug },
        json: {
          description: 'Updated description for e2e testing plugin',
          tags: ['test', 'scraping', 'updated'],
        },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.tags).toContain('updated')
    })

    it('should track plugin install', async () => {
      const res = await client.api.plugins[':slug'].install.$post({
        param: { slug: pluginSlug },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('3. Plugin Search & Browse', () => {
    it('should list plugins', async () => {
      const res = await client.api.plugins.$get({
        query: { page: '1', limit: '20' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.items)).toBe(true)
    })

    it('should search plugins by query', async () => {
      const res = await client.api.plugins.search.$get({
        query: { q: 'scraper' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should filter plugins by tag', async () => {
      const res = await client.api.plugins.$get({
        query: { page: '1', limit: '20', tag: 'test' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should list categories', async () => {
      const res = await client.api.categories.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should return marketplace stats', async () => {
      const res = await client.api.stats.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('4. Admin Approval (required before reviews)', () => {
    it('should allow super-admin to view dashboard', async () => {
      const res = await adminClient().api.admin.stats.dashboard.$get()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should allow super-admin to list all plugins', async () => {
      const res = await adminClient().api.admin.plugins.$get({
        query: { page: '1', limit: '20' },
      })
      expect(res.status).toBe(200)
    })

    it('should allow super-admin to approve plugin', async () => {
      const res = await adminClient().api.admin.plugins[':slug'].approve.$put({
        param: { slug: pluginSlug },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should allow super-admin to toggle featured', async () => {
      const res = await adminClient().api.admin.plugins[':slug'].feature.$put({
        param: { slug: pluginSlug },
      })
      expect(res.status).toBe(200)
    })

    it('should list approved plugins publicly', async () => {
      const res = await client.api.plugins.$get({
        query: { page: '1', limit: '20', status: 'approved' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('5. Plugin Reviews (after approval)', () => {
    it('should submit a review', async () => {
      const res = await authedClient().api.plugins[':slug'].reviews.$post({
        param: { slug: pluginSlug },
        json: {
          rating: 5,
          title: 'Great plugin!',
          content: 'Works perfectly for testing the marketplace flow',
        },
      })
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.rating).toBe(5)
    })

    it('should get reviews for a plugin', async () => {
      const res = await client.api.plugins[':slug'].reviews.$get({
        param: { slug: pluginSlug },
        query: { page: '1', limit: '10' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.items.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('6. Admin Reject Flow', () => {
    it('should allow super-admin to reject plugin', async () => {
      const createRes = await authedClient().api.plugins.$post({
        json: {
          name: 'Reject Me',
          slug: 'reject-me-plugin',
          description: 'A plugin that will be rejected by admin',
          version: '1.0.0',
        },
      })
      expect(createRes.status).toBe(201)

      const res = await adminClient().api.admin.plugins[':slug'].reject.$put({
        param: { slug: 'reject-me-plugin' },
        json: { reason: 'Does not meet quality standards' },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('7. Cleanup - Delete Plugin', () => {
    it('should allow author to soft-delete their plugin', async () => {
      const res = await authedClient().api.plugins[':slug'].$delete({
        param: { slug: pluginSlug },
      })
      expect(res.status).toBe(200)
    })

    it('should return plugin with removed status after deletion', async () => {
      const res = await client.api.plugins[':slug'].$get({
        param: { slug: pluginSlug },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.status).toBe('removed')
    })
  })
})
