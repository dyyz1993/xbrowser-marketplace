import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb } from '@server/db'
import { contents } from '@server/db/schema'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import * as service from '../services/content-service'

describe('Admin Content Service', () => {
  let testContentId: number

  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    await db.delete(contents)
  })

  afterAll(async () => {
    try {
      const db = await getDb()
      await db.delete(contents)
    } catch {
      // ignore
    }
    await cleanupTestDatabase()
  })

  describe('createContent', () => {
    it('should create a new content', async () => {
      const result = await service.createContent({
        title: 'Test Title',
        slug: 'test-title',
        content: 'Test Content',
        category: 'article',
        authorId: 'admin',
        authorName: '管理员',
      })

      expect(result).toMatchObject({
        title: 'Test Title',
        slug: 'test-title',
        content: 'Test Content',
        category: 'article',
        status: 'draft',
      })
      expect(result.id).toBeDefined()
      testContentId = result.id
    })
  })

  describe('getContents', () => {
    it('should return contents with pagination', async () => {
      const result = await service.getContents()
      expect(result.items).toBeDefined()
      expect(result.total).toBeGreaterThanOrEqual(0)
    })

    it('should filter contents by category', async () => {
      const result = await service.getContents({ category: 'article' })
      result.items.forEach(content => {
        expect(content.category).toBe('article')
      })
    })

    it('should filter contents by status', async () => {
      const result = await service.getContents({ status: 'draft' })
      result.items.forEach(content => {
        expect(content.status).toBe('draft')
      })
    })
  })

  describe('getContentById', () => {
    it('should return content when id exists', async () => {
      const result = await service.getContentById(testContentId)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(testContentId)
    })

    it('should return null for non-existent content', async () => {
      const result = await service.getContentById(999999)
      expect(result).toBeNull()
    })
  })

  describe('updateContent', () => {
    it('should update existing content', async () => {
      const result = await service.updateContent(testContentId, {
        title: 'Updated Title',
        content: 'Updated Content',
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('Updated Title')
      expect(result?.content).toBe('Updated Content')
    })

    it('should return null for non-existent content', async () => {
      const result = await service.updateContent(999999, { title: 'New Title' })
      expect(result).toBeNull()
    })
  })

  describe('publishContent', () => {
    it('should publish a draft content', async () => {
      const result = await service.publishContent(testContentId)

      expect(result).not.toBeNull()
      expect(result?.status).toBe('published')
      expect(result?.publishedAt).toBeDefined()
    })
  })

  describe('archiveContent', () => {
    it('should archive a published content', async () => {
      const result = await service.archiveContent(testContentId)

      expect(result).not.toBeNull()
      expect(result?.status).toBe('archived')
    })
  })

  describe('deleteContent', () => {
    it('should delete an existing content', async () => {
      const result = await service.deleteContent(testContentId)
      expect(result).toBe(true)

      const found = await service.getContentById(testContentId)
      expect(found).toBeNull()
    })

    it('should return false for non-existent content', async () => {
      const result = await service.deleteContent(999999)
      expect(result).toBe(false)
    })
  })
})
