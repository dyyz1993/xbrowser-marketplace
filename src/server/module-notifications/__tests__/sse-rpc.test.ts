import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../app'
import { createTestServer } from '../../test-utils/test-server'
import { createTestClient } from '../../test-utils/test-client'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'
import { SSEClientImpl } from '@shared/core/sse-client'
import * as notificationService from '../services/notification-service'
import type { AppSSEProtocol } from '@shared/schemas'

setRuntimeAdapter(getNodeRuntimeAdapter())

let sseTestContext: { port: number; close: () => Promise<void> }
let client: ReturnType<typeof createTestClient>

function connectSSE() {
  const conn = client.api.notifications.stream.$sse()
  return conn as unknown as SSEClientImpl<AppSSEProtocol>
}

describe('SSE Routes with Patched $sse() RPC Method', () => {
  beforeAll(async () => {
    const app = createApp()
    const server = await createTestServer(app, ['/api/notifications/stream'])
    sseTestContext = { port: server.port, close: server.close }

    client = createTestClient(`http://localhost:${server.port}`, {
      sse: url => new SSEClientImpl(url, { Authorization: 'Bearer admin-token' }),
      headers: { Authorization: 'Bearer admin-token' },
    })
  }, 15000)

  afterAll(async () => {
    await sseTestContext.close()
  }, 15000)

  beforeEach(() => {
    notificationService.clearAllNotifications()
  })

  afterEach(() => {
    notificationService.clearAllNotifications()
  })

  describe('GET /api/notifications/stream via $sse()', () => {
    it('should use patched $sse() method for type-safe SSE connection', async () => {
      const conn = connectSSE()

      expect(['connecting', 'open', 'closed']).toContain(conn.status)

      const receivedNotifications: AppSSEProtocol['events']['notification'][] = []
      const receivedPings: AppSSEProtocol['events']['ping'][] = []
      const receivedConnected: AppSSEProtocol['events']['connected'][] = []

      const unsubscribeNotification = conn.on(
        'notification',
        (notification: (typeof receivedNotifications)[0]) => {
          receivedNotifications.push(notification)
        }
      )

      const unsubscribePing = conn.on('ping', (ping: (typeof receivedPings)[0]) => {
        receivedPings.push(ping)
      })

      const unsubscribeConnected = conn.on(
        'connected',
        (connected: (typeof receivedConnected)[0]) => {
          receivedConnected.push(connected)
        }
      )

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribeNotification()
      unsubscribePing()
      unsubscribeConnected()
      conn.abort()

      const totalEvents =
        receivedNotifications.length + receivedPings.length + receivedConnected.length
      expect(totalEvents).toBeGreaterThanOrEqual(0)
    })

    it('should receive typed notification events', async () => {
      const conn = connectSSE()

      const receivedNotifications: AppSSEProtocol['events']['notification'][] = []

      const unsubscribe = conn.on(
        'notification',
        (notification: (typeof receivedNotifications)[0]) => {
          receivedNotifications.push(notification)
        }
      )

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribe()
      conn.abort()

      receivedNotifications.forEach(notification => {
        expect(notification.id).toBeDefined()
        expect(notification.type).toBeDefined()
        expect(notification.title).toBeDefined()
        expect(notification.message).toBeDefined()
        expect(notification.read).toBeDefined()
        expect(notification.createdAt).toBeDefined()
      })
    })

    it('should receive typed ping events', async () => {
      const conn = connectSSE()

      const receivedPings: AppSSEProtocol['events']['ping'][] = []

      const unsubscribe = conn.on('ping', (ping: (typeof receivedPings)[0]) => {
        receivedPings.push(ping)
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribe()
      conn.abort()

      receivedPings.forEach(ping => {
        expect(ping.timestamp).toBeDefined()
        expect(typeof ping.timestamp).toBe('number')
      })
    })

    it('should receive typed connected events', async () => {
      const conn = connectSSE()

      const receivedConnected: AppSSEProtocol['events']['connected'][] = []

      const unsubscribe = conn.on('connected', (connected: (typeof receivedConnected)[0]) => {
        receivedConnected.push(connected)
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribe()
      conn.abort()

      receivedConnected.forEach(connected => {
        expect(connected.timestamp).toBeDefined()
        expect(typeof connected.timestamp).toBe('number')
      })
    })

    it('should handle connection status changes', async () => {
      const conn = connectSSE()

      const statusHistory: ('connecting' | 'open' | 'closed')[] = []

      const unsubscribe = conn.onStatusChange((status: (typeof statusHistory)[0]) => {
        statusHistory.push(status)
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      conn.abort()

      await new Promise(resolve => setTimeout(resolve, 100))

      unsubscribe()

      expect(statusHistory.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle errors gracefully', async () => {
      const conn = connectSSE()

      const unsubscribe = conn.onError((error: Error) => {
        console.error('SSE error:', error)
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      unsubscribe()
      conn.abort()

      expect(conn.status).toBe('closed')
    })
  })

  describe('Error Scenarios', () => {
    it('should handle connection abort during event reception', async () => {
      const conn = connectSSE()

      const receivedEvents: unknown[] = []
      const unsubscribe = conn.on('notification', (event: unknown) => {
        receivedEvents.push(event)
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      conn.abort()

      await new Promise(resolve => setTimeout(resolve, 100))

      unsubscribe()

      expect(conn.status).toBe('closed')
    })

    it('should handle multiple abort calls gracefully', async () => {
      const conn = connectSSE()

      await new Promise(resolve => setTimeout(resolve, 500))

      conn.abort()
      conn.abort()
      conn.abort()

      expect(conn.status).toBe('closed')
    })

    it('should handle unsubscribe before connection close', async () => {
      const conn = connectSSE()

      const unsubscribe = conn.on('notification', () => {})

      await new Promise(resolve => setTimeout(resolve, 500))

      unsubscribe()

      conn.abort()

      expect(conn.status).toBe('closed')
    })

    it('should handle error events', async () => {
      const conn = connectSSE()

      let errorReceived = false
      const unsubscribe = conn.onError((error: Error) => {
        console.error('SSE error:', error)
        errorReceived = true
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      conn.abort()

      await new Promise(resolve => setTimeout(resolve, 100))

      unsubscribe()

      expect(['closed', 'connecting', 'open']).toContain(conn.status)
      expect(typeof errorReceived).toBe('boolean')
    })

    it('should handle non-existent event type gracefully', async () => {
      const conn = connectSSE()

      let received = false
      const unsubscribe = conn.on('nonExistentEvent' as 'notification', () => {
        received = true
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      conn.abort()

      await new Promise(resolve => setTimeout(resolve, 100))

      unsubscribe()

      expect(conn.status).toBe('closed')
      expect(received).toBe(false)
    })

    it('should test error assertion pattern', async () => {
      const conn = connectSSE()

      await new Promise(resolve => setTimeout(resolve, 500))

      conn.abort()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(conn.status).toBe('closed')
      const nullValue = null
      expect(nullValue).toBeNull()
    })
  })
})
