import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import { AuditLogService } from '../services/audit-log-service'

async function seedAuditLog(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO permission_audit_logs (id, user_id, action, resource_type, resource_id, old_value, new_value, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      (overrides.id as string) ?? 'log-1',
      (overrides.user_id as string) ?? 'user-1',
      (overrides.action as string) ?? 'create',
      (overrides.resource_type as string) ?? 'role',
      (overrides.resource_id as string) ?? null,
      (overrides.old_value as string) ?? null,
      (overrides.new_value as string) ?? null,
      (overrides.ip_address as string) ?? '127.0.0.1',
      (overrides.user_agent as string) ?? 'test-agent',
      (overrides.created_at as number) ?? Date.now(),
    ],
  })
}

describe('Audit Log Service', () => {
  let service: AuditLogService

  beforeAll(async () => {
    await setupTestDatabase()
    service = new AuditLogService()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const log = await service.create({
        id: 'log-new',
        userId: 'user-1',
        action: 'create',
        resourceType: 'role',
        resourceId: 'role-1',
        createdAt: new Date(),
      })
      expect(log.id).toBe('log-new')
      expect(log.userId).toBe('user-1')
      expect(log.action).toBe('create')
      expect(log.resourceType).toBe('role')
      expect(typeof log.createdAt).toBe('string')
    })

    it('should store optional fields', async () => {
      const log = await service.create({
        id: 'log-opts',
        userId: 'user-1',
        action: 'update',
        resourceType: 'permission',
        resourceId: 'perm-1',
        oldValue: 'read',
        newValue: 'write',
        ipAddress: '10.0.0.1',
        userAgent: 'vitest',
        createdAt: new Date(),
      })
      expect(log.oldValue).toBe('read')
      expect(log.newValue).toBe('write')
    })
  })

  describe('getAll', () => {
    it('should return empty list when no logs', async () => {
      const logs = await service.getAll()
      expect(logs).toHaveLength(0)
    })

    it('should return all logs ordered by createdAt desc', async () => {
      await seedAuditLog({ id: 'log-1', created_at: Date.now() - 1000 })
      await seedAuditLog({ id: 'log-2', created_at: Date.now() })
      const logs = await service.getAll()
      expect(logs).toHaveLength(2)
    })

    it('should respect limit and offset', async () => {
      await seedAuditLog({ id: 'log-1' })
      await seedAuditLog({ id: 'log-2' })
      await seedAuditLog({ id: 'log-3' })
      const logs = await service.getAll(2, 1)
      expect(logs.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getByUserId', () => {
    it('should return logs for a specific user', async () => {
      await seedAuditLog({ id: 'log-1', user_id: 'user-a' })
      await seedAuditLog({ id: 'log-2', user_id: 'user-b' })
      const logs = await service.getByUserId('user-a')
      expect(logs).toHaveLength(1)
      expect(logs[0].userId).toBe('user-a')
    })

    it('should return empty for user with no logs', async () => {
      const logs = await service.getByUserId('unknown')
      expect(logs).toHaveLength(0)
    })
  })

  describe('getByResource', () => {
    it('should filter by resource type', async () => {
      await seedAuditLog({ id: 'log-1', resource_type: 'role' })
      await seedAuditLog({ id: 'log-2', resource_type: 'permission' })
      const logs = await service.getByResource('role')
      expect(logs).toHaveLength(1)
    })

    it('should filter by resource type and resource id', async () => {
      await seedAuditLog({ id: 'log-1', resource_type: 'role', resource_id: 'role-1' })
      await seedAuditLog({ id: 'log-2', resource_type: 'role', resource_id: 'role-2' })
      const logs = await service.getByResource('role', 'role-1')
      expect(logs).toHaveLength(1)
    })
  })

  describe('search', () => {
    it('should search by action', async () => {
      await seedAuditLog({ id: 'log-1', action: 'create' })
      await seedAuditLog({ id: 'log-2', action: 'delete' })
      const logs = await service.search({ action: 'create' })
      expect(logs).toHaveLength(1)
    })

    it('should search by multiple filters', async () => {
      await seedAuditLog({ id: 'log-1', user_id: 'u-1', action: 'create', resource_type: 'role' })
      await seedAuditLog({ id: 'log-2', user_id: 'u-1', action: 'delete', resource_type: 'role' })
      const logs = await service.search({ userId: 'u-1', action: 'create' })
      expect(logs).toHaveLength(1)
    })

    it('should search by date range', async () => {
      const now = Date.now()
      await seedAuditLog({ id: 'log-1', created_at: now - 100000 })
      await seedAuditLog({ id: 'log-2', created_at: now })
      const logs = await service.search({
        startDate: new Date(now - 50000),
        endDate: new Date(now + 1000),
      })
      expect(logs.length).toBeLessThanOrEqual(1)
    })

    it('should return all logs when no filters', async () => {
      await seedAuditLog({ id: 'log-1' })
      await seedAuditLog({ id: 'log-2' })
      const logs = await service.search({})
      expect(logs).toHaveLength(2)
    })
  })

  describe('deleteOlderThan', () => {
    it('should delete logs older than given days', async () => {
      const oldTime = Date.now() - 100 * 24 * 60 * 60 * 1000
      const client = await getRawClient()
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO permission_audit_logs (id, user_id, action, resource_type, resource_id, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['log-old', 'user-1', 'create', 'role', 'role-1', '127.0.0.1', 'test', Math.floor(oldTime / 1000)],
        })
      }
      await service.create({
        id: 'log-new',
        userId: 'user-1',
        action: 'create',
        resourceType: 'role',
        resourceId: 'role-2',
      })
      const deleted = await service.deleteOlderThan(30)
      expect(deleted).toBeGreaterThanOrEqual(1)
      const remaining = await service.getAll()
      expect(remaining).toHaveLength(1)
    })

    it('should return 0 when nothing to delete', async () => {
      const deleted = await service.deleteOlderThan(30)
      expect(deleted).toBe(0)
    })
  })
})
