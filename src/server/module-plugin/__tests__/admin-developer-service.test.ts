import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import * as adminDevService from '../services/admin-developer-service'

async function seedDeveloper(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO developers (id, username, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      (overrides.id as string) ?? 'dev-1',
      (overrides.username as string) ?? 'devuser',
      (overrides.email as string) ?? 'dev@test.com',
      (overrides.password_hash as string) ?? 'hash123',
      (overrides.role as string) ?? 'user',
      now,
      now,
    ],
  })
}

async function seedPlugin(slug: string, downloadCount = 0, viewCount = 0) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, download_count, view_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `plugin-${slug}`,
      `Plugin ${slug}`,
      slug,
      'A test plugin description for testing purposes',
      'dev-1',
      'devuser',
      '1.0.0',
      'approved',
      '[]',
      '[]',
      '[]',
      downloadCount,
      viewCount,
      now,
      now,
    ],
  })
}

describe('Admin Developer Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('promoteToAdmin', () => {
    it('should promote a developer to super_admin', async () => {
      await seedDeveloper()
      const result = await adminDevService.promoteToAdmin('dev@test.com', 'admin-user')
      expect(result.role).toBe('super_admin')
      expect(result.username).toBe('admin-user')
    })

    it('should throw NotFoundError for missing developer', async () => {
      await expect(
        adminDevService.promoteToAdmin('nonexistent@test.com', 'admin')
      ).rejects.toThrow()
    })
  })

  describe('listAllDevelopers', () => {
    it('should return empty list when no developers', async () => {
      const devs = await adminDevService.listAllDevelopers()
      expect(devs).toHaveLength(0)
    })

    it('should list all developers with roles', async () => {
      await seedDeveloper({ id: 'dev-1', username: 'user1', email: 'a@test.com', role: 'user' })
      await seedDeveloper({ id: 'dev-2', username: 'user2', email: 'b@test.com', role: 'super_admin' })
      const devs = await adminDevService.listAllDevelopers()
      expect(devs).toHaveLength(2)
      expect(devs.map(d => d.role)).toContain('user')
      expect(devs.map(d => d.role)).toContain('super_admin')
    })
  })

  describe('resetSeedPluginCounts', () => {
    it('should reset download and view counts for given slugs', async () => {
      await seedPlugin('plugin-a', 100, 50)
      await seedPlugin('plugin-b', 200, 80)
      const result = await adminDevService.resetSeedPluginCounts(['plugin-a', 'plugin-b'])
      expect(result.reset).toBe(2)
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const rows = await client.execute({ sql: `SELECT download_count, view_count FROM plugins WHERE slug = ?`, args: ['plugin-a'] })
        const row = rows.rows?.[0] as Record<string, unknown> | undefined
        expect(Number(row?.download_count ?? 0)).toBe(0)
        expect(Number(row?.view_count ?? 0)).toBe(0)
      }
    })

    it('should handle empty slugs array', async () => {
      const result = await adminDevService.resetSeedPluginCounts([])
      expect(result.reset).toBe(0)
    })

    it('should handle non-existent slugs gracefully', async () => {
      const result = await adminDevService.resetSeedPluginCounts(['nonexistent'])
      expect(result.reset).toBe(1)
    })
  })
})
