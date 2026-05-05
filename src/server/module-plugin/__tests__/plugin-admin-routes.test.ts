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

async function seedPendingPlugin(slug = 'pending-test', id = 'plugin-pending') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      `Pending ${slug}`,
      slug,
      `A pending plugin ${slug} for admin testing`,
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
}

async function seedApprovedPlugin(slug = 'approved-test', id = 'plugin-approved') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      `Approved ${slug}`,
      slug,
      `An approved plugin ${slug} for admin testing`,
      'user-1',
      'testuser',
      '1.0.0',
      'approved',
      '[]',
      '[]',
      '[]',
      now,
      now,
    ],
  })
}

async function seedCategory(id = 'cat-admin-1', slug = 'admin-cat', name = 'Admin Category') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, name, slug, 'Admin test category', 'folder', 1],
  })
}

describe('Plugin Admin Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('Non-admin access', () => {
    it('should reject non-admin on dashboard', async () => {
      const res = await doFetch('/api/admin/stats/dashboard', {
        headers: authHeaders('user-token'),
      })
      expect(res.status).toBe(403)
    })

    it('should reject non-admin on pending list', async () => {
      const res = await doFetch('/api/admin/plugins/pending', {
        headers: authHeaders('user-token'),
      })
      expect(res.status).toBe(403)
    })

    it('should reject unauthenticated on admin routes', async () => {
      const res = await doFetch('/api/admin/plugins')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/stats/dashboard', () => {
    it('should return dashboard stats', async () => {
      const res = await doFetch('/api/admin/stats/dashboard', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { totalPlugins: number; pendingPlugins: number; approvedPlugins: number }
      }
      if (data.success) {
        expect(data.data).toHaveProperty('totalPlugins')
        expect(data.data).toHaveProperty('pendingPlugins')
        expect(data.data).toHaveProperty('approvedPlugins')
        expect(data.data).toHaveProperty('totalDownloads')
        expect(data.data).toHaveProperty('activeDevelopers')
      }
    })
  })

  describe('GET /api/admin/plugins/pending', () => {
    it('should list pending plugins', async () => {
      await seedPendingPlugin()
      const res = await doFetch('/api/admin/plugins/pending', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { items: { slug: string; status: string }[]; total: number }
      }
      if (data.success) {
        expect(data.data.total).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('GET /api/admin/plugins', () => {
    it('should list all plugins', async () => {
      await seedPendingPlugin()
      await seedApprovedPlugin()
      const res = await doFetch('/api/admin/plugins?page=1&limit=20', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { items: unknown[]; total: number }
      }
      if (data.success) {
        expect(data.data.total).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('PUT /api/admin/plugins/:slug/approve', () => {
    it('should approve a pending plugin', async () => {
      await seedPendingPlugin('approve-me', 'plugin-approve')
      const res = await doFetch('/api/admin/plugins/approve-me/approve', {
        method: 'PUT',
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { status: string } }
      if (data.success) {
        expect(data.data.status).toBe('approved')
      }
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/admin/plugins/no-such-plugin/approve', {
        method: 'PUT',
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/plugins/:slug/reject', () => {
    it('should reject a pending plugin', async () => {
      await seedPendingPlugin('reject-me', 'plugin-reject')
      const res = await doFetch('/api/admin/plugins/reject-me/reject', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ reason: 'Does not meet standards' }),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { status: string } }
      if (data.success) {
        expect(data.data.status).toBe('rejected')
      }
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/admin/plugins/no-such-plugin/reject', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ reason: 'test' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/plugins/:slug/feature', () => {
    it('should toggle featured on approved plugin', async () => {
      await seedApprovedPlugin('feature-me', 'plugin-feature')
      const res = await doFetch('/api/admin/plugins/feature-me/feature', {
        method: 'PUT',
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { featured: boolean } }
      if (data.success) {
        expect(typeof data.data.featured).toBe('boolean')
      }
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/admin/plugins/no-such-plugin/feature', {
        method: 'PUT',
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/plugins/:slug', () => {
    it('should remove a plugin', async () => {
      await seedApprovedPlugin('remove-me', 'plugin-remove')
      const res = await doFetch('/api/admin/plugins/remove-me', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { id: string } }
      if (data.success) {
        expect(data.data.id).toBe('plugin-remove')
      }
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/admin/plugins/no-such-plugin', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/plugins/bulk-approve', () => {
    it('should bulk approve plugins', async () => {
      await seedPendingPlugin('bulk-a1', 'bulk-a1')
      await seedPendingPlugin('bulk-a2', 'bulk-a2')
      const res = await doFetch('/api/admin/plugins/bulk-approve', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ slugs: ['bulk-a1', 'bulk-a2'] }),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { approved: number } }
      if (data.success) {
        expect(data.data.approved).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('POST /api/admin/plugins/bulk-reject', () => {
    it('should bulk reject plugins', async () => {
      await seedPendingPlugin('bulk-r1', 'bulk-r1')
      await seedPendingPlugin('bulk-r2', 'bulk-r2')
      const res = await doFetch('/api/admin/plugins/bulk-reject', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ slugs: ['bulk-r1', 'bulk-r2'], reason: 'Batch rejection' }),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { rejected: number } }
      if (data.success) {
        expect(data.data.rejected).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('Category CRUD', () => {
    it('should list categories', async () => {
      await seedCategory()
      const res = await doFetch('/api/admin/categories', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { slug: string }[] }
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })

    it('should create a category', async () => {
      const res = await doFetch('/api/admin/categories', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: 'New Category',
          slug: 'new-cat',
          description: 'A new category',
          icon: 'star',
        }),
      })
      expect(res.status).toBe(201)
      const data = (await res.json()) as { success: boolean; data: { slug: string; name: string } }
      if (data.success) {
        expect(data.data.slug).toBe('new-cat')
        expect(data.data.name).toBe('New Category')
      }
    })

    it('should update a category', async () => {
      await seedCategory()
      const res = await doFetch('/api/admin/categories/cat-admin-1', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: 'Updated Category' }),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { name: string } }
      if (data.success) {
        expect(data.data.name).toBe('Updated Category')
      }
    })

    it('should delete a category', async () => {
      await seedCategory()
      const res = await doFetch('/api/admin/categories/cat-admin-1', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
    })

    it('should return 404 when updating non-existent category', async () => {
      const res = await doFetch('/api/admin/categories/non-existent', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: 'Test' }),
      })
      expect(res.status).toBe(404)
    })

    it('should return 404 when deleting non-existent category', async () => {
      const res = await doFetch('/api/admin/categories/non-existent', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })
})
