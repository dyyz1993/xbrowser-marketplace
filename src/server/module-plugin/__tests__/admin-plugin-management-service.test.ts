import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import * as adminMgmt from '../services/admin-plugin-management-service'

async function seedPlugin(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      (overrides.id as string) ?? 'plugin-1',
      (overrides.name as string) ?? 'Mgmt Plugin',
      (overrides.slug as string) ?? 'mgmt-plugin',
      (overrides.description as string) ?? 'Admin management test plugin',
      (overrides.author_id as string) ?? 'dev-1',
      (overrides.author_name as string) ?? 'devuser',
      (overrides.version as string) ?? '1.0.0',
      (overrides.status as string) ?? 'pending',
      '["test"]',
      '[]',
      '[]',
      (overrides.featured as number) ?? 0,
      now,
      now,
    ],
  })
}

describe('Admin Plugin Management Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('listPendingPlugins', () => {
    it('should return empty list when no plugins', async () => {
      const result = await adminMgmt.listPendingPlugins({})
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should list pending plugins by default', async () => {
      await seedPlugin({ status: 'pending' })
      const result = await adminMgmt.listPendingPlugins({})
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by specific status', async () => {
      await seedPlugin({ status: 'approved' })
      const result = await adminMgmt.listPendingPlugins({ status: 'approved' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should respect pagination', async () => {
      await seedPlugin({ id: 'p-1', slug: 's-1' })
      await seedPlugin({ id: 'p-2', slug: 's-2' })
      const result = await adminMgmt.listPendingPlugins({ page: 1, limit: 1 })
      expect(result.items.length).toBeLessThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })
  })

  describe('approvePlugin', () => {
    it('should approve a pending plugin', async () => {
      await seedPlugin({ status: 'pending' })
      const result = await adminMgmt.approvePlugin('mgmt-plugin', 'admin-1')
      expect(result.status).toBe('approved')
      expect(result.slug).toBe('mgmt-plugin')
    })

    it('should throw NotFoundError for missing plugin', async () => {
      await expect(adminMgmt.approvePlugin('nonexistent', 'admin-1')).rejects.toThrow()
    })

    it('should throw error when already approved', async () => {
      await seedPlugin({ status: 'approved' })
      await expect(adminMgmt.approvePlugin('mgmt-plugin', 'admin-1')).rejects.toThrow()
    })
  })

  describe('rejectPlugin', () => {
    it('should reject a pending plugin with reason', async () => {
      await seedPlugin({ status: 'pending' })
      const result = await adminMgmt.rejectPlugin('mgmt-plugin', 'Not suitable', 'admin-1')
      expect(result.status).toBe('rejected')
    })

    it('should throw NotFoundError for missing plugin', async () => {
      await expect(adminMgmt.rejectPlugin('nonexistent', 'reason', 'admin-1')).rejects.toThrow()
    })

    it('should throw error when already rejected', async () => {
      await seedPlugin({ status: 'rejected' })
      await expect(adminMgmt.rejectPlugin('mgmt-plugin', 'reason', 'admin-1')).rejects.toThrow()
    })
  })

  describe('toggleFeatured', () => {
    it('should feature an approved plugin', async () => {
      await seedPlugin({ status: 'approved', featured: 0 })
      const result = await adminMgmt.toggleFeatured('mgmt-plugin')
      expect(result.featured).toBe(true)
    })

    it('should unfeature a featured plugin', async () => {
      await seedPlugin({ status: 'approved', featured: 1 })
      const result = await adminMgmt.toggleFeatured('mgmt-plugin')
      expect(result.featured).toBe(false)
    })

    it('should throw NotFoundError for missing plugin', async () => {
      await expect(adminMgmt.toggleFeatured('nonexistent')).rejects.toThrow()
    })

    it('should throw error for non-approved plugin', async () => {
      await seedPlugin({ status: 'pending' })
      await expect(adminMgmt.toggleFeatured('mgmt-plugin')).rejects.toThrow()
    })
  })

  describe('adminRemovePlugin', () => {
    it('should soft-delete a plugin by setting status to removed', async () => {
      await seedPlugin({ status: 'approved' })
      const result = await adminMgmt.adminRemovePlugin('mgmt-plugin')
      expect(result.id).toBe('plugin-1')
    })

    it('should throw NotFoundError for missing plugin', async () => {
      await expect(adminMgmt.adminRemovePlugin('nonexistent')).rejects.toThrow()
    })
  })
})
