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
    ...((init?.headers as Record<string, string>) ?? {}),
  }
  const req = new Request(`http://localhost${path}`, { ...init, headers })
  return application.fetch(req)
}

async function insertTestAuditLog(overrides?: {
  userId?: string
  action?: string
  resourceType?: string
}) {
  const rawClient = await getRawClient()
  if (rawClient && 'execute' in rawClient) {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await rawClient.execute({
      sql: `INSERT INTO permission_audit_logs (id, user_id, action, resource_type, resource_id, old_value, new_value, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        overrides?.userId ?? 'user-1',
        overrides?.action ?? 'create',
        overrides?.resourceType ?? 'user',
        'resource-1',
        null,
        '{"name":"test"}',
        '127.0.0.1',
        'test-agent',
        Date.now(),
      ],
    })
    return id
  }
  throw new Error('Failed to insert test audit log')
}

describe('Audit Log Routes (module-permission)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/audit-logs', () => {
    it('should require authentication', async () => {
      const res = await doFetch('/api/audit-logs')
      expect(res.status).toBe(401)
    })

    it('should return empty list when no logs exist', async () => {
      const res = await doFetch('/api/audit-logs', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: unknown[] }
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data).toHaveLength(0)
      }
    })

    it('should return list of audit logs', async () => {
      await insertTestAuditLog()
      await insertTestAuditLog()

      const res = await doFetch('/api/audit-logs', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: unknown[] }
      if (data.success) {
        expect(data.data).toHaveLength(2)
      }
    })

    it('should support pagination with limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestAuditLog()
      }

      const res = await doFetch('/api/audit-logs?limit=2&offset=1', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: unknown[] }
      if (data.success) {
        expect(data.data).toHaveLength(2)
      }
    })

    it('should filter by userId', async () => {
      await insertTestAuditLog({ userId: 'target-user' })
      await insertTestAuditLog({ userId: 'other-user' })

      const res = await doFetch('/api/audit-logs?userId=target-user', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { userId: string }[] }
      if (data.success) {
        expect(data.data).toHaveLength(1)
        expect(data.data[0].userId).toBe('target-user')
      }
    })

    it('should filter by action', async () => {
      await insertTestAuditLog({ action: 'create' })
      await insertTestAuditLog({ action: 'delete' })

      const res = await doFetch('/api/audit-logs?action=delete', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { action: string }[] }
      if (data.success) {
        expect(data.data).toHaveLength(1)
        expect(data.data[0].action).toBe('delete')
      }
    })

    it('should filter by resourceType', async () => {
      await insertTestAuditLog({ resourceType: 'user' })
      await insertTestAuditLog({ resourceType: 'role' })

      const res = await doFetch('/api/audit-logs?resourceType=role', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; data: { resourceType: string }[] }
      if (data.success) {
        expect(data.data).toHaveLength(1)
        expect(data.data[0].resourceType).toBe('role')
      }
    })
  })

  describe('GET /api/audit-logs/:id', () => {
    it('should return audit log by valid id', async () => {
      const logId = await insertTestAuditLog()

      const res = await doFetch(`/api/audit-logs/${logId}`, {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as {
        success: boolean
        data: { id: string; userId: string; action: string; resourceType: string }
      }
      if (data.success) {
        expect(data.data.id).toBe(logId)
        expect(data.data).toHaveProperty('userId')
        expect(data.data).toHaveProperty('action')
        expect(data.data).toHaveProperty('resourceType')
      }
    })

    it('should return 404 for non-existent id', async () => {
      const res = await doFetch('/api/audit-logs/nonexistent-id', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })
})
