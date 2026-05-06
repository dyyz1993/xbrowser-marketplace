import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import * as reviewService from '../services/plugin-review-service'

async function seedPlugin(status = 'approved') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'plugin-1',
      'Review Test Plugin',
      'review-plugin',
      'A plugin for review testing purposes',
      'user-1',
      'testuser',
      '1.0.0',
      status,
      '["test"]',
      '[]',
      '[]',
      now,
      now,
    ],
  })
}

async function seedReview(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  await client.execute({
    sql: `INSERT INTO plugin_reviews (id, plugin_id, user_id, user_name, rating, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      (overrides.id as string) ?? 'review-1',
      (overrides.plugin_id as string) ?? 'plugin-1',
      (overrides.user_id as string) ?? 'user-2',
      (overrides.user_name as string) ?? 'reviewer',
      (overrides.rating as number) ?? 5,
      (overrides.title as string) ?? 'Great plugin',
      (overrides.content as string) ?? 'Really useful',
      Date.now(),
    ],
  })
}

describe('Plugin Review Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('getReviewStatsForPlugin', () => {
    it('should return zeros when no reviews', async () => {
      const stats = await reviewService.getReviewStatsForPlugin('plugin-1')
      expect(stats.avgRating).toBe(0)
      expect(stats.reviewCount).toBe(0)
    })

    it('should compute average rating and count', async () => {
      await seedPlugin()
      await seedReview({ rating: 5 })
      await seedReview({ id: 'review-2', user_id: 'user-3', user_name: 'bob', rating: 3 })
      const stats = await reviewService.getReviewStatsForPlugin('plugin-1')
      expect(stats.reviewCount).toBe(2)
      expect(stats.avgRating).toBe(4)
    })
  })

  describe('getReviewStatsBatch', () => {
    it('should return empty map for empty input', async () => {
      const result = await reviewService.getReviewStatsBatch([])
      expect(result.size).toBe(0)
    })

    it('should return stats for multiple plugins', async () => {
      await seedPlugin()
      await seedReview({ rating: 4 })
      const result = await reviewService.getReviewStatsBatch(['plugin-1', 'plugin-x'])
      expect(result.get('plugin-1')?.reviewCount).toBe(1)
      expect(result.get('plugin-x')?.reviewCount).toBe(0)
    })
  })

  describe('submitReview', () => {
    it('should create a review for an approved plugin', async () => {
      await seedPlugin('approved')
      const review = await reviewService.submitReview(
        'review-plugin',
        { rating: 4, title: 'Good', content: 'Nice work' },
        'user-2',
        'reviewer'
      )
      expect(review.rating).toBe(4)
      expect(review.title).toBe('Good')
      expect(review.userName).toBe('reviewer')
    })

    it('should throw NotFoundError for non-existent plugin', async () => {
      await expect(
        reviewService.submitReview('nonexistent', { rating: 5 }, 'user-1', 'test')
      ).rejects.toThrow()
    })

    it('should throw ConflictError for non-approved plugin', async () => {
      await seedPlugin('pending')
      await expect(
        reviewService.submitReview('review-plugin', { rating: 3 }, 'user-2', 'reviewer')
      ).rejects.toThrow()
    })

    it('should throw ConflictError for duplicate review', async () => {
      await seedPlugin('approved')
      await reviewService.submitReview('review-plugin', { rating: 4 }, 'user-2', 'reviewer')
      await expect(
        reviewService.submitReview('review-plugin', { rating: 2 }, 'user-2', 'reviewer')
      ).rejects.toThrow()
    })
  })

  describe('getReviews', () => {
    it('should return paginated reviews', async () => {
      await seedPlugin()
      await seedReview({ id: 'r-1', user_id: 'u-1', user_name: 'a', rating: 5 })
      await seedReview({ id: 'r-2', user_id: 'u-2', user_name: 'b', rating: 4 })
      const result = await reviewService.getReviews('review-plugin', { page: 1, limit: 10 })
      expect(result.items.length).toBeGreaterThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('should throw NotFoundError for non-existent plugin', async () => {
      await expect(reviewService.getReviews('nonexistent', { page: 1 })).rejects.toThrow()
    })

    it('should respect pagination limit', async () => {
      await seedPlugin()
      await seedReview({ id: 'r-1', user_id: 'u-1', user_name: 'a', rating: 5 })
      await seedReview({ id: 'r-2', user_id: 'u-2', user_name: 'b', rating: 4 })
      const result = await reviewService.getReviews('review-plugin', { page: 1, limit: 1 })
      expect(result.items.length).toBeLessThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })
  })

  describe('deleteReview', () => {
    it('should allow author to delete their review', async () => {
      await seedPlugin()
      await seedReview()
      const result = await reviewService.deleteReview('review-plugin', 'review-1', 'user-2', 'user')
      expect(result.id).toBe('review-1')
      const reviews = await reviewService.getReviews('review-plugin', { page: 1 })
      expect(reviews.total).toBe(0)
    })

    it('should allow admin to delete any review', async () => {
      await seedPlugin()
      await seedReview()
      const result = await reviewService.deleteReview(
        'review-plugin',
        'review-1',
        'admin-1',
        'super_admin'
      )
      expect(result.id).toBe('review-1')
    })

    it('should throw NotFoundError for non-existent plugin', async () => {
      await expect(
        reviewService.deleteReview('nonexistent', 'review-1', 'user-2', 'user')
      ).rejects.toThrow()
    })

    it('should throw NotFoundError for non-existent review', async () => {
      await seedPlugin()
      await expect(
        reviewService.deleteReview('review-plugin', 'nonexistent', 'user-2', 'user')
      ).rejects.toThrow()
    })

    it('should throw AuthorizationError for non-owner non-admin', async () => {
      await seedPlugin()
      await seedReview()
      await expect(
        reviewService.deleteReview('review-plugin', 'review-1', 'other-user', 'user')
      ).rejects.toThrow()
    })
  })
})
