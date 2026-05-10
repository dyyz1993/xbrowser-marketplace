import { describe, it, expect, beforeAll } from 'vitest'
import { getRuntimeAdapter, runtime } from '../runtime'
import { setRuntimeAdapter } from '../runtime'
import { NodeRuntimeAdapter } from '../runtime-node'

describe('runtime module', () => {
  beforeAll(() => {
    globalThis.__runtimeAdapter = undefined
    setRuntimeAdapter(new NodeRuntimeAdapter())
  })

  describe('getRuntimeAdapter', () => {
    it('should return the adapter', () => {
      const adapter = getRuntimeAdapter()
      expect(adapter).toBeDefined()
      expect(adapter.platform.name).toBe('node')
    })
  })

  describe('runtime proxy', () => {
    it('runtime.adapter returns the adapter', () => {
      expect(runtime.adapter).toBeDefined()
      expect(runtime.adapter.platform.name).toBe('node')
    })

    it('runtime.handleWS delegates to adapter', () => {
      runtime.handleWS('/ws/delegated')
      expect(runtime.adapter.hasWSPath('/ws/delegated')).toBe(true)
    })

    it('runtime.handleSSE delegates to adapter', () => {
      runtime.handleSSE('/sse/delegated')
      expect(runtime.adapter.hasSSEPath('/sse/delegated')).toBe(true)
    })

    it('runtime.broadcast delegates to adapter', () => {
      const adapter = getRuntimeAdapter() as NodeRuntimeAdapter
      const sseSend = vi.fn()
      adapter.core.sseClients.set('test-sse', { id: 'test-sse', send: sseSend })

      runtime.broadcast('test', { msg: 'hi' })
      expect(sseSend).toHaveBeenCalled()

      adapter.core.sseClients.delete('test-sse')
    })

    it('runtime.platform returns adapter platform', () => {
      expect(runtime.platform).toEqual({
        name: 'node',
        isNode: true,
        isCloudflare: false,
      })
    })

    it('runtime.registerRPC delegates to adapter', () => {
      const handler = vi.fn(() => 'result')
      runtime.registerRPC('test-runtime-rpc', handler)

      const adapter = getRuntimeAdapter() as NodeRuntimeAdapter
      const send = vi.fn()
      adapter.core.wsClients.set('rpc-test-client', {
        id: 'rpc-test-client',
        send,
        close: vi.fn(),
      })
      adapter.core.handleWSMessage('rpc-test-client', {
        method: 'test-runtime-rpc',
        id: '1',
        params: {},
      })

      expect(handler).toHaveBeenCalled()
      adapter.core.wsClients.delete('rpc-test-client')
    })

    it('runtime.registerEvent delegates to adapter', () => {
      const handler = vi.fn()
      runtime.registerEvent('test-runtime-event', handler)

      const adapter = getRuntimeAdapter() as NodeRuntimeAdapter
      const send = vi.fn()
      adapter.core.wsClients.set('event-test-client', {
        id: 'event-test-client',
        send,
        close: vi.fn(),
      })
      adapter.core.handleWSMessage('event-test-client', {
        type: 'test-runtime-event',
        payload: { data: 'test' },
      })

      expect(handler).toHaveBeenCalled()
      adapter.core.wsClients.delete('event-test-client')
    })
  })
})
