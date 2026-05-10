import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb } from '@server/db'
import { orders } from '@server/db/schema'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import * as service from '../services/order-service'

describe('Admin Order Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    await db.delete(orders)
    await service.seedOrders(5)
  })

  afterAll(async () => {
    try {
      const db = await getDb()
      await db.delete(orders)
    } catch {
      // ignore cleanup errors
    }
    await cleanupTestDatabase()
  })

  describe('getOrders', () => {
    it('should return all orders when no filters provided', async () => {
      const result = await service.getOrders()
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should filter orders by status', async () => {
      const result = await service.getOrders({ status: 'pending' })
      result.items.forEach(order => {
        expect(order.status).toBe('pending')
      })
    })
  })

  describe('getOrderById', () => {
    it('should return order when id exists', async () => {
      const all = await service.getOrders()
      const firstOrder = all.items[0]
      const result = await service.getOrderById(firstOrder.id)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(firstOrder.id)
    })

    it('should return null for non-existent order id', async () => {
      const result = await service.getOrderById(999999)
      expect(result).toBeNull()
    })
  })

  describe('processOrder', () => {
    it('should process a pending order', async () => {
      const all = await service.getOrders()
      const pendingOrder = all.items.find(o => o.status === 'pending')
      if (pendingOrder) {
        const result = await service.processOrder(pendingOrder.id)
        expect(result).not.toBeNull()
        expect(result?.status).toBe('processing')
      }
    })

    it('should return null for non-existent order', async () => {
      const result = await service.processOrder(999999)
      expect(result).toBeNull()
    })
  })

  describe('cancelOrder', () => {
    it('should return null for non-existent order', async () => {
      const result = await service.cancelOrder(999999)
      expect(result).toBeNull()
    })
  })

  describe('completeOrder', () => {
    it('should return null for non-existent order', async () => {
      const result = await service.completeOrder(999999)
      expect(result).toBeNull()
    })
  })
})
