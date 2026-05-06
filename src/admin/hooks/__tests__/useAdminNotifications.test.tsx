import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, act } from '@testing-library/react'
import { useAdminNotifications } from '../useAdminNotifications'
import type { AppNotification } from '@shared/schemas'
import { createSSEClientFromRoute } from '@shared/utils/sse-route-helpers'

const mockNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'info',
    title: 'Test Notification',
    message: 'Test message',
    read: false,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'notif-2',
    type: 'error',
    title: 'Error Notification',
    message: 'Error occurred',
    read: true,
    createdAt: '2025-01-01T01:00:00Z',
  },
]

const sseCallbacks: Record<string, (...args: unknown[]) => void> = {}

const mockSSEClient = {
  onStatusChange: vi.fn(),
  on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    sseCallbacks[event] = cb
  }),
  abort: vi.fn(),
  status: 'open' as const,
}

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        notifications: {
          $get: vi.fn(async () => ({
            json: async () => ({ success: true, data: mockNotifications }),
          })),
          'unread-count': {
            $get: vi.fn(async () => ({
              json: async () => ({ success: true, data: { count: 5 } }),
            })),
          },
          stream: {
            $url: vi.fn(() => new URL('http://localhost/api/admin/notifications/stream')),
          },
          ':id': {
            read: {
              $put: vi.fn(async () => ({
                json: async () => ({ success: true }),
              })),
            },
          },
          'read-all': {
            $put: vi.fn(async () => ({
              json: async () => ({ success: true }),
            })),
          },
        },
      },
    },
  },
}))

vi.mock('@shared/utils/sse-route-helpers', () => ({
  createSSEClientFromRoute: vi.fn(() => mockSSEClient),
}))

vi.mock('antd', () => ({
  notification: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

function TestComponent() {
  const {
    status,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useAdminNotifications()

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="notifications-count">{notifications.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="first-notif-read">{notifications[0]?.read?.toString() ?? 'none'}</div>
      <button data-testid="btn-connect" onClick={() => connect()} />
      <button data-testid="btn-disconnect" onClick={() => disconnect()} />
      <button data-testid="btn-mark-read" onClick={() => markAsRead('notif-1')} />
      <button data-testid="btn-mark-all-read" onClick={() => markAllAsRead()} />
      <button data-testid="btn-fetch" onClick={() => fetchNotifications()} />
    </div>
  )
}

describe('useAdminNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSSEClient.onStatusChange.mockClear()
    mockSSEClient.on.mockClear()
    mockSSEClient.abort.mockClear()
    mockSSEClient.status = 'open'
  })

  afterEach(() => {
    cleanup()
  })

  it('should have correct initial state', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('status').textContent).toBe('closed')
    expect(screen.getByTestId('notifications-count').textContent).toBe('0')
    expect(screen.getByTestId('unread-count').textContent).toBe('0')
  })

  it('should connect to SSE and fetch notifications', async () => {
    render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    await act(async () => {
      if (sseCallbacks['connected']) {
        sseCallbacks['connected']()
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('open')
    })

    await waitFor(() => {
      expect(screen.getByTestId('notifications-count').textContent).toBe('2')
      expect(screen.getByTestId('unread-count').textContent).toBe('5')
    })
  })

  it('should not reconnect if already connected', async () => {
    const mockedCreateSSEClientFromRoute = vi.mocked(createSSEClientFromRoute)

    render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    expect(mockedCreateSSEClientFromRoute).toHaveBeenCalledTimes(1)
  })

  it('should disconnect from SSE', async () => {
    render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('open')
    })

    await act(async () => {
      screen.getByTestId('btn-disconnect').click()
    })

    expect(screen.getByTestId('status').textContent).toBe('closed')
    expect(mockSSEClient.abort).toHaveBeenCalled()
  })

  it('should mark a notification as read', async () => {
    render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    await act(async () => {
      if (sseCallbacks['connected']) {
        sseCallbacks['connected']()
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('notifications-count').textContent).toBe('2')
    })

    await act(async () => {
      screen.getByTestId('btn-mark-read').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('first-notif-read').textContent).toBe('true')
    })
  })

  it('should mark all notifications as read', async () => {
    render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    await act(async () => {
      if (sseCallbacks['connected']) {
        sseCallbacks['connected']()
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('notifications-count').textContent).toBe('2')
    })

    await act(async () => {
      screen.getByTestId('btn-mark-all-read').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('unread-count').textContent).toBe('0')
    })
  })

  it('should fetch notifications manually', async () => {
    render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-fetch').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('notifications-count').textContent).toBe('2')
    })
  })

  it('should handle SSE connection error gracefully', async () => {
    const mockedCreateSSEClientFromRoute = vi.mocked(createSSEClientFromRoute)
    mockedCreateSSEClientFromRoute.mockImplementationOnce(() => {
      throw new Error('SSE connection failed')
    })

    render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('closed')
    })
  })

  it('should clean up SSE connection on unmount', async () => {
    const { unmount } = render(<TestComponent />)

    await act(async () => {
      screen.getByTestId('btn-connect').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('open')
    })

    unmount()

    expect(mockSSEClient.abort).toHaveBeenCalled()
  })
})
