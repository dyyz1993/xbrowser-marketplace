import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'

describe('Audit Log Routes', () => {
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

  describe('GET /api/audit-logs', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: {} }
      )
      expect(res.status).toBe(401)
    })

    it('should return empty list when no logs exist', async () => {
      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: {} },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data).toHaveLength(0)
      }
    })

    it('should return list of audit logs', async () => {
      await insertTestAuditLog()
      await insertTestAuditLog()

      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: {} },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data).toHaveLength(2)
      }
    })

    it('should support limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestAuditLog()
      }

      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: { limit: '2' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveLength(2)
      }
    })

    it('should support offset parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestAuditLog()
      }

      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: { limit: '5', offset: '3' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.length).toBeLessThanOrEqual(2)
      }
    })

    it('should filter by userId', async () => {
      await insertTestAuditLog({ userId: 'target-user' })
      await insertTestAuditLog({ userId: 'other-user' })

      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: { userId: 'target-user' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveLength(1)
        expect(data.data[0].userId).toBe('target-user')
      }
    })

    it('should filter by action', async () => {
      await insertTestAuditLog({ action: 'create' })
      await insertTestAuditLog({ action: 'delete' })

      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: { action: 'delete' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveLength(1)
        expect(data.data[0].action).toBe('delete')
      }
    })

    it('should filter by resourceType', async () => {
      await insertTestAuditLog({ resourceType: 'user' })
      await insertTestAuditLog({ resourceType: 'role' })

      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: { resourceType: 'role' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveLength(1)
        expect(data.data[0].resourceType).toBe('role')
      }
    })

    it('should return logs with all fields', async () => {
      await insertTestAuditLog()

      const client = createTestClient()
      const res = await client.api['audit-logs'].$get(
        { query: {} },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success && data.data.length > 0) {
        const log = data.data[0]
        expect(log).toHaveProperty('id')
        expect(log).toHaveProperty('userId')
        expect(log).toHaveProperty('action')
        expect(log).toHaveProperty('resourceType')
        expect(log).toHaveProperty('createdAt')
      }
    })
  })

  describe('GET /api/audit-logs/:id', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api['audit-logs'][':id'].$get(
        { param: { id: 'some-id' } }
      )
      expect(res.status).toBe(401)
    })

    it('should return audit log by valid id', async () => {
      const logId = await insertTestAuditLog()

      const client = createTestClient()
      const res = await client.api['audit-logs'][':id'].$get(
        { param: { id: logId } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.id).toBe(logId)
        expect(data.data.userId).toBe('user-1')
        expect(data.data.action).toBe('create')
        expect(data.data.resourceType).toBe('user')
      }
    })

    it('should return 404 for non-existent id', async () => {
      const client = createTestClient()
      const res = await client.api['audit-logs'][':id'].$get(
        { param: { id: 'nonexistent-log-id' } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.error).toBe('Audit log not found')
      }
    })

    it('should return correct log when multiple logs exist', async () => {
      const logId1 = await insertTestAuditLog({ userId: 'user-a' })
      const logId2 = await insertTestAuditLog({ userId: 'user-b' })

      const client = createTestClient()
      const res = await client.api['audit-logs'][':id'].$get(
        { param: { id: logId1 } },
        { headers: authHeaders }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.id).toBe(logId1)
        expect(data.data.id).not.toBe(logId2)
      }
    })
  })
})
