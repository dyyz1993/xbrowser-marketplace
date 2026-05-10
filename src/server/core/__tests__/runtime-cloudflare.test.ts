import { describe, it, expect, vi } from 'vitest'

const mockServerWS = {
  accept: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
}

const mockClientWS = {
  send: vi.fn(),
  close: vi.fn(),
}

vi.stubGlobal(
  'WebSocketPair',
  class WebSocketPair {
    '0' = mockClientWS
    '1' = mockServerWS
  }
)

vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
})

describe('CloudflareRuntimeAdapter', () => {
  it('should create with cloudflare platform', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()
    expect(adapter.platform.name).toBe('cloudflare')
    expect(adapter.platform.isCloudflare).toBe(true)
    expect(adapter.platform.isNode).toBe(false)
  })

  it('should handle WS/SSE path registration', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()
    adapter.handleWS('/ws/test')
    adapter.handleSSE('/sse/test')
    expect(adapter.hasWSPath('/ws/test')).toBe(true)
    expect(adapter.hasSSEPath('/sse/test')).toBe(true)
    expect(adapter.hasWSPath('/other')).toBe(false)
    expect(adapter.hasSSEPath('/other')).toBe(false)
  })

  it('should get WS/SSE connections', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()
    expect(adapter.getWSConnections()).toBeInstanceOf(Map)
    expect(adapter.getSSEConnections()).toBeInstanceOf(Map)
  })

  it('should broadcast via core', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()
    const sseSend = vi.fn()
    adapter.core.sseClients.set('sse1', { id: 'sse1', send: sseSend })

    adapter.broadcast('test-event', { data: 'hello' })
    expect(sseSend).toHaveBeenCalled()
  })

  it('should register and use RPC handlers', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()
    const handler = vi.fn(() => ({ result: 'ok' }))
    adapter.registerRPC('echo', handler)

    const send = vi.fn()
    adapter.core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })
    adapter.core.handleWSMessage('ws1', { method: 'echo', id: '1', params: {} })

    expect(handler).toHaveBeenCalled()
    expect(send).toHaveBeenCalledWith({ id: '1', result: { result: 'ok' } })
  })

  it('should register and use event handlers', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()
    const handler = vi.fn()
    adapter.registerEvent('chat', handler)

    const send = vi.fn()
    adapter.core.wsClients.set('ws1', { id: 'ws1', send, close: vi.fn() })
    adapter.core.handleWSMessage('ws1', { type: 'chat', payload: { text: 'hi' } })

    expect(handler).toHaveBeenCalledWith({ text: 'hi' }, 'ws1')
  })

  it('should handle WebSocket upgrade requests', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()
    const request = new Request('https://example.com/ws', {
      headers: { Upgrade: 'websocket' },
    })

    mockServerWS.accept.mockReset()
    mockServerWS.send.mockReset()
    mockServerWS.addEventListener.mockReset()

    try {
      await adapter.handleWebSocketRequest(request)
    } catch {
      // Node Response doesn't support status 101
    }

    expect(mockServerWS.accept).toHaveBeenCalled()
    expect(mockServerWS.send).toHaveBeenCalled()
    expect(mockServerWS.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(mockServerWS.addEventListener).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('should handle SSE requests with proper headers', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()

    const response = await adapter.handleSSERequest()

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')
    expect(adapter.getSSEConnections().size).toBe(1)
  })

  it('should send connected event via SSE stream', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()

    const response = await adapter.handleSSERequest()
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    const { value } = await reader!.read()
    const text = decoder.decode(value)
    expect(text).toContain('event: connected')

    reader!.cancel()
  })

  it('should remove SSE client on stream cancel', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()

    const response = await adapter.handleSSERequest()
    expect(adapter.getSSEConnections().size).toBe(1)

    await response.body?.cancel()
    expect(adapter.getSSEConnections().size).toBe(0)
  })

  it('should handle broadcast requests', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()

    const sseSend = vi.fn()
    adapter.core.sseClients.set('sse1', { id: 'sse1', send: sseSend })

    const request = new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({ event: 'test', data: { msg: 'hello' } }),
    })

    const response = await adapter.handleBroadcastRequest(request)
    const result = (await response.json()) as { success: boolean; sseRecipients: number }

    expect(result.success).toBe(true)
    expect(result.sseRecipients).toBe(1)
    expect(sseSend).toHaveBeenCalled()
  })

  it('should handle broadcast with default event name', async () => {
    const { CloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const adapter = new CloudflareRuntimeAdapter()

    const sseSend = vi.fn()
    adapter.core.sseClients.set('sse1', { id: 'sse1', send: sseSend })

    const request = new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({ data: { msg: 'hello' } }),
    })

    await adapter.handleBroadcastRequest(request)
    expect(sseSend).toHaveBeenCalled()
    const sentData = sseSend.mock.calls[0][0]
    expect(sentData).toContain('notification')
  })

  it('should get singleton adapter', async () => {
    const { getCloudflareRuntimeAdapter } = await import('../runtime-cloudflare')
    const a = getCloudflareRuntimeAdapter()
    const b = getCloudflareRuntimeAdapter()
    expect(a).toBe(b)
  })
})
