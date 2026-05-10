import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.stubGlobal('WebSocketPair', class WebSocketPair {
  '0' = mockClientWS
  '1' = mockServerWS
})

vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
})

describe('RealtimeDurableObject', () => {
  beforeEach(() => {
    mockServerWS.accept.mockReset()
    mockServerWS.send.mockReset()
    mockServerWS.close.mockReset()
    mockServerWS.addEventListener.mockReset()
  })

  it('should handle /size endpoint', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const request = new Request('https://internal/size')
    const response = await dobj.fetch(request)
    const result = await response.json()

    expect(result.wsClients).toBe(0)
    expect(result.sseClients).toBe(0)
  })

  it('should return 404 for unknown paths', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const request = new Request('https://internal/unknown')
    const response = await dobj.fetch(request)
    expect(response.status).toBe(404)
  })

  it('should handle SSE connection', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const request = new Request('https://internal/sse', {
      headers: { Accept: 'text/event-stream' },
    })

    const response = await dobj.fetch(request)

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader!.read()
    const text = decoder.decode(value)
    expect(text).toContain('event: connected')
    reader!.cancel()
  })

  it('should handle broadcast request', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const sseSend = vi.fn()
    dobj['core'].sseClients.set('sse1', { id: 'sse1', send: sseSend })

    const request = new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({ event: 'test', data: { msg: 'hello' } }),
    })

    const response = await dobj.fetch(request)
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(sseSend).toHaveBeenCalled()
  })

  it('should return 400 for broadcast without event', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const request = new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({ data: { msg: 'hello' } }),
    })

    const response = await dobj.fetch(request)
    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toBe('event is required')
  })

  it('should handle send to existing WS client', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const send = vi.fn()
    dobj['core'].wsClients.set('client1', { id: 'client1', send, close: vi.fn() })

    const request = new Request('https://internal/send', {
      method: 'POST',
      body: JSON.stringify({ clientId: 'client1', data: 'test message' }),
    })

    const response = await dobj.fetch(request)
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(send).toHaveBeenCalledWith('test message')
  })

  it('should handle send to non-existent client', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const request = new Request('https://internal/send', {
      method: 'POST',
      body: JSON.stringify({ clientId: 'nonexistent', data: 'test' }),
    })

    const response = await dobj.fetch(request)
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Client not found')
  })

  it('should handle send that throws', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const send = vi.fn(() => {
      throw new Error('Send failed')
    })
    dobj['core'].wsClients.set('client1', { id: 'client1', send, close: vi.fn() })

    const request = new Request('https://internal/send', {
      method: 'POST',
      body: JSON.stringify({ clientId: 'client1', data: 'test' }),
    })

    const response = await dobj.fetch(request)
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to send')
  })

  it('should handle send to SSE client', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    const send = vi.fn()
    dobj['core'].sseClients.set('sse1', { id: 'sse1', send })

    const request = new Request('https://internal/send', {
      method: 'POST',
      body: JSON.stringify({ clientId: 'sse1', data: 'sse message' }),
    })

    const response = await dobj.fetch(request)
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(send).toHaveBeenCalledWith('sse message')
  })

  it('should report size with connected clients', async () => {
    const { RealtimeDurableObject } = await import('../durable-objects/RealtimeDO')
    const state = {} as DurableObjectState
    const dobj = new RealtimeDurableObject(state)

    dobj['core'].wsClients.set('ws1', { id: 'ws1', send: vi.fn(), close: vi.fn() })
    dobj['core'].sseClients.set('sse1', { id: 'sse1', send: vi.fn() })

    const request = new Request('https://internal/size')
    const response = await dobj.fetch(request)
    const result = await response.json()

    expect(result.wsClients).toBe(1)
    expect(result.sseClients).toBe(1)
  })
})
