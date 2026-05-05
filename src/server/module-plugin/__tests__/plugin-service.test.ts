import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import * as pluginService from '../services/plugin-service'

async function seedPlugin() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'plugin-1',
      'Test Plugin',
      'test-plugin',
      'A test plugin for automated testing',
      'user-1',
      'testuser',
      '1.0.0',
      'approved',
      '["automation"]',
      '["https://example.com"]',
      '["scrape"]',
      now,
      now,
    ],
  })
  await client.execute({
    sql: `INSERT INTO plugin_versions (id, plugin_id, version, status, published_at) VALUES (?, ?, ?, ?, ?)`,
    args: ['ver-1', 'plugin-1', '1.0.0', 'approved', now],
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

describe('Plugin Service', () => {
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
    it('should return empty list when no plugins', async () => {
      const result = await pluginService.listPlugins({})
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should list plugins with default pagination', async () => {
      await seedPlugin()
      const result = await pluginService.listPlugins({ page: 1, limit: 20 })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.items[0].slug).toBe('test-plugin')
    })

    it('should filter by featured', async () => {
      await seedPlugin()
      const result = await pluginService.listPlugins({ featured: true })
      expect(result.items).toHaveLength(0)
    })

    it('should sort by newest by default', async () => {
      await seedPlugin()
      const result = await pluginService.listPlugins({ sort: 'newest' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should sort by name', async () => {
      await seedPlugin()
      const result = await pluginService.listPlugins({ sort: 'name' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should respect pagination limit', async () => {
      await seedPlugin()
      const result = await pluginService.listPlugins({ page: 1, limit: 1 })
      expect(result.items.length).toBeLessThanOrEqual(1)
    })
  })

  describe('searchPlugins', () => {
    it('should find plugins by name', async () => {
      await seedPlugin()
      const result = await pluginService.searchPlugins({ query: 'Test' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should find plugins by description', async () => {
      await seedPlugin()
      const result = await pluginService.searchPlugins({ query: 'automated' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty for non-matching query', async () => {
      await seedPlugin()
      const result = await pluginService.searchPlugins({ query: 'xyznonexistent' })
      expect(result.items).toHaveLength(0)
    })

    it('should filter by tag', async () => {
      await seedPlugin()
      const result = await pluginService.searchPlugins({ query: 'Test', tag: 'automation' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by site', async () => {
      await seedPlugin()
      const result = await pluginService.searchPlugins({ query: 'Test', site: 'https://example.com' })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getPluginBySlug', () => {
    it('should return plugin detail', async () => {
      await seedPlugin()
      const plugin = await pluginService.getPluginBySlug('test-plugin')
      expect(plugin.slug).toBe('test-plugin')
      expect(plugin.name).toBe('Test Plugin')
      expect(plugin.authorId).toBe('user-1')
    })

    it('should throw NotFoundError for missing plugin', async () => {
      await expect(pluginService.getPluginBySlug('non-existent')).rejects.toThrow()
    })
  })

  describe('createPlugin', () => {
    it('should create a plugin with pending status', async () => {
      const plugin = await pluginService.createPlugin(
        {
          name: 'New Plugin',
          slug: 'new-plugin',
          description: 'A brand new plugin for testing purposes here',
          version: '1.0.0',
          license: 'MIT',
          tags: ['new'],
          siteUrls: ['https://new.example.com'],
          commands: ['run'],
        },
        'user-1',
        'testuser'
      )
      expect(plugin.slug).toBe('new-plugin')
      expect(plugin.status).toBe('pending')
      expect(plugin.authorName).toBe('testuser')
    })

    it('should throw on duplicate slug', async () => {
      await pluginService.createPlugin(
        {
          name: 'Dup Plugin',
          slug: 'dup-plugin',
          description: 'First plugin with this description text',
          version: '1.0.0',
          license: 'MIT',
        },
        'user-1',
        'testuser'
      )
      await expect(
        pluginService.createPlugin(
          {
            name: 'Dup Plugin 2',
            slug: 'dup-plugin',
            description: 'Second plugin with the same slug name here',
            version: '1.0.0',
            license: 'MIT',
          },
          'user-1',
          'testuser'
        )
      ).rejects.toThrow()
    })
  })

  describe('trackInstall', () => {
    it('should increment download count', async () => {
      await seedPlugin()
      const result = await pluginService.trackInstall('test-plugin')
      expect(result.downloadCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('listCategories', () => {
    it('should return empty when no categories', async () => {
      const cats = await pluginService.listCategories()
      expect(cats).toHaveLength(0)
    })

    it('should return categories with plugin counts', async () => {
      await seedPlugin()
      await seedCategory()
      const cats = await pluginService.listCategories()
      expect(cats.length).toBeGreaterThanOrEqual(1)
      expect(cats[0].pluginCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getStats', () => {
    it('should return zeros for empty marketplace', async () => {
      const stats = await pluginService.getStats()
      expect(stats.totalPlugins).toBe(0)
      expect(stats.totalDownloads).toBe(0)
      expect(stats.totalCategories).toBe(0)
    })

    it('should count approved plugins', async () => {
      await seedPlugin()
      const stats = await pluginService.getStats()
      expect(stats.totalPlugins).toBeGreaterThanOrEqual(1)
    })
  })
})
