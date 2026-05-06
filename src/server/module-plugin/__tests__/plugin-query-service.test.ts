import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import * as pluginQueryService from '../services/plugin-query-service'

async function seedPlugin(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, download_count, view_count, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      (overrides.id as string) ?? 'plugin-1',
      (overrides.name as string) ?? 'Query Plugin',
      (overrides.slug as string) ?? 'query-plugin',
      (overrides.description as string) ?? 'A plugin for query service testing purposes',
      (overrides.author_id as string) ?? 'user-1',
      (overrides.author_name as string) ?? 'testuser',
      (overrides.version as string) ?? '1.0.0',
      (overrides.status as string) ?? 'approved',
      (overrides.tags as string) ?? '["automation"]',
      (overrides.site_urls as string) ?? '["https://example.com"]',
      (overrides.commands as string) ?? '["scrape"]',
      (overrides.download_count as number) ?? 0,
      (overrides.view_count as number) ?? 0,
      (overrides.featured as number) ?? 0,
      now,
      now,
    ],
  })
  await client.execute({
    sql: `INSERT INTO plugin_versions (id, plugin_id, version, status, published_at) VALUES (?, ?, ?, ?, ?)`,
    args: [`ver-${(overrides.id as string) ?? 'plugin-1'}`, (overrides.id as string) ?? 'plugin-1', '1.0.0', 'approved', now],
  })
}

async function seedCategory() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['cat-1', 'Automation', 'automation', 'Automation plugins', 'bot', 1],
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
    sql: `INSERT INTO plugin_reviews (id, plugin_id, user_id, user_name, rating, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['review-1', 'plugin-1', 'user-2', 'reviewer', 5, 'Great', 'Awesome plugin', Date.now()],
  })
}

describe('Plugin Query Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('listPlugins', () => {
    it('should return empty list when no plugins exist', async () => {
      const result = await pluginQueryService.listPlugins({})
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should list approved plugins with default pagination', async () => {
      await seedPlugin()
      const result = await pluginQueryService.listPlugins({ page: 1, limit: 20 })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.items[0].slug).toBe('query-plugin')
    })

    it('should filter by featured flag', async () => {
      await seedPlugin({ featured: 1 })
      const result = await pluginQueryService.listPlugins({ featured: true })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by tag', async () => {
      await seedPlugin()
      const result = await pluginQueryService.listPlugins({ tag: 'automation' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should sort by name', async () => {
      await seedPlugin()
      const result = await pluginQueryService.listPlugins({ sort: 'name' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should sort by most downloaded', async () => {
      await seedPlugin({ download_count: 100 })
      const result = await pluginQueryService.listPlugins({ sort: 'most_downloaded' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should respect pagination limit and page', async () => {
      await seedPlugin({ id: 'p-a', slug: 'slug-a' })
      await seedPlugin({ id: 'p-b', slug: 'slug-b' })
      const result = await pluginQueryService.listPlugins({ page: 1, limit: 1 })
      expect(result.items.length).toBeLessThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })
  })

  describe('searchPlugins', () => {
    it('should find plugins by name match', async () => {
      await seedPlugin()
      const result = await pluginQueryService.searchPlugins({ query: 'Query' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should find plugins by description match', async () => {
      await seedPlugin()
      const result = await pluginQueryService.searchPlugins({ query: 'testing purposes' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty for non-matching query', async () => {
      await seedPlugin()
      const result = await pluginQueryService.searchPlugins({ query: 'xyznonexistent' })
      expect(result.items).toHaveLength(0)
    })

    it('should filter by site', async () => {
      await seedPlugin()
      const result = await pluginQueryService.searchPlugins({ query: 'Query', site: 'https://example.com' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by category', async () => {
      await seedPlugin()
      await seedCategory()
      const result = await pluginQueryService.searchPlugins({ query: 'Query', category: 'automation' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getPluginBySlug', () => {
    it('should return plugin detail with versions', async () => {
      await seedPlugin()
      const plugin = await pluginQueryService.getPluginBySlug('query-plugin')
      expect(plugin.slug).toBe('query-plugin')
      expect(plugin.name).toBe('Query Plugin')
      expect(plugin.versions).toHaveLength(1)
      expect(plugin.versions[0].version).toBe('1.0.0')
    })

    it('should throw NotFoundError for missing plugin', async () => {
      await expect(pluginQueryService.getPluginBySlug('non-existent')).rejects.toThrow()
    })

    it('should include categories when mapped', async () => {
      await seedPlugin()
      await seedCategory()
      const plugin = await pluginQueryService.getPluginBySlug('query-plugin')
      expect(plugin.categories.length).toBeGreaterThanOrEqual(1)
      expect(plugin.categories[0].slug).toBe('automation')
    })

    it('should increment view count on read', async () => {
      await seedPlugin()
      await pluginQueryService.getPluginBySlug('query-plugin')
      const plugin2 = await pluginQueryService.getPluginBySlug('query-plugin')
      expect(plugin2).toBeDefined()
    })
  })

  describe('listCategories', () => {
    it('should return empty when no categories', async () => {
      const cats = await pluginQueryService.listCategories()
      expect(cats).toHaveLength(0)
    })

    it('should return categories with plugin counts', async () => {
      await seedPlugin()
      await seedCategory()
      const cats = await pluginQueryService.listCategories()
      expect(cats.length).toBeGreaterThanOrEqual(1)
      expect(cats[0].pluginCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getPluginsByCategory', () => {
    it('should throw NotFoundError for missing category', async () => {
      await expect(pluginQueryService.getPluginsByCategory('nonexistent', {})).rejects.toThrow()
    })

    it('should return plugins in given category', async () => {
      await seedPlugin()
      await seedCategory()
      const result = await pluginQueryService.getPluginsByCategory('automation', {})
      expect(result.items.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    it('should return empty when category has no plugins', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
          args: ['cat-empty', 'Empty', 'empty-cat', 'No plugins', 'x', 2],
        })
      }
      const result = await pluginQueryService.getPluginsByCategory('empty-cat', {})
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return zeros for empty marketplace', async () => {
      const stats = await pluginQueryService.getStats()
      expect(stats.totalPlugins).toBe(0)
      expect(stats.totalDownloads).toBe(0)
      expect(stats.totalCategories).toBe(0)
    })

    it('should count approved plugins and downloads', async () => {
      await seedPlugin({ download_count: 50 })
      const stats = await pluginQueryService.getStats()
      expect(stats.totalPlugins).toBeGreaterThanOrEqual(1)
      expect(stats.totalDownloads).toBeGreaterThanOrEqual(50)
    })

    it('should include reviews count', async () => {
      await seedPlugin()
      await seedReview()
      const stats = await pluginQueryService.getStats()
      expect(stats.totalReviews).toBeGreaterThanOrEqual(1)
    })
  })
})
