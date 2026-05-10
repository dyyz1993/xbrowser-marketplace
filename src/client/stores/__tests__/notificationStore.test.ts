import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotificationStore } from '../notificationStore'
import type { AppNotification } from '@shared/schemas'

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      notifications: {
        $get: vi.fn(),
        $post: vi.fn(),
        ':id': {
          read: { $patch: vi.fn() },
          $delete: vi.fn(),
        },
        'read-all': { $patch: vi.fn() },
        'unread-count': { $get: vi.fn() },
        stream: {},
      },
    },
  },
}))

vi.mock('@shared/utils/sse-route-helpers', () => ({
  createSSEClientFromRoute: vi.fn(),
}))

const { apiClient } = await import('@client/services/apiClient')
const { createSSEClientFromRoute } = await import('@shared/utils/sse-route-helpers')

function mockNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'noti-1',
    type: 'info',
    title: 'Test',
    message: 'Test message',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function createMockSSEClient() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
  let statusListener: ((s: string) => void) | null = null
  return {
    onStatusChange: vi.fn((cb: (s: string) => void) => {
      statusListener = cb
    }),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(cb)
    }),
    onError: vi.fn(),
    abort: vi.fn(),
    _fireStatus: (s: string) => statusListener?.(s),
    _fireEvent: (event: string, data: unknown) => {
      listeners[event]?.forEach(cb => cb(data))
    },
  }
}

describe('notificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      sseConnected: false,
    })
    useNotificationStore.getState().disconnectSSE()
  })

  it('should have correct initial state', () => {
    const state = useNotificationStore.getState()
    expect(state.notifications).toEqual([])
    expect(state.unreadCount).toBe(0)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.sseConnected).toBe(false)
  })

  it('should fetch notifications successfully', async () => {
    const items = [mockNotification(), mockNotification({ id: 'noti-2' })]
    ;(apiClient.api.notifications.$get as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { items } }),
    })

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(2)
    expect(state.loading).toBe(false)
  })

  it('should fetch notifications with unreadOnly=true', async () => {
    const items = [mockNotification()]
    ;(apiClient.api.notifications.$get as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { items } }),
    })

    await useNotificationStore.getState().fetchNotifications(true)

    expect(apiClient.api.notifications.$get).toHaveBeenCalledWith({
      query: { unreadOnly: 'true' },
    })
  })

  it('should handle fetch with success=false', async () => {
    ;(apiClient.api.notifications.$get as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Server error' }),
    })

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.error).toBe('Server error')
    expect(state.loading).toBe(false)
  })

  it('should handle fetch error', async () => {
    ;(apiClient.api.notifications.$get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    )

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.loading).toBe(false)
  })

  it('should handle fetch with non-Error thrown', async () => {
    ;(apiClient.api.notifications.$get as ReturnType<typeof vi.fn>).mockRejectedValue('string error')

    await useNotificationStore.getState().fetchNotifications()

    expect(useNotificationStore.getState().error).toBe('Unknown error')
  })

  it('should create notification and increment unread count', async () => {
    const newNoti = mockNotification()
    ;(apiClient.api.notifications.$post as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: newNoti }),
    })

    await useNotificationStore.getState().createNotification({
      type: 'info',
      title: 'Test',
      message: 'Test message',
    })

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.unreadCount).toBe(1)
  })

  it('should handle create notification failure', async () => {
    ;(apiClient.api.notifications.$post as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Create failed' }),
    })

    await useNotificationStore.getState().createNotification({
      type: 'info',
      title: 'Test',
      message: 'Test',
    })

    expect(useNotificationStore.getState().error).toBe('Create failed')
    expect(useNotificationStore.getState().loading).toBe(false)
  })

  it('should handle create notification exception', async () => {
    ;(apiClient.api.notifications.$post as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Create error')
    )

    await useNotificationStore.getState().createNotification({
      type: 'info',
      title: 'Test',
      message: 'Test',
    })

    expect(useNotificationStore.getState().error).toBe('Create error')
  })

  it('should mark notification as read and decrement unread', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification()],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications[':id'].read.$patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    await useNotificationStore.getState().markAsRead('noti-1')

    const state = useNotificationStore.getState()
    expect(state.notifications[0].read).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('should not decrement unread below 0 on markAsRead', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification()],
      unreadCount: 0,
    })
    ;(apiClient.api.notifications[':id'].read.$patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    await useNotificationStore.getState().markAsRead('noti-1')

    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('should handle markAsRead error gracefully', async () => {
    useNotificationStore.setState({ notifications: [mockNotification()] })
    ;(apiClient.api.notifications[':id'].read.$patch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('fail')
    )

    await useNotificationStore.getState().markAsRead('noti-1')

    expect(useNotificationStore.getState().notifications[0].read).toBe(false)
  })

  it('should mark all as read', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification(), mockNotification({ id: 'noti-2', read: true })],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications['read-all'].$patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    await useNotificationStore.getState().markAllAsRead()

    const state = useNotificationStore.getState()
    expect(state.notifications.every(n => n.read)).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('should handle markAllAsRead error gracefully', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification()],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications['read-all'].$patch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('fail')
    )

    await useNotificationStore.getState().markAllAsRead()

    expect(useNotificationStore.getState().unreadCount).toBe(1)
  })

  it('should delete notification and update unread count if unread', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification()],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications[':id'].$delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    await useNotificationStore.getState().deleteNotification('noti-1')

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(0)
    expect(state.unreadCount).toBe(0)
  })

  it('should delete read notification without changing unread count', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification({ read: true })],
      unreadCount: 0,
    })
    ;(apiClient.api.notifications[':id'].$delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    await useNotificationStore.getState().deleteNotification('noti-1')

    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('should handle delete error gracefully', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification()],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications[':id'].$delete as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('fail')
    )

    await useNotificationStore.getState().deleteNotification('noti-1')

    expect(useNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('should fetch unread count', async () => {
    ;(apiClient.api.notifications['unread-count'].$get as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { count: 5 } }),
    })

    await useNotificationStore.getState().fetchUnreadCount()

    expect(useNotificationStore.getState().unreadCount).toBe(5)
  })

  it('should handle fetchUnreadCount error gracefully', async () => {
    ;(apiClient.api.notifications['unread-count'].$get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('fail')
    )

    await useNotificationStore.getState().fetchUnreadCount()

    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('should connect SSE and set connected on open', async () => {
    const mockSSE = createMockSSEClient()
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockReturnValue(mockSSE)

    await useNotificationStore.getState().connectSSE()
    mockSSE._fireStatus('open')

    expect(useNotificationStore.getState().sseConnected).toBe(true)
  })

  it('should not reconnect SSE if already connected', async () => {
    const mockSSE = createMockSSEClient()
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockReturnValue(mockSSE)

    await useNotificationStore.getState().connectSSE()
    await useNotificationStore.getState().connectSSE()

    expect(createSSEClientFromRoute).toHaveBeenCalledTimes(1)
  })

  it('should receive notification via SSE and add to store', async () => {
    const mockSSE = createMockSSEClient()
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockReturnValue(mockSSE)

    await useNotificationStore.getState().connectSSE()

    const newNoti = mockNotification({ id: 'sse-1' })
    mockSSE._fireEvent('notification', newNoti)

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.unreadCount).toBe(1)
  })

  it('should not duplicate SSE notification if id already exists', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification({ id: 'sse-1' })],
      unreadCount: 1,
    })

    const mockSSE = createMockSSEClient()
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockReturnValue(mockSSE)

    await useNotificationStore.getState().connectSSE()

    mockSSE._fireEvent('notification', mockNotification({ id: 'sse-1' }))

    expect(useNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('should not increment unread for read SSE notification', async () => {
    const mockSSE = createMockSSEClient()
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockReturnValue(mockSSE)

    await useNotificationStore.getState().connectSSE()

    mockSSE._fireEvent('notification', mockNotification({ id: 'sse-2', read: true }))

    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('should set sseConnected to false on closed status', async () => {
    const mockSSE = createMockSSEClient()
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockReturnValue(mockSSE)

    await useNotificationStore.getState().connectSSE()
    mockSSE._fireStatus('open')
    expect(useNotificationStore.getState().sseConnected).toBe(true)

    mockSSE._fireStatus('closed')
    expect(useNotificationStore.getState().sseConnected).toBe(false)
  })

  it('should disconnect SSE and reset connected state', async () => {
    const mockSSE = createMockSSEClient()
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockReturnValue(mockSSE)

    await useNotificationStore.getState().connectSSE()
    mockSSE._fireStatus('open')
    useNotificationStore.getState().disconnectSSE()

    expect(useNotificationStore.getState().sseConnected).toBe(false)
    expect(mockSSE.abort).toHaveBeenCalled()
  })

  it('should handle disconnectSSE when no SSE client', () => {
    useNotificationStore.getState().disconnectSSE()
    expect(useNotificationStore.getState().sseConnected).toBe(false)
  })

  it('should handle connectSSE error gracefully', async () => {
    ;(createSSEClientFromRoute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('SSE connect failed')
    })

    await useNotificationStore.getState().connectSSE()

    expect(useNotificationStore.getState().sseConnected).toBe(false)
  })
})
