import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRealtimeCore, createWSMessageHandler } from '../realtime-core'

describe('createRealtimeCore', () => {
  let core: ReturnType<typeof createRealtimeCore>

  beforeEach(() => {
    core = createRealtimeCore()
  })

  it('should start with empty client maps', () => {
    expect(core.wsClients.size).toBe(0)
    expect(core.sseClients.size).toBe(0)
  })

  describe('broadcast', () => {
    it('should broadcast to all WS clients', () => {
      const send1 = vi.fn()
      const send2 = vi.fn()
      core.wsClients.set('ws1', { id: 'ws1', send: send1, close: vi.fn() })
      core.wsClients.set('ws2', { id: 'ws2', send: send2, close: vi.fn() })

      core.broadcast({ msg: 'hello' }, [], 'test-event')

      expect(send1).toHaveBeenCalledWith({ type: 'test-event', payload: { msg: 'hello' } })
      expect(send2).toHaveBeenCalledWith({ type: 'test-event', payload: { msg: 'hello' } })
    })

    it('should broadcast to all SSE clients with proper SSE format', () => {
      const send1 = vi.fn()
      const send2 = vi.fn()
      core.sseClients.set('sse1', { id: 'sse1', send: send1 })
      core.sseClients.set('sse2', { id: 'sse2', send: send2 })

      core.broadcast({ msg: 'hello' }, [], 'my-event')

      expect(send1).toHaveBeenCalledWith('event: my-event\ndata: {"msg":"hello"}\n\n')
      expect(send2).toHaveBeenCalledWith('event: my-event\ndata: {"msg":"hello"}\n\n')
    })

    it('should exclude specified clients', () => {
      const send1 = vi.fn()
      const send2 = vi.fn()
      core.wsClients.set('ws1', { id: 'ws1', send: send1, close: vi.fn() })
      core.wsClients.set('ws2', { id: 'ws2', send: send2, close: vi.fn() })

      core.broadcast({ msg: 'hello' }, ['ws1'], 'test-event')

      expect(send1).not.toHaveBeenCalled()
      expect(send2).toHaveBeenCalled()
    })

    it('should use default event name "notification" and empty exclude', () => {
      const wsSend = vi.fn()
      const sseSend = vi.fn()
      core.wsClients.set('ws1', { id: 'ws1', send: wsSend, close: vi.fn() })
      core.sseClients.set('sse1', { id: 'sse1', send: sseSend })

      core.broadcast({ data: 'test' }, [], 'test')

      expect(wsSend).toHaveBeenCalledWith({ type: 'test', payload: { data: 'test' } })
      expect(sseSend).toHaveBeenCalledWith('event: test\ndata: {"data":"test"}\n\n')
    })

    it('should remove WS client when send throws', () => {
      const send = vi.fn(() => {
        throw new Error('Connection closed')
      })
      core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })

      core.broadcast({ msg: 'hello' }, [], 'test')

      expect(core.wsClients.has('ws1')).toBe(false)
    })

    it('should remove SSE client when send throws', () => {
      const send = vi.fn(() => {
        throw new Error('Connection closed')
      })
      core.sseClients.set('sse1', { id: 'sse1', send })

      core.broadcast({ msg: 'hello' }, [], 'test')

      expect(core.sseClients.has('sse1')).toBe(false)
    })

    it('should handle broadcast with no clients', () => {
      expect(() => core.broadcast({ msg: 'hello' }, [], 'test')).not.toThrow()
    })
  })

  describe('handleWSMessage', () => {
    it('should ignore messages from unknown clients', () => {
      expect(() => core.handleWSMessage('unknown', { method: 'test', id: '1' })).not.toThrow()
    })

    describe('RPC messages', () => {
      it('should dispatch RPC calls to registered handlers and return result', () => {
        const send = vi.fn()
        const handler = vi.fn((_params, _clientId) => ({ result: 'ok' }))
        core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })
        core.registerRPCHandler('echo', handler)

        core.handleWSMessage('ws1', { method: 'echo', id: 'rpc-1', params: { message: 'hi' } })

        expect(handler).toHaveBeenCalledWith({ message: 'hi' }, 'ws1')
        expect(send).toHaveBeenCalledWith({ id: 'rpc-1', result: { result: 'ok' } })
      })

      it('should return error for unknown RPC method', () => {
        const send = vi.fn()
        core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })

        core.handleWSMessage('ws1', { method: 'unknown', id: 'rpc-1', params: {} })

        expect(send).toHaveBeenCalledWith({ id: 'rpc-1', error: 'Unknown method: unknown' })
      })

      it('should return error when RPC handler throws', () => {
        const send = vi.fn()
        core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })
        core.registerRPCHandler('fail', () => {
          throw new Error('Handler failed')
        })

        core.handleWSMessage('ws1', { method: 'fail', id: 'rpc-2', params: null })

        expect(send).toHaveBeenCalledWith({ id: 'rpc-2', error: 'Handler failed' })
      })

      it('should return "Unknown error" when RPC handler throws non-Error', () => {
        const send = vi.fn()
        core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })
        core.registerRPCHandler('fail', () => {
          throw 'string error'
        })

        core.handleWSMessage('ws1', { method: 'fail', id: 'rpc-3', params: null })

        expect(send).toHaveBeenCalledWith({ id: 'rpc-3', error: 'Unknown error' })
      })
    })

    describe('Event messages', () => {
      it('should dispatch event messages to registered handlers', () => {
        const handler = vi.fn()
        core.wsClients.set('ws1', { id: 'ws1', send: vi.fn(), close: vi.fn() })
        core.registerEventHandler('chat', handler)

        core.handleWSMessage('ws1', { type: 'chat', payload: { text: 'hello' } })

        expect(handler).toHaveBeenCalledWith({ text: 'hello' }, 'ws1', core.broadcast)
      })

      it('should ignore events with no registered handler', () => {
        const send = vi.fn()
        core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })

        expect(() =>
          core.handleWSMessage('ws1', { type: 'unregistered', payload: {} })
        ).not.toThrow()
        expect(send).not.toHaveBeenCalled()
      })

      it('should handle event without payload', () => {
        const handler = vi.fn()
        core.wsClients.set('ws1', { id: 'ws1', send: vi.fn(), close: vi.fn() })
        core.registerEventHandler('ping', handler)

        core.handleWSMessage('ws1', { type: 'ping' })

        expect(handler).toHaveBeenCalledWith(undefined, 'ws1', core.broadcast)
      })
    })

    it('should ignore non-object messages', () => {
      const send = vi.fn()
      core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })

      core.handleWSMessage('ws1', 'plain string')
      core.handleWSMessage('ws1', null)
      core.handleWSMessage('ws1', 123)

      expect(send).not.toHaveBeenCalled()
    })

    it('should ignore object without method/id or type', () => {
      const send = vi.fn()
      core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })

      core.handleWSMessage('ws1', { foo: 'bar' })

      expect(send).not.toHaveBeenCalled()
    })
  })

  describe('registerRPCHandler', () => {
    it('should allow overwriting handlers', () => {
      const send = vi.fn()
      const handler1 = vi.fn(() => 'v1')
      const handler2 = vi.fn(() => 'v2')
      core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })

      core.registerRPCHandler('test', handler1)
      core.registerRPCHandler('test', handler2)

      core.handleWSMessage('ws1', { method: 'test', id: '1', params: {} })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('registerEventHandler', () => {
    it('should allow overwriting handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      core.wsClients.set('ws1', { id: 'ws1', send: vi.fn(), close: vi.fn() })

      core.registerEventHandler('test', handler1)
      core.registerEventHandler('test', handler2)

      core.handleWSMessage('ws1', { type: 'test', payload: 'data' })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })
})

describe('createWSMessageHandler', () => {
  const broadcastFn = vi.fn()
  let handler: ReturnType<typeof createWSMessageHandler>

  beforeEach(() => {
    broadcastFn.mockClear()
    handler = createWSMessageHandler(broadcastFn)
  })

  it('should handle RPC messages by calling send with error (no registered handlers)', () => {
    const send = vi.fn()

    handler.handleMessage('client1', { method: 'test', id: 'rpc-1' }, send)

    expect(send).toHaveBeenCalledWith({
      id: 'rpc-1',
      error: 'Unknown method: test',
    })
  })

  it('should handle event messages with type "broadcast"', () => {
    handler.handleMessage('client1', { type: 'broadcast', payload: { msg: 'hi' } }, vi.fn())

    expect(broadcastFn).toHaveBeenCalledWith({ msg: 'hi' }, ['client1'], 'broadcast')
  })

  it('should ignore non-object data', () => {
    const send = vi.fn()
    handler.handleMessage('client1', 'string', send)
    handler.handleMessage('client1', null, send)
    expect(send).not.toHaveBeenCalled()
    expect(broadcastFn).not.toHaveBeenCalled()
  })

  it('should ignore events that are not "broadcast"', () => {
    handler.handleMessage('client1', { type: 'unknown' }, vi.fn())
    expect(broadcastFn).not.toHaveBeenCalled()
  })
})
