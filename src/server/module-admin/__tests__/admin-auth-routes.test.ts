import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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
    ...(init?.headers as Record<string, string> ?? {}),
  }
  const req = new Request(`http://localhost${path}`, { ...init, headers })
  return application.fetch(req)
}

describe('Admin Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/admin/me', () => {
    it('should reject unauthenticated request', async () => {
      const res = await doFetch('/api/admin/me')
      expect(res.status).toBe(401)
    })

    it('should return current user for authenticated request', async () => {
      const res = await doFetch('/api/admin/me', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { id: string; username: string; role: string }
      }
      if (data.success) {
        expect(data.data).toHaveProperty('id')
        expect(data.data).toHaveProperty('username')
        expect(data.data).toHaveProperty('role')
      }
    })
  })

  describe('POST /api/admin/login', () => {
    it('should login with valid credentials', async () => {
      const res = await doFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'superadmin',
          password: 'password123',
        }),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { user: { id: string; username: string }; token: string }
      }
      if (data.success) {
        expect(data.data).toHaveProperty('user')
        expect(data.data).toHaveProperty('token')
        expect(data.data.user.username).toBe('superadmin')
      }
    })

    it('should reject invalid credentials', async () => {
      const res = await doFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'wronguser',
          password: 'wrongpass',
        }),
      })
      expect(res.status).toBe(401)
    })

    it('should reject missing credentials', async () => {
      const res = await doFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/admin/register', () => {
    it('should register a new user', async () => {
      const res = await doFetch('/api/admin/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'newregistered',
          email: 'newregistered@example.com',
          password: 'password123',
        }),
      })
      expect(res.status).toBe(201)
      const data = (await res.json()) as {
        success: boolean
        data: { username: string; email: string; role: string }
      }
      if (data.success) {
        expect(data.data.username).toBe('newregistered')
        expect(data.data.email).toBe('newregistered@example.com')
      }
    })
  })
})
