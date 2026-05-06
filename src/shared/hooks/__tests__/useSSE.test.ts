import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSSE } from '../useSSE'
import type { SSEClient, SSEProtocol } from '@shared/schemas'

function createMockSSEClient(
  status: 'connecting' | 'open' | 'closed' = 'open'
): SSEClient<SSEProtocol> {
  return {
    status,
    on: vi.fn(() => () => {}),
    onStatusChange: vi.fn(cb => {
      cb(status)
      return () => {}
    }),
    onError: vi.fn(() => () => {}),
    abort: vi.fn(),
  }
}

describe('useSSE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with closed status', () => {
    const route = vi.fn().mockResolvedValue(createMockSSEClient())
    const { result } = renderHook(() => useSSE(route))

    expect(result.current.status).toBe('closed')
    expect(result.current.client).toBeNull()
  })

  it('should connect and update status', async () => {
    const mockClient = createMockSSEClient('open')
    const route = vi.fn().mockResolvedValue(mockClient)

    const { result } = renderHook(() => useSSE(route))

    await act(async () => {
      await result.current.connect()
    })

    expect(route).toHaveBeenCalled()
    expect(result.current.status).toBe('open')
  })

  it('should not reconnect if already connected', async () => {
    const route = vi.fn().mockResolvedValue(createMockSSEClient())

    const { result } = renderHook(() => useSSE(route))

    await act(async () => {
      await result.current.connect()
    })

    await act(async () => {
      await result.current.connect()
    })

    expect(route).toHaveBeenCalledTimes(1)
  })

  it('should disconnect and abort client', async () => {
    const mockClient = createMockSSEClient('open')
    const route = vi.fn().mockResolvedValue(mockClient)

    const { result } = renderHook(() => useSSE(route))

    await act(async () => {
      await result.current.connect()
    })

    act(() => {
      result.current.disconnect()
    })

    expect(mockClient.abort).toHaveBeenCalled()
    expect(result.current.status).toBe('closed')
  })

  it('should handle connection failure', async () => {
    const route = vi.fn().mockRejectedValue(new Error('Connection failed'))

    const { result } = renderHook(() => useSSE(route))

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.status).toBe('closed')
  })

  it('should cleanup on unmount', async () => {
    const mockClient = createMockSSEClient('open')
    const route = vi.fn().mockResolvedValue(mockClient)

    const { result, unmount } = renderHook(() => useSSE(route))

    await act(async () => {
      await result.current.connect()
    })

    unmount()

    expect(mockClient.abort).toHaveBeenCalled()
  })

  it('should do nothing on disconnect when not connected', () => {
    const route = vi.fn().mockResolvedValue(createMockSSEClient())

    const { result } = renderHook(() => useSSE(route))

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.status).toBe('closed')
  })
})
