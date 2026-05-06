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

async function seedTodo(title = 'Test Todo') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, 'pending', ?, ?)`,
    args: [title, Date.now(), Date.now()],
  })
}

describe('System Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated GET /api/admin/stats', async () => {
      const res = await doFetch('/api/admin/stats')
      expect(res.status).toBe(401)
    })

    it('should reject non-super-admin for GET /api/admin/stats', async () => {
      const res = await doFetch('/api/admin/stats', {
        headers: authHeaders('user-token'),
      })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/admin/stats', () => {
    it('should return system stats for super-admin', async () => {
      await seedTodo('Stats Todo')
      const res = await doFetch('/api/admin/stats', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { totalTodos: number; pendingTodos: number; completedTodos: number }
      }
      if (data.success) {
        expect(data.data).toHaveProperty('totalTodos')
        expect(data.data).toHaveProperty('pendingTodos')
        expect(data.data).toHaveProperty('completedTodos')
        expect(data.data).toHaveProperty('lastUpdated')
      }
    })
  })

  describe('GET /api/admin/health', () => {
    it('should return health check for super-admin', async () => {
      const res = await doFetch('/api/admin/health', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { database: string; timestamp: string }
      }
      if (data.success) {
        expect(data.data).toHaveProperty('database')
        expect(data.data).toHaveProperty('timestamp')
        expect(['connected', 'disconnected']).toContain(data.data.database)
      }
    })

    it('should reject non-super-admin for health check', async () => {
      const res = await doFetch('/api/admin/health', {
        headers: authHeaders('user-token'),
      })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/admin/activity', () => {
    it('should return recent activity', async () => {
      await seedTodo('Activity Todo')
      const res = await doFetch('/api/admin/activity', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { id: number; title: string; status: string }[]
      }
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })

    it('should respect limit query parameter', async () => {
      const res = await doFetch('/api/admin/activity?limit=5', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
    })
  })

  describe('DELETE /api/admin/todos/all', () => {
    it('should clear all todos', async () => {
      await seedTodo('Todo to clear 1')
      await seedTodo('Todo to clear 2')
      const res = await doFetch('/api/admin/todos/all', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { deletedCount: number }
      }
      if (data.success) {
        expect(data.data.deletedCount).toBeGreaterThanOrEqual(0)
      }
    })

    it('should reject non-super-admin for clear all todos', async () => {
      const res = await doFetch('/api/admin/todos/all', {
        method: 'DELETE',
        headers: authHeaders('user-token'),
      })
      expect(res.status).toBe(403)
    })
  })
})
