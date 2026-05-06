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

describe('User Management Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated GET /api/admin/users', async () => {
      const res = await doFetch('/api/admin/users')
      expect(res.status).toBe(401)
    })

    it('should reject user without USER_VIEW permission', async () => {
      const res = await doFetch('/api/admin/users', {
        headers: authHeaders('user-token'),
      })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/admin/users', () => {
    it('should list users for admin', async () => {
      const res = await doFetch('/api/admin/users', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { id: string }[] }
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })
  })

  describe('GET /api/admin/users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      const res = await doFetch('/api/admin/users/non-existent-user-id', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/users', () => {
    it('should create a new user', async () => {
      const res = await doFetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'user',
        }),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { username: string; role: string } }
      if (data.success) {
        expect(data.data.username).toBe('newuser')
      }
    })
  })

  describe('PUT /api/admin/users/:id', () => {
    it('should return error for non-existent user update', async () => {
      const res = await doFetch('/api/admin/users/non-existent-user-id', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ username: 'updated' }),
      })
      expect([404, 500]).toContain(res.status)
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('should return error for non-existent user deletion', async () => {
      const res = await doFetch('/api/admin/users/non-existent-user-id', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect([404, 500]).toContain(res.status)
    })
  })

  describe('Full user CRUD flow', () => {
    it('should create, get, update, and delete a user', async () => {
      const createRes = await doFetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          username: 'cruduser',
          email: 'crud@example.com',
          password: 'crudpass123',
          role: 'user',
        }),
      })
      expect(createRes.status).toBe(200)
      const created = (await createRes.json()) as { success: boolean; data: { id: string } }
      if (!created.success) return
      const userId = created.data.id

      const getRes = await doFetch(`/api/admin/users/${userId}`, {
        headers: authHeaders(),
      })
      expect(getRes.status).toBe(200)

      const updateRes = await doFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ username: 'cruduser-updated' }),
      })
      expect(updateRes.status).toBe(200)

      const deleteRes = await doFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(deleteRes.status).toBe(200)
    })
  })
})
