import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb } from '@server/db'
import { tickets, ticketMessages } from '@server/db/schema'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import * as service from '../services/ticket-service'

describe('Admin Ticket Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    await db.delete(ticketMessages)
    await db.delete(tickets)
    await service.seedTickets(5)
  })

  afterAll(async () => {
    try {
      const db = await getDb()
      await db.delete(ticketMessages)
      await db.delete(tickets)
    } catch {
      // ignore
    }
    await cleanupTestDatabase()
  })

  describe('getTickets', () => {
    it('should return all tickets', async () => {
      const result = await service.getTickets()
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should filter tickets by status', async () => {
      const result = await service.getTickets({ status: 'open' })
      result.items.forEach(t => {
        expect(t.status).toBe('open')
      })
    })

    it('should filter tickets by priority', async () => {
      const result = await service.getTickets({ priority: 'high' })
      result.items.forEach(t => {
        expect(t.priority).toBe('high')
      })
    })
  })

  describe('getTicketById', () => {
    it('should return ticket when id exists', async () => {
      const all = await service.getTickets()
      const first = all.items[0]
      const result = await service.getTicketById(first.id)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(first.id)
    })

    it('should return null for non-existent ticket', async () => {
      const result = await service.getTicketById(999999)
      expect(result).toBeNull()
    })
  })

  describe('replyTicket', () => {
    it('should reply to a ticket', async () => {
      const all = await service.getTickets({ status: 'open' })
      const ticket = all.items[0]
      if (ticket) {
        const result = await service.replyTicket(ticket.id, 'Test reply', 'Admin', true)
        expect(result).not.toBeNull()
        expect(result?.messages.length).toBeGreaterThan(0)
      }
    })

    it('should return null for non-existent ticket', async () => {
      const result = await service.replyTicket(999999, 'test', 'Admin', true)
      expect(result).toBeNull()
    })
  })

  describe('closeTicket', () => {
    it('should return null for non-existent ticket', async () => {
      const result = await service.closeTicket(999999)
      expect(result).toBeNull()
    })
  })
})
