import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTypedRuntime } from '../typed-runtime'
import { setRuntimeAdapter } from '../runtime'
import { NodeRuntimeAdapter } from '../runtime-node'

interface TestProtocol {
  rpc: {
    echo: { in: { message: string }; out: { echo: string } }
    add: { in: { a: number; b: number }; out: { result: number } }
  }
  events: {
    notification: { text: string }
    update: { id: string; value: number }
  }
}

describe('createTypedRuntime', () => {
  let typed: ReturnType<typeof createTypedRuntime<TestProtocol>>

  beforeEach(() => {
    globalThis.__runtimeAdapter = undefined
    const adapter = new NodeRuntimeAdapter()
    setRuntimeAdapter(adapter)
    typed = createTypedRuntime<TestProtocol>('/ws/test')
  })

  afterEach(() => {
    globalThis.__runtimeAdapter = undefined
  })

  it('should have the specified path', () => {
    expect(typed.path).toBe('/ws/test')
  })

  it('should expose the adapter', () => {
    expect(typed.adapter).toBeDefined()
    expect(typed.adapter.platform.name).toBe('node')
  })

  it('should register RPC handlers and they work through core', () => {
    const handler = vi.fn((_params: { message: string }) => ({ echo: 'test' }))
    typed.registerRPC('echo', handler)

    const send = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = typed.adapter as any
    internal.core.wsClients.set('client1', { id: 'client1', send, close: vi.fn() })
    internal.core.handleWSMessage('client1', {
      method: 'echo',
      id: '1',
      params: { message: 'hello' },
    })

    expect(handler).toHaveBeenCalledWith({ message: 'hello' }, 'client1')
    expect(send).toHaveBeenCalledWith({ id: '1', result: { echo: 'test' } })
  })

  it('should register event handlers and they work through core', () => {
    const handler = vi.fn()
    typed.registerEvent('notification', handler)

    const send = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = typed.adapter as any
    internal.core.wsClients.set('client1', { id: 'client1', send, close: vi.fn() })
    internal.core.handleWSMessage('client1', {
      type: 'notification',
      payload: { text: 'hello' },
    })

    expect(handler).toHaveBeenCalledWith({ text: 'hello' }, 'client1')
  })

  it('should broadcast through runtime', () => {
    const sseSend = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = typed.adapter as any
    internal.core.sseClients.set('sse1', { id: 'sse1', send: sseSend })

    typed.broadcast('notification', { text: 'alert' })

    expect(sseSend).toHaveBeenCalled()
    const sentData = sseSend.mock.calls[0][0]
    expect(sentData).toContain('notification')
    expect(sentData).toContain('alert')
  })

  it('should broadcast with exclude list', () => {
    const send1 = vi.fn()
    const send2 = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = typed.adapter as any
    internal.core.sseClients.set('sse1', { id: 'sse1', send: send1 })
    internal.core.sseClients.set('sse2', { id: 'sse2', send: send2 })

    typed.broadcast('update', { id: '123', value: 42 }, ['sse1'])

    expect(send1).not.toHaveBeenCalled()
    expect(send2).toHaveBeenCalled()
  })
})
