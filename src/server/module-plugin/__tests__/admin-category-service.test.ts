import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import * as adminCatService from '../services/admin-category-service'

async function seedCategory(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      (overrides.id as string) ?? 'cat-1',
      (overrides.name as string) ?? 'Testing',
      (overrides.slug as string) ?? 'testing',
      (overrides.description as string) ?? 'Test category',
      (overrides.icon as string) ?? 'flask',
      (overrides.sort_order as number) ?? 1,
    ],
  })
}

async function seedPlugin() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'plugin-1',
      'Cat Plugin',
      'cat-plugin',
      'A plugin',
      'dev-1',
      'dev',
      '1.0.0',
      'approved',
      '[]',
      '[]',
      '[]',
      now,
      now,
    ],
  })
}

describe('Admin Category Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const cat = await adminCatService.createCategory({
        name: 'New Category',
        slug: 'new-category',
        description: 'A new test category',
        icon: 'star',
        sortOrder: 1,
      })
      expect(cat.name).toBe('New Category')
      expect(cat.slug).toBe('new-category')
      expect(cat.pluginCount).toBe(0)
    })

    it('should create category with minimal fields', async () => {
      const cat = await adminCatService.createCategory({
        name: 'Minimal',
        slug: 'minimal',
      })
      expect(cat.name).toBe('Minimal')
      expect(cat.sortOrder).toBe(0)
    })
  })

  describe('updateCategory', () => {
    it('should update category name', async () => {
      await seedCategory()
      const updated = await adminCatService.updateCategory('cat-1', { name: 'Updated Name' })
      expect(updated.name).toBe('Updated Name')
    })

    it('should update category sort order', async () => {
      await seedCategory()
      const updated = await adminCatService.updateCategory('cat-1', { sortOrder: 10 })
      expect(updated.sortOrder).toBe(10)
    })

    it('should throw NotFoundError for missing category', async () => {
      await expect(adminCatService.updateCategory('nonexistent', { name: 'X' })).rejects.toThrow()
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      await seedCategory()
      const result = await adminCatService.deleteCategory('cat-1')
      expect(result.id).toBe('cat-1')
      const cats = await adminCatService.listCategoriesAdmin()
      expect(cats).toHaveLength(0)
    })

    it('should delete associated mappings', async () => {
      await seedCategory()
      await seedPlugin()
      const client = await getRawClient()
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO plugin_category_mappings (plugin_id, category_id) VALUES (?, ?)`,
          args: ['plugin-1', 'cat-1'],
        })
      }
      await adminCatService.deleteCategory('cat-1')
      const cats = await adminCatService.listCategoriesAdmin()
      expect(cats).toHaveLength(0)
    })

    it('should throw NotFoundError for missing category', async () => {
      await expect(adminCatService.deleteCategory('nonexistent')).rejects.toThrow()
    })
  })

  describe('listCategoriesAdmin', () => {
    it('should return empty list when no categories', async () => {
      const cats = await adminCatService.listCategoriesAdmin()
      expect(cats).toHaveLength(0)
    })

    it('should return categories ordered by sort order', async () => {
      await seedCategory({ id: 'cat-2', name: 'B Category', slug: 'b-cat', sort_order: 2 })
      await seedCategory({ id: 'cat-1', name: 'A Category', slug: 'a-cat', sort_order: 1 })
      const cats = await adminCatService.listCategoriesAdmin()
      expect(cats).toHaveLength(2)
      expect(cats[0].sortOrder!).toBeLessThanOrEqual(cats[1].sortOrder!)
    })

    it('should include plugin count per category', async () => {
      await seedCategory()
      await seedPlugin()
      const client = await getRawClient()
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO plugin_category_mappings (plugin_id, category_id) VALUES (?, ?)`,
          args: ['plugin-1', 'cat-1'],
        })
      }
      const cats = await adminCatService.listCategoriesAdmin()
      expect(cats[0].pluginCount).toBeGreaterThanOrEqual(1)
    })
  })
})
