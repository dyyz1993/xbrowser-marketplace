import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import * as adminStatsService from '../services/admin-stats-service'

async function seedPlugin(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, download_count, view_count, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      (overrides.id as string) ?? 'plugin-1',
      (overrides.name as string) ?? 'Stats Plugin',
      (overrides.slug as string) ?? 'stats-plugin',
      (overrides.description as string) ?? 'A plugin for stats testing',
      (overrides.author_id as string) ?? 'dev-1',
      (overrides.author_name as string) ?? 'devuser',
      (overrides.version as string) ?? '1.0.0',
      (overrides.status as string) ?? 'approved',
      '["test"]',
      '[]',
      '[]',
      (overrides.download_count as number) ?? 10,
      (overrides.view_count as number) ?? 20,
      (overrides.featured as number) ?? 0,
      now,
      now,
    ],
  })
}

async function seedDeveloper() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO developers (id, username, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['dev-1', 'devuser', 'dev@test.com', 'hash', 'user', Date.now(), Date.now()],
  })
}

async function seedCategoryAndMapping() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['cat-1', 'Testing', 'testing', 'Test category', 'flask', 1],
  })
  await client.execute({
    sql: `INSERT INTO plugin_category_mappings (plugin_id, category_id) VALUES (?, ?)`,
    args: ['plugin-1', 'cat-1'],
  })
}

async function seedReview() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_reviews (id, plugin_id, user_id, user_name, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['rev-1', 'plugin-1', 'user-2', 'reviewer', 4, Date.now()],
  })
}

describe('Admin Stats Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('getDashboardStats', () => {
    it('should return zeros for empty database', async () => {
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.totalPlugins).toBe(0)
      expect(stats.pendingPlugins).toBe(0)
      expect(stats.approvedPlugins).toBe(0)
      expect(stats.totalDownloads).toBe(0)
      expect(stats.totalViews).toBe(0)
      expect(stats.totalReviews).toBe(0)
      expect(stats.activeDevelopers).toBe(0)
    })

    it('should count plugins by status correctly', async () => {
      await seedPlugin({ id: 'p-1', slug: 's-1', status: 'pending' })
      await seedPlugin({ id: 'p-2', slug: 's-2', status: 'approved', download_count: 30 })
      await seedPlugin({ id: 'p-3', slug: 's-3', status: 'rejected' })
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.totalPlugins).toBe(3)
      expect(stats.pendingPlugins).toBe(1)
      expect(stats.approvedPlugins).toBe(1)
      expect(stats.rejectedPlugins).toBe(1)
    })

    it('should sum downloads and views of approved plugins', async () => {
      await seedPlugin({ download_count: 50, view_count: 100 })
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.totalDownloads).toBe(50)
      expect(stats.totalViews).toBe(100)
    })

    it('should count active developers', async () => {
      await seedPlugin({ author_id: 'dev-a' })
      await seedPlugin({ id: 'p-2', slug: 's-2', author_id: 'dev-b' })
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.activeDevelopers).toBeGreaterThanOrEqual(2)
    })

    it('should include reviews count', async () => {
      await seedPlugin()
      await seedReview()
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.totalReviews).toBeGreaterThanOrEqual(1)
    })

    it('should include plugins by category breakdown', async () => {
      await seedPlugin()
      await seedCategoryAndMapping()
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.pluginsByCategory.length).toBeGreaterThanOrEqual(1)
      expect(stats.pluginsByCategory[0].category).toBe('Testing')
    })

    it('should include developer roles breakdown', async () => {
      await seedDeveloper()
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.developerRoles.length).toBeGreaterThanOrEqual(1)
    })

    it('should include recent submissions', async () => {
      await seedPlugin()
      const stats = await adminStatsService.getDashboardStats()
      expect(stats.recentSubmissions.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getPluginInventory', () => {
    it('should return empty inventory for no plugins', async () => {
      const inv = await adminStatsService.getPluginInventory()
      expect(inv.plugins).toHaveLength(0)
      expect(inv.summary.total).toBe(0)
    })

    it('should list all non-removed plugins with stats', async () => {
      await seedPlugin()
      const inv = await adminStatsService.getPluginInventory()
      expect(inv.plugins.length).toBeGreaterThanOrEqual(1)
      expect(inv.summary.total).toBeGreaterThanOrEqual(1)
    })

    it('should compute review stats per plugin', async () => {
      await seedPlugin()
      await seedReview()
      const inv = await adminStatsService.getPluginInventory()
      const p = inv.plugins.find(p => p.id === 'plugin-1')
      expect(p?.reviewCount).toBeGreaterThanOrEqual(1)
      expect(p?.avgRating).toBeGreaterThanOrEqual(1)
    })

    it('should count category mappings per plugin', async () => {
      await seedPlugin()
      await seedCategoryAndMapping()
      const inv = await adminStatsService.getPluginInventory()
      const p = inv.plugins.find(p => p.id === 'plugin-1')
      expect(p?.categoryCount).toBeGreaterThanOrEqual(1)
    })

    it('should summarize featured and downloaded plugins', async () => {
      await seedPlugin({ featured: 1, download_count: 5 })
      const inv = await adminStatsService.getPluginInventory()
      expect(inv.summary.featured).toBeGreaterThanOrEqual(1)
      expect(inv.summary.withDownloads).toBeGreaterThanOrEqual(1)
    })
  })
})
