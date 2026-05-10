import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('core/index exports', () => {
  beforeEach(() => {
    globalThis.__runtimeAdapter = undefined
    vi.resetModules()
  })

  afterEach(() => {
    globalThis.__runtimeAdapter = undefined
  })

  it('should export createRealtimeCore', async () => {
    const { createRealtimeCore } = await import('../index')
    const core = createRealtimeCore()
    expect(core.wsClients).toBeInstanceOf(Map)
    expect(core.sseClients).toBeInstanceOf(Map)
    expect(core.broadcast).toBeInstanceOf(Function)
    expect(core.handleWSMessage).toBeInstanceOf(Function)
    expect(core.registerRPCHandler).toBeInstanceOf(Function)
    expect(core.registerEventHandler).toBeInstanceOf(Function)
  })

  it('should export createWSMessageHandler', async () => {
    const { createWSMessageHandler } = await import('../index')
    const handler = createWSMessageHandler(vi.fn())
    expect(handler.handleMessage).toBeInstanceOf(Function)
    expect(handler.handleRpc).toBeInstanceOf(Function)
    expect(handler.handleEvent).toBeInstanceOf(Function)
  })

  it('should export runtime and setRuntimeAdapter', async () => {
    const { runtime, setRuntimeAdapter, getRuntimeAdapter } = await import('../index')
    expect(setRuntimeAdapter).toBeInstanceOf(Function)
    expect(getRuntimeAdapter).toBeInstanceOf(Function)
    expect(runtime).toBeDefined()
  })

  it('should export NodeRuntimeAdapter', async () => {
    const { NodeRuntimeAdapter } = await import('../index')
    const adapter = new NodeRuntimeAdapter()
    expect(adapter.platform.name).toBe('node')
  })

  it('should export createTypedRuntime', async () => {
    const { createTypedRuntime } = await import('../index')
    expect(createTypedRuntime).toBeInstanceOf(Function)
  })

  describe('realtime service', () => {
    it('should provide a realtime proxy with broadcast method', async () => {
      const { realtime } = await import('../index')
      expect(realtime).toBeDefined()
      expect(realtime.broadcast).toBeInstanceOf(Function)
    })

    it('setRealtimeEnv should work', async () => {
      const { setRealtimeEnv } = await import('../index')
      setRealtimeEnv({})
    })

    it('getRealtimeService should return a service', async () => {
      const { getRealtimeService } = await import('../index')
      const service = getRealtimeService()
      expect(service).toBeDefined()
      expect(service.broadcast).toBeInstanceOf(Function)
    })
  })
})
