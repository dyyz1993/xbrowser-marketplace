import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createApp } from '../../app'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'

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

describe('Admin Notification Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('Authentication', () => {
    it('should reject unauthenticated GET /api/admin/notifications', async () => {
      const res = await doFetch('/api/admin/notifications')
      expect(res.status).toBe(401)
    })

    it('should reject unauthenticated PUT /api/admin/notifications/read-all', async () => {
      const res = await doFetch('/api/admin/notifications/read-all', {
        method: 'PUT',
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/notifications', () => {
    it('should return empty notification list', async () => {
      const res = await doFetch('/api/admin/notifications', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: unknown[] }
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })

    it('should support unreadOnly query parameter', async () => {
      const res = await doFetch('/api/admin/notifications?unreadOnly=true', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
    })

    it('should support limit query parameter', async () => {
      const res = await doFetch('/api/admin/notifications?limit=5', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/admin/notifications/unread-count', () => {
    it('should return unread count', async () => {
      const res = await doFetch('/api/admin/notifications/unread-count', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { count: number } }
      if (data.success) {
        expect(typeof data.data.count).toBe('number')
      }
    })
  })

  describe('PUT /api/admin/notifications/:id/read', () => {
    it('should return 404 for non-existent notification', async () => {
      const res = await doFetch('/api/admin/notifications/non-existent-id/read', {
        method: 'PUT',
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const res = await doFetch('/api/admin/notifications/read-all', {
        method: 'PUT',
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { count: number } }
      if (data.success) {
        expect(typeof data.data.count).toBe('number')
      }
    })
  })

  describe('POST /api/admin/notifications/test', () => {
    it('should reject non-super-admin for test notification', async () => {
      const res = await doFetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: authHeaders('user-token'),
        body: JSON.stringify({ type: 'info' }),
      })
      expect(res.status).toBe(403)
    })

    it('should send test notification as super-admin', async () => {
      const res = await doFetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: 'info' }),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { id: string; type: string; read: boolean }
      }
      if (data.success) {
        expect(data.data.type).toBe('info')
        expect(data.data.read).toBe(false)
      }
    })
  })
})
