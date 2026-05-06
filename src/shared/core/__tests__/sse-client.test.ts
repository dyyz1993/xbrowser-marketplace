import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SSEClientImpl } from '../sse-client'

describe('SSEClientImpl', () => {
  beforeEach(() => {
    let readCount = 0
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            readCount++
            if (readCount === 1) return Promise.resolve({ done: false, value: new TextEncoder().encode('event:ping\ndata:{}\n\n') })
            return new Promise(() => {})
          }),
        }),
      },
    } as unknown as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with connecting status', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
    const client = new SSEClientImpl('http://localhost/sse')
    expect(client.status).toBe('connecting')
    client.abort()
  })

  it('should transition to open on successful connection', async () => {
    const statusChanges: string[] = []
    const client = new SSEClientImpl('http://localhost/sse')
    client.onStatusChange(s => statusChanges.push(s))

    await vi.waitFor(() => {
      expect(client.status).toBe('open')
    })

    expect(statusChanges).toContain('open')
    client.abort()
  })

  it('should call event handlers on message', async () => {
    const eventData = JSON.stringify({ text: 'hello' })
    const stream = `event:notification\ndata:${eventData}\n\n`

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(stream) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    } as unknown as Response)

    const handler = vi.fn()
    const client = new SSEClientImpl('http://localhost/sse')
    client.on('notification', handler)

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledWith({ text: 'hello' })
    })

    client.abort()
  })

  it('should handle connection error and report to error handlers', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'))

    const errorHandler = vi.fn()
    const client = new SSEClientImpl('http://localhost/sse')
    client.onError(errorHandler)

    await vi.waitFor(() => {
      expect(errorHandler).toHaveBeenCalled()
    })

    client.abort()
  })

  it('should abort and set status to closed', async () => {
    const client = new SSEClientImpl('http://localhost/sse')

    await vi.waitFor(() => {
      expect(client.status).toBe('open')
    })

    client.abort()
    expect(client.status).toBe('closed')
  })

  it('should unsubscribe via on() return function', async () => {
    const handler = vi.fn()
    const client = new SSEClientImpl('http://localhost/sse')
    const unsub = client.on('test-event', handler as never)
    unsub()

    const handlers = (client as unknown as { handlers: Map<string, unknown[]> }).handlers
    expect(handlers.get('test-event')).toEqual([])

    client.abort()
  })

  it('should unsubscribe status handler via return function', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
    const handler = vi.fn()
    const client = new SSEClientImpl('http://localhost/sse')
    const unsub = client.onStatusChange(handler)

    unsub()
    client.abort()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should send custom headers', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
    new SSEClientImpl('http://localhost/sse', { Authorization: 'Bearer token' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost/sse',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          Accept: 'text/event-stream',
        }),
      })
    )
  })

  it('should handle non-JSON data as raw string', async () => {
    const stream = `event:message\ndata:plain text\n\n`

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(stream) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    } as unknown as Response)

    const handler = vi.fn()
    const client = new SSEClientImpl('http://localhost/sse')
    client.on('message', handler)

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledWith('plain text')
    })

    client.abort()
  })
})
