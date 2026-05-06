import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3
  readyState = 0
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onopen: ((ev: Event) => void) | null = null
  send = vi.fn()
  close = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  dispatchEvent = vi.fn()
  binaryType: BinaryType = 'blob'
  bufferedAmount = 0
  extensions = ''
  protocol = ''
  url = ''
  constructor(_url: string | URL, _protocols?: string | string[]) {}
}

let mockWsInstance: MockWebSocket

beforeEach(() => {
  mockWsInstance = new MockWebSocket()
  vi.stubGlobal('WebSocket', MockWebSocket)
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function getClient() {
  const mod = await import('../ws-client')
  const client = new mod.WSClientImpl('ws://localhost')
  const ws = client.getSocket() as unknown as MockWebSocket
  return { client, ws }
}

describe('WSClientImpl', () => {
  it('should initialize with connecting status and transition to open', async () => {
    const { client, ws } = await getClient()
    expect(client.status).toBe('connecting')
    ws.onopen!(new Event('open') as never)
    expect(client.status).toBe('open')
  })

  it('should handle RPC call with response', async () => {
    const { client, ws } = await getClient()
    ws.readyState = 1
    ws.onopen!(new Event('open') as never)

    const callPromise = client.call('echo' as never, { message: 'hello' } as never, 5000)

    const sentData = JSON.parse(ws.send.mock.calls[0][0] as string)
    expect(sentData.method).toBe('echo')

    ws.onmessage!({ data: JSON.stringify({ id: sentData.id, result: { echoed: 'hello' } }) } as MessageEvent)

    const result = await callPromise
    expect(result).toEqual({ echoed: 'hello' })
  })

  it('should handle RPC call error response', async () => {
    const { client, ws } = await getClient()
    ws.readyState = 1
    ws.onopen!(new Event('open') as never)

    const callPromise = client.call('fail' as never, undefined as never, 5000)

    const sentData = JSON.parse(ws.send.mock.calls[0][0] as string)
    ws.onmessage!({ data: JSON.stringify({ id: sentData.id, error: 'Something went wrong' }) } as MessageEvent)

    await expect(callPromise).rejects.toThrow('Something went wrong')
  })

  it('should handle RPC timeout', async () => {
    vi.useFakeTimers()
    const { client, ws } = await getClient()
    ws.readyState = 1
    ws.onopen!(new Event('open') as never)

    const callPromise = client.call('slow' as never, undefined as never, 100)

    vi.advanceTimersByTime(150)

    await expect(callPromise).rejects.toThrow('RPC Timeout')
    vi.useRealTimers()
  })

  it('should handle event messages', async () => {
    const { client, ws } = await getClient()
    ws.readyState = 1
    ws.onopen!(new Event('open') as never)

    const handler = vi.fn()
    client.on('notification' as never, handler)

    ws.onmessage!({ data: JSON.stringify({ type: 'notification', payload: { text: 'new msg' } }) } as MessageEvent)

    expect(handler).toHaveBeenCalledWith({ text: 'new msg' })
  })

  it('should emit events by sending JSON', async () => {
    const { client, ws } = await getClient()
    ws.readyState = 1
    ws.onopen!(new Event('open') as never)

    client.emit('chat' as never, { text: 'hi' } as never)

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'chat', payload: { text: 'hi' } })
    )
  })

  it('should report status changes via onStatusChange', async () => {
    const statuses: string[] = []
    const { client, ws } = await getClient()
    client.onStatusChange(s => statuses.push(s))

    ws.onopen!(new Event('open') as never)

    expect(statuses).toContain('open')
  })

  it('should unsubscribe via on() return function', async () => {
    const { client, ws } = await getClient()
    ws.readyState = 1
    ws.onopen!(new Event('open') as never)

    const handler = vi.fn()
    const unsub = client.on('test' as never, handler)
    unsub()

    ws.onmessage!({ data: JSON.stringify({ type: 'test', payload: 'data' }) } as MessageEvent)

    expect(handler).not.toHaveBeenCalled()
  })

  it('should return null socket when WebSocket is not available', async () => {
    vi.unstubAllGlobals()
    delete (globalThis as Record<string, unknown>).WebSocket
    vi.resetModules()
    const mod = await import('../ws-client')
    const client = new mod.WSClientImpl('ws://localhost')
    expect(client.getSocket()).toBeNull()
  })
})
