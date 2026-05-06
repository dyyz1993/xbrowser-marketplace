import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'
import type { WSClient, WSProtocol, WSStatus } from '@shared/schemas'

function createMockWSClient(): WSClient<WSProtocol> {
  return {
    status: 'connecting' as WSStatus,
    getSocket: vi.fn(() => null),
    call: vi.fn(async () => ({})),
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
    onStatusChange: vi.fn(() => () => {}),
    close: vi.fn(),
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with closed status', () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    expect(result.current.status).toBe('closed')
    expect(result.current.client).toBeNull()
  })

  it('should connect and create client', () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    act(() => {
      result.current.connect()
    })

    expect(route.$ws).toHaveBeenCalled()
  })

  it('should not reconnect if already connected', () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    act(() => result.current.connect())
    act(() => result.current.connect())

    expect(route.$ws).toHaveBeenCalledTimes(1)
  })

  it('should disconnect and close client', () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    act(() => result.current.connect())
    act(() => result.current.disconnect())

    expect(mockClient.close).toHaveBeenCalled()
    expect(result.current.status).toBe('closed')
  })

  it('should throw on call when not connected', async () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    await expect(
      result.current.call('echo' as never, undefined as never)
    ).rejects.toThrow('WebSocket not connected')
  })

  it('should call RPC method when connected', async () => {
    const mockClient = createMockWSClient()
    ;(mockClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({ echoed: true })
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    act(() => result.current.connect())

    const res = await result.current.call('echo' as never, { msg: 'hi' } as never)
    expect(res).toEqual({ echoed: true })
  })

  it('should emit events via client', () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    act(() => result.current.connect())
    act(() => result.current.emit('chat' as never, { text: 'hi' } as never))

    expect(mockClient.emit).toHaveBeenCalledWith('chat', { text: 'hi' })
  })

  it('should register event handler via on()', () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result } = renderHook(() => useWebSocket(route))

    act(() => result.current.connect())

    const handler = vi.fn()
    act(() => result.current.on('notification' as never, handler))

    expect(mockClient.on).toHaveBeenCalled()
  })

  it('should cleanup on unmount', () => {
    const mockClient = createMockWSClient()
    const route = { $ws: vi.fn(() => mockClient) }

    const { result, unmount } = renderHook(() => useWebSocket(route))

    act(() => result.current.connect())
    unmount()

    expect(mockClient.close).toHaveBeenCalled()
  })
})
