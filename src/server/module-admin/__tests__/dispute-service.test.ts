import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb } from '@server/db'
import { disputes, orders } from '@server/db/schema'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import * as orderService from '../services/order-service'
import * as service from '../services/dispute-service'

describe('Admin Dispute Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    await db.delete(disputes)
    await db.delete(orders)
    await orderService.seedOrders(5)
    await service.seedDisputes(5)
  })

  afterAll(async () => {
    try {
      const db = await getDb()
      await db.delete(disputes)
      await db.delete(orders)
    } catch {
      // ignore
    }
    await cleanupTestDatabase()
  })

  describe('getDisputes', () => {
    it('should return all disputes', async () => {
      const result = await service.getDisputes()
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should filter disputes by status', async () => {
      const result = await service.getDisputes({ status: 'pending' })
      result.items.forEach(d => {
        expect(d.status).toBe('pending')
      })
    })

    it('should filter disputes by type', async () => {
      const result = await service.getDisputes({ type: 'refund' })
      result.items.forEach(d => {
        expect(d.type).toBe('refund')
      })
    })
  })

  describe('getDisputeById', () => {
    it('should return dispute when id exists', async () => {
      const all = await service.getDisputes()
      const first = all.items[0]
      const result = await service.getDisputeById(first.id)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(first.id)
    })

    it('should return null for non-existent dispute', async () => {
      const result = await service.getDisputeById(999999)
      expect(result).toBeNull()
    })
  })

  describe('investigateDispute', () => {
    it('should investigate a pending dispute', async () => {
      const all = await service.getDisputes({ status: 'pending' })
      const dispute = all.items[0]
      if (dispute) {
        const result = await service.investigateDispute(dispute.id)
        expect(result).not.toBeNull()
        expect(result?.status).toBe('investigating')
      }
    })

    it('should return null for non-existent dispute', async () => {
      const result = await service.investigateDispute(999999)
      expect(result).toBeNull()
    })
  })

  describe('resolveDispute', () => {
    it('should resolve a pending dispute', async () => {
      const all = await service.getDisputes({ status: 'pending' })
      const dispute = all.items[0]
      if (dispute) {
        const result = await service.resolveDispute(dispute.id, 'Resolved', 'Admin')
        expect(result).not.toBeNull()
        expect(result?.status).toBe('resolved')
      }
    })

    it('should return null for non-existent dispute', async () => {
      const result = await service.resolveDispute(999999, 'test', 'Admin')
      expect(result).toBeNull()
    })
  })

  describe('rejectDispute', () => {
    it('should return null for non-existent dispute', async () => {
      const result = await service.rejectDispute(999999, 'test', 'Admin')
      expect(result).toBeNull()
    })
  })
})
