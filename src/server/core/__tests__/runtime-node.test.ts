import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NodeRuntimeAdapter, getNodeRuntimeAdapter } from '../runtime-node'
import type { WebSocket as WSWebSocket } from 'ws'

function createMockWebSocket(overrides?: Record<string, unknown>): WSWebSocket {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    emit: (event: string, ...args: unknown[]) => {
      for (const handler of listeners[event] || []) handler(...args)
    },
    ...overrides,
  } as unknown as WSWebSocket
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(adapter: NodeRuntimeAdapter): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return adapter as any
}

describe('NodeRuntimeAdapter', () => {
  let adapter: NodeRuntimeAdapter

  beforeEach(() => {
    adapter = new NodeRuntimeAdapter()
  })

  describe('platform', () => {
    it('should have node platform info', () => {
      expect(adapter.platform.name).toBe('node')
      expect(adapter.platform.isNode).toBe(true)
      expect(adapter.platform.isCloudflare).toBe(false)
    })
  })

  describe('handleWS / hasWSPath', () => {
    it('should register and check WS paths', () => {
      expect(adapter.hasWSPath('/ws/chat')).toBe(false)
      adapter.handleWS('/ws/chat')
      expect(adapter.hasWSPath('/ws/chat')).toBe(true)
    })

    it('should handle duplicate path registrations', () => {
      adapter.handleWS('/ws/chat')
      adapter.handleWS('/ws/chat')
      expect(adapter.hasWSPath('/ws/chat')).toBe(true)
    })
  })

  describe('handleSSE / hasSSEPath', () => {
    it('should register and check SSE paths', () => {
      expect(adapter.hasSSEPath('/sse/stream')).toBe(false)
      adapter.handleSSE('/sse/stream')
      expect(adapter.hasSSEPath('/sse/stream')).toBe(true)
    })
  })

  describe('broadcast', () => {
    it('should broadcast to SSE clients', () => {
      const send = vi.fn()
      getInternal(adapter).core.sseClients.set('sse1', { id: 'sse1', send })

      adapter.broadcast('test-event', { data: 'hello' })

      expect(send).toHaveBeenCalled()
    })

    it('should broadcast to WS clients', () => {
      const send = vi.fn()
      getInternal(adapter).core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })

      adapter.broadcast('test-event', { data: 'hello' })

      expect(send).toHaveBeenCalled()
    })
  })

  describe('registerRPC', () => {
    it('should register and execute RPC handlers', () => {
      const send = vi.fn()
      const handler = vi.fn(() => ({ echoed: true }))

      adapter.registerRPC('echo', handler)
      getInternal(adapter).core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })
      getInternal(adapter).core.handleWSMessage('ws1', {
        method: 'echo',
        id: '1',
        params: { msg: 'hi' },
      })

      expect(handler).toHaveBeenCalledWith({ msg: 'hi' }, 'ws1')
      expect(send).toHaveBeenCalledWith({ id: '1', result: { echoed: true } })
    })
  })

  describe('registerEvent', () => {
    it('should register event handlers', () => {
      const handler = vi.fn()
      adapter.registerEvent('chat', handler)

      const wsSend = vi.fn()
      getInternal(adapter).core.wsClients.set('ws1', { id: 'ws1', send: wsSend, close: vi.fn() })
      getInternal(adapter).core.handleWSMessage('ws1', { type: 'chat', payload: { text: 'hello' } })

      expect(handler).toHaveBeenCalledWith({ text: 'hello' }, 'ws1')
    })
  })

  describe('getWSConnections / getSSEConnections', () => {
    it('should return WS connections map', () => {
      expect(adapter.getWSConnections()).toBeInstanceOf(Map)
    })

    it('should return SSE connections map', () => {
      expect(adapter.getSSEConnections()).toBeInstanceOf(Map)
    })
  })

  describe('handleConnection', () => {
    it('should create a connection and add to maps', () => {
      const ws = createMockWebSocket()
      const conn = adapter.handleConnection(ws)

      expect(conn.id).toBeDefined()
      expect(typeof conn.id).toBe('string')
      expect(adapter.connections.has(conn.id)).toBe(true)
      expect(adapter.size).toBe(1)
      expect(adapter.getWSConnections().has(conn.id)).toBe(true)
    })

    it('should send connected event on creation', () => {
      const ws = createMockWebSocket()
      adapter.handleConnection(ws)

      expect(ws.send).toHaveBeenCalledTimes(1)
      const sentArg = (ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      const parsed = JSON.parse(sentArg)
      expect(parsed.type).toBe('connected')
      expect(parsed.payload.timestamp).toBeTypeOf('number')
    })

    it('should handle incoming messages and dispatch to core', () => {
      const ws = createMockWebSocket()
      const handler = vi.fn(() => 'result')
      adapter.registerRPC('echo', handler)
      adapter.handleConnection(ws)

      ws.emit('message', Buffer.from(JSON.stringify({ method: 'echo', id: '1', params: {} })))

      expect(handler).toHaveBeenCalled()
    })

    it('should ignore invalid JSON messages', () => {
      const ws = createMockWebSocket()
      adapter.handleConnection(ws)

      expect(() => ws.emit('message', Buffer.from('not json'))).not.toThrow()
    })

    it('should remove connection on close', () => {
      const ws = createMockWebSocket()
      const conn = adapter.handleConnection(ws)
      expect(adapter.connections.size).toBe(1)

      ws.emit('close')

      expect(adapter.connections.has(conn.id)).toBe(false)
      expect(adapter.getWSConnections().has(conn.id)).toBe(false)
      expect(adapter.size).toBe(0)
    })
  })

  describe('handleSSERequest', () => {
    it('should return a Response with SSE headers', () => {
      const response = adapter.handleSSERequest()

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should add an SSE client to the core', () => {
      adapter.handleSSERequest()

      expect(adapter.getSSEConnections().size).toBe(1)
    })

    it('should send connected event via the stream', async () => {
      const response = adapter.handleSSERequest()
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      const { value } = await reader!.read()
      const text = decoder.decode(value)

      expect(text).toContain('event: connected')
      expect(text).toContain('timestamp')

      reader!.cancel()
    })

    it('should remove client when stream is cancelled', async () => {
      const response = adapter.handleSSERequest()
      expect(adapter.getSSEConnections().size).toBe(1)

      await response.body?.cancel()

      expect(adapter.getSSEConnections().size).toBe(0)
    })
  })

  describe('NodeWSConnection', () => {
    it('should not send when readyState is not OPEN', () => {
      const ws = createMockWebSocket({ readyState: 0 })
      const conn = adapter.handleConnection(ws)

      ;(ws.send as ReturnType<typeof vi.fn>).mockClear()
      conn.send({ test: true })

      expect(ws.send).not.toHaveBeenCalled()
    })

    it('should close the underlying websocket', () => {
      const ws = createMockWebSocket()
      const conn = adapter.handleConnection(ws)

      conn.close()

      expect(ws.close).toHaveBeenCalled()
    })
  })
})

describe('getNodeRuntimeAdapter', () => {
  afterEach(() => {
    globalThis.__runtimeAdapter = undefined
  })

  it('should return the same instance (singleton)', () => {
    const a = getNodeRuntimeAdapter()
    const b = getNodeRuntimeAdapter()
    expect(a).toBe(b)
  })
})
