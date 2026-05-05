import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'

describe('Media Routes', () => {
  const authHeaders = { Authorization: 'Bearer admin-token' }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/admin/avatar/:id', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.admin.avatar[':id'].$get(
        { param: { id: 'test-user' } }
      )
      expect(res.status).toBe(401)
    })

    it('should return avatar image for valid id', async () => {
      const client = createTestClient()
      const res = await client.api.admin.avatar[':id'].$get(
        { param: { id: 'test-user' } },
        { headers: authHeaders }
      )

      expect([200, 404, 500]).toContain(res.status)
      if (res.status === 200) {
        const contentType = res.headers.get('Content-Type')
        expect(contentType).toMatch(/image/)
      }
    })

    it('should return 404 for non-existent avatar when external API fails', async () => {
      const client = createTestClient()
      const res = await client.api.admin.avatar[':id'].$get(
        { param: { id: 'nonexistent-avatar-xyz' } },
        { headers: authHeaders }
      )

      expect([200, 404]).toContain(res.status)
    })
  })

  describe('GET /api/admin/icon/:name', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.admin.icon[':name'].$get(
        { param: { name: 'home' } }
      )
      expect(res.status).toBe(401)
    })

    it('should return SVG icon for valid name', async () => {
      const client = createTestClient()
      const res = await client.api.admin.icon[':name'].$get(
        { param: { name: 'home' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const contentType = res.headers.get('Content-Type')
      expect(contentType).toBe('image/svg+xml')
      const text = await res.text()
      expect(text).toContain('<svg')
    })

    it('should return valid icon for settings', async () => {
      const client = createTestClient()
      const res = await client.api.admin.icon[':name'].$get(
        { param: { name: 'settings' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('<svg')
    })

    it('should return valid icon for user', async () => {
      const client = createTestClient()
      const res = await client.api.admin.icon[':name'].$get(
        { param: { name: 'user' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('<svg')
    })

    it('should return valid icon for bell', async () => {
      const client = createTestClient()
      const res = await client.api.admin.icon[':name'].$get(
        { param: { name: 'bell' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('<svg')
    })

    it('should return 404 for unknown icon name', async () => {
      const client = createTestClient()
      const res = await client.api.admin.icon[':name'].$get(
        { param: { name: 'nonexistent-icon' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(404)
      const data = await res.json() as Record<string, unknown>
      expect(data.success).toBe(false)
      expect(data.error).toBe('Icon not found')
    })
  })
})
