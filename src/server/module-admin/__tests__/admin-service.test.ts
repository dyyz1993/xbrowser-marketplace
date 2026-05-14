import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as adminService from '../services/admin-service'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'

describe('Admin Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('getSystemStats', () => {
    it('should return stats with plugin fields', async () => {
      const stats = await adminService.getSystemStats()

      expect(stats.lastUpdated).toBeDefined()
      expect(typeof stats.totalPlugins).toBe('number')
      expect(typeof stats.pendingPlugins).toBe('number')
      expect(typeof stats.approvedPlugins).toBe('number')
      expect(typeof stats.rejectedPlugins).toBe('number')
      expect(typeof stats.totalDownloads).toBe('number')
      expect(typeof stats.totalViews).toBe('number')
      expect(typeof stats.totalReviews).toBe('number')
      expect(typeof stats.activeDevelopers).toBe('number')
    })
  })

  describe('checkDatabaseHealth', () => {
    it('should return connected status when database is available', async () => {
      const health = await adminService.checkDatabaseHealth()

      expect(health.database).toBe('connected')
      expect(health.timestamp).toBeDefined()
    })
  })
})
